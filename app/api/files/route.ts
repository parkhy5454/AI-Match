/**
 * 파일 관리 API
 * GET: 사용자의 업로드된 파일 목록
 * DELETE: 파일 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteFromS3 } from '@/lib/s3-client';

/**
 * GET /api/files
 * 사용자가 업로드한 파일 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const searchParams = new URL(req.url).searchParams;
    const fileType = searchParams.get('fileType'); // image, video, etc
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '20');

    const where: any = {
      uploaderId: user.id,
    };

    if (fileType) {
      where.fileType = fileType;
    }

    const [files, total] = await Promise.all([
      db.fileUpload.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip,
        take,
      }),
      db.fileUpload.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: files,
      pagination: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    });
  } catch (error) {
    console.error('[Files API] GET 에러:', error);
    return NextResponse.json(
      { success: false, error: '파일 목록 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files?id=fileId
 * 파일 삭제
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const fileId = new URL(req.url).searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: '파일 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 파일 확인 및 권한 검사
    const file = await db.fileUpload.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (file.uploaderId !== user.id) {
      return NextResponse.json(
        { success: false, error: '삭제 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 메시지 첨부파일에서 참조 확인
    const attachmentCount = await db.messageAttachment.count({
      where: { fileUploadId: fileId },
    });

    if (attachmentCount > 0) {
      return NextResponse.json(
        { success: false, error: '메시지에서 사용 중인 파일은 삭제할 수 없습니다' },
        { status: 400 }
      );
    }

    // S3에서 삭제
    const s3Deleted = await deleteFromS3(
      process.env.S3_BUCKET || 'ai-match-uploads',
      file.s3Key
    );

    // 썸네일도 삭제
    if (file.thumbnailUrl) {
      const thumbnailKey = file.s3Key.replace(/\.[^.]+$/, '-thumbnail.jpg');
      await deleteFromS3(
        process.env.S3_BUCKET || 'ai-match-uploads',
        thumbnailKey
      );
    }

    // 데이터베이스에서 삭제
    await db.fileUpload.delete({
      where: { id: fileId },
    });

    return NextResponse.json({
      success: true,
      message: '파일이 삭제되었습니다',
    });
  } catch (error) {
    console.error('[Files API] DELETE 에러:', error);
    return NextResponse.json(
      { success: false, error: '파일 삭제에 실패했습니다' },
      { status: 500 }
    );
  }
}
