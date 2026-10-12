import { NextResponse, NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { detectFaceInImage, savePhotoVerification } from '@/lib/photoVerification';

/**
 * 사진 검증 (얼굴 인식)
 * POST /api/photo/verify
 * 사진(Base64)을 받아 얼굴이 있는지 검증
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '요청 형식이 올바르지 않습니다' },
        { status: 400 }
      );
    }

    const { photoBase64, mediaType = 'image/jpeg' } = body;

    if (!photoBase64) {
      return NextResponse.json(
        { success: false, error: '사진이 필요합니다' },
        { status: 400 }
      );
    }

    // Base64 형식 검증
    if (typeof photoBase64 !== 'string' || !photoBase64.startsWith('data:image')) {
      return NextResponse.json(
        { success: false, error: '유효한 이미지 형식이 아닙니다' },
        { status: 400 }
      );
    }

    // Base64 추출 (data:image/jpeg;base64, 부분 제거)
    const base64Data = photoBase64.split(',')[1];
    if (!base64Data) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 이미지 데이터입니다' },
        { status: 400 }
      );
    }

    console.log('[Photo Verify] 검증 시작:', user.id);

    // 얼굴 감지
    const faceDetection = await detectFaceInImage(
      base64Data,
      mediaType as 'image/jpeg' | 'image/png'
    );

    if (faceDetection.error) {
      return NextResponse.json(
        { success: false, error: faceDetection.error },
        { status: 500 }
      );
    }

    if (!faceDetection.hasFace) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: '명확한 얼굴이 보이지 않습니다. 정면 사진을 다시 업로드해주세요.',
        },
        { status: 400 }
      );
    }

    if (faceDetection.confidence < 70) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: `얼굴 인식도가 낮습니다 (${faceDetection.confidence}%). 더 명확한 사진을 올려주세요.`,
        },
        { status: 400 }
      );
    }

    // 사진 검증 저장 (실제로는 URL 저장이 필요하지만, 여기서는 시뮬레이션)
    const photoUrl = `photo-${user.id}-${Date.now()}`; // 실제로는 Cloud Storage URL
    const result = await savePhotoVerification(user.id, photoUrl, faceDetection);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log('[Photo Verify] 검증 완료:', user.id, 'verified:', result.verified);

    return NextResponse.json({
      success: true,
      verified: result.verified,
      message: result.verified
        ? '사진 검증 성공! 프로필이 검증되었습니다.'
        : '사진 검증 실패',
      confidence: faceDetection.confidence,
    });
  } catch (error) {
    console.error('[Photo Verify API] 에러:', error);
    return NextResponse.json(
      { success: false, error: '사진 검증 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
