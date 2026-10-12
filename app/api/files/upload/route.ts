/**
 * POST /api/files/upload
 * 파일 업로드 엔드포인트
 * Multipart form-data 지원
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { validateFile, generateS3Key, generateFileUrl, getFileTypeFromMimeType } from '@/lib/file-upload';
import { uploadToS3 } from '@/lib/s3-client';
import { extractMediaMetadata, generateThumbnail } from '@/lib/file-upload';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: '파일이 없습니다' },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { success: false, error: '한 번에 최대 10개의 파일까지만 업로드 가능합니다' },
        { status: 400 }
      );
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        // 파일 검증
        const validation = validateFile({
          name: file.name,
          size: file.size,
          type: file.type,
        });

        if (!validation.isValid) {
          errors.push({
            fileName: file.name,
            error: validation.error,
          });
          continue;
        }

        const fileType = getFileTypeFromMimeType(file.type);
        if (!fileType) {
          errors.push({
            fileName: file.name,
            error: '지원하지 않는 파일 형식입니다',
          });
          continue;
        }

        // 파일 버퍼 읽기
        const buffer = Buffer.from(await file.arrayBuffer());

        // S3 키 생성
        const s3Key = generateS3Key(user.id, fileType, file.name);

        // S3 업로드
        const uploadResult = await uploadToS3({
          bucket: process.env.S3_BUCKET || 'ai-match-uploads',
          key: s3Key,
          body: buffer,
          contentType: file.type,
          metadata: {
            userId: user.id,
            uploadedAt: new Date().toISOString(),
          },
        });

        // 메타데이터 추출
        let metadata: any = {};
        if (fileType === 'image' || fileType === 'video') {
          metadata = await extractMediaMetadata(buffer, file.type, fileType);
        }

        // 썸네일 생성
        let thumbnailUrl: string | null = null;
        if (fileType === 'image' || fileType === 'video') {
          thumbnailUrl = await generateThumbnail(buffer, file.type, s3Key);
        }

        // FileUpload 레코드 생성
        const fileRecord = await db.fileUpload.create({
          data: {
            uploaderId: user.id,
            fileName: s3Key.split('/').pop() || file.name,
            originalName: file.name,
            fileType,
            mimeType: file.type,
            fileSize: buffer.length,
            fileUrl: generateFileUrl(s3Key),
            thumbnailUrl,
            duration: metadata.duration,
            width: metadata.width,
            height: metadata.height,
            s3Key,
            uploadStatus: 'completed',
          },
        });

        uploadedFiles.push({
          id: fileRecord.id,
          fileName: fileRecord.fileName,
          originalName: fileRecord.originalName,
          fileType: fileRecord.fileType,
          mimeType: fileRecord.mimeType,
          fileSize: fileRecord.fileSize,
          fileUrl: fileRecord.fileUrl,
          thumbnailUrl: fileRecord.thumbnailUrl,
          width: fileRecord.width,
          height: fileRecord.height,
          duration: fileRecord.duration,
          uploadedAt: fileRecord.uploadedAt,
        });
      } catch (error) {
        console.error('[Files API] 파일 업로드 중 에러:', error);
        errors.push({
          fileName: file.name,
          error: '파일 업로드 중 오류가 발생했습니다',
        });
      }
    }

    return NextResponse.json(
      {
        success: uploadedFiles.length > 0,
        data: {
          uploaded: uploadedFiles,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `${uploadedFiles.length}개 파일이 업로드되었습니다`,
      },
      { status: uploadedFiles.length > 0 ? 200 : 400 }
    );
  } catch (error) {
    console.error('[Files API] POST 에러:', error);
    return NextResponse.json(
      { success: false, error: '파일 업로드에 실패했습니다' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/files/upload
 * CORS 프리플라이트 요청 처리
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
