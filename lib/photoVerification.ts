import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';

/**
 * 사진 얼굴 검증 유틸리티
 * Claude Vision API를 사용해 얼굴 인식
 */

const client = new Anthropic();

interface FaceDetectionResult {
  hasFace: boolean;
  confidence: number;
  landmarks?: {
    eyes: number;
    nose: number;
    mouth: number;
  };
  error?: string;
}

/**
 * Base64 이미지에서 얼굴 감지
 */
export async function detectFaceInImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
): Promise<FaceDetectionResult> {
  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `이 이미지를 분석하여 다음을 판단해주세요:
1. 명확한 얼굴이 보이는가? (정면 또는 약간 기울어진 각도)
2. 얼굴의 명확도/품질은? (0-100)
3. 주요 얼굴 특징(눈, 코, 입)이 보이는가?

응답 형식 (JSON):
{
  "hasFace": boolean,
  "confidence": number (0-100),
  "landmarks": {
    "eyes": number (0-100),
    "nose": number (0-100),
    "mouth": number (0-100)
  },
  "description": string
}`,
            },
          ],
        },
      ],
    });

    // 응답 파싱
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // JSON 추출
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      hasFace: result.hasFace,
      confidence: result.confidence,
      landmarks: result.landmarks,
    };
  } catch (error) {
    console.error('[Face Detection] 에러:', error);
    return {
      hasFace: false,
      confidence: 0,
      error: '얼굴 검증 중 오류가 발생했습니다',
    };
  }
}

/**
 * 사진 검증 저장
 */
export async function savePhotoVerification(
  userId: string,
  photoUrl: string,
  faceData: FaceDetectionResult
): Promise<{ success: boolean; verified: boolean; error?: string }> {
  try {
    const verification = await prisma.photoVerification.create({
      data: {
        userId,
        photoUrl,
        verified: faceData.hasFace && faceData.confidence >= 70,
        faceData: JSON.stringify(faceData.landmarks),
        error: faceData.error,
      },
    });

    // 검증 성공 시 사용자의 photoVerified 업데이트
    if (verification.verified) {
      await prisma.user.update({
        where: { id: userId },
        data: { photoVerified: true },
      });
    }

    return {
      success: true,
      verified: verification.verified,
    };
  } catch (error) {
    console.error('[Photo Verification Save] 에러:', error);
    return {
      success: false,
      verified: false,
      error: '사진 검증 저장 중 오류가 발생했습니다',
    };
  }
}

/**
 * 사용자의 검증된 사진 있는지 확인
 */
export async function hasVerifiedPhoto(userId: string): Promise<boolean> {
  try {
    const verification = await prisma.photoVerification.findFirst({
      where: {
        userId,
        verified: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return !!verification;
  } catch (error) {
    console.error('[Has Verified Photo] 에러:', error);
    return false;
  }
}

/**
 * 사용자의 사진 검증 이력
 */
export async function getUserPhotoVerifications(userId: string) {
  try {
    return await prisma.photoVerification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        verified: true,
        createdAt: true,
      },
      take: 10,
    });
  } catch (error) {
    console.error('[Get Photo Verifications] 에러:', error);
    return [];
  }
}
