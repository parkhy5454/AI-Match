/**
 * POST /api/files/presigned-url
 * S3 사전 서명된 URL 생성 엔드포인트
 * 클라이언트가 직접 S3에 파일을 업로드할 수 있도록 함
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { validateFile, generateS3Key, getFileTypeFromMimeType } from '@/lib/file-upload';
import { generatePresignedUploadUrl } from '@/lib/s3-client';

interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  count?: number; // 여러 파일의 경우
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body: PresignedUrlRequest = await req.json();

    const { fileName, fileType, fileSize, count = 1 } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { success: false, error: '파일 이름과 타입이 필요합니다' },
        { status: 400 }
      );
    }

    // 파일 검증
    const validation = validateFile({
      name: fileName,
      size: fileSize,
      type: fileType,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const fileTypeCategory = getFileTypeFromMimeType(fileType);
    if (!fileTypeCategory) {
      return NextResponse.json(
        { success: false, error: '지원하지 않는 파일 형식입니다' },
        { status: 400 }
      );
    }

    // 여러 파일의 경우
    if (count > 1 && count <= 10) {
      const urls = [];
      for (let i = 0; i < count; i++) {
        const s3Key = generateS3Key(user.id, fileTypeCategory, `${i}-${fileName}`);
        const url = await generatePresignedUploadUrl(
          process.env.S3_BUCKET || 'ai-match-uploads',
          s3Key,
          fileType,
          3600 // 1시간
        );
        urls.push({
          s3Key,
          uploadUrl: url,
          fileIndex: i,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          uploadUrls: urls,
          bucket: process.env.S3_BUCKET || 'ai-match-uploads',
          expiresIn: 3600,
        },
      });
    }

    // 단일 파일
    const s3Key = generateS3Key(user.id, fileTypeCategory, fileName);
    const uploadUrl = await generatePresignedUploadUrl(
      process.env.S3_BUCKET || 'ai-match-uploads',
      s3Key,
      fileType,
      3600 // 1시간
    );

    return NextResponse.json({
      success: true,
      data: {
        s3Key,
        uploadUrl,
        bucket: process.env.S3_BUCKET || 'ai-match-uploads',
        expiresIn: 3600,
        region: process.env.S3_REGION || 'us-east-1',
      },
    });
  } catch (error) {
    console.error('[Files API] 사전 서명된 URL 생성 에러:', error);
    return NextResponse.json(
      { success: false, error: '사전 서명된 URL 생성에 실패했습니다' },
      { status: 500 }
    );
  }
}
