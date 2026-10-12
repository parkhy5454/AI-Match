/**
 * 메시지 첨부파일 API
 * POST: 메시지에 파일 첨부
 * GET: 메시지의 첨부파일 조회
 * DELETE: 첨부파일 제거
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/messages/attachments
 * 메시지에 파일 첨부
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const { messageId, fileUploadIds } = body;

    if (!messageId || !fileUploadIds || !Array.isArray(fileUploadIds) || fileUploadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '메시지 ID와 파일 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 메시지 확인 및 권한 검사
    const message = await db.message.findUnique({
      where: { id: messageId },
      include: { room: { include: { members: true } } },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: '메시지를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 발신자만 첨부파일을 추가할 수 있음
    if (message.senderId !== user.id) {
      return NextResponse.json(
        { success: false, error: '수정 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 파일 확인
    const files = await db.fileUpload.findMany({
      where: {
        id: { in: fileUploadIds },
        uploaderId: user.id, // 자신이 업로드한 파일만
      },
    });

    if (files.length !== fileUploadIds.length) {
      return NextResponse.json(
        { success: false, error: '일부 파일을 찾을 수 없거나 권한이 없습니다' },
        { status: 400 }
      );
    }

    // 중복 제거
    const existingAttachments = await db.messageAttachment.findMany({
      where: { messageId },
      select: { fileUploadId: true },
    });

    const existingIds = new Set(existingAttachments.map(a => a.fileUploadId));
    const newFileIds = fileUploadIds.filter(id => !existingIds.has(id));

    if (newFileIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: '이미 첨부된 파일들입니다',
      });
    }

    // 첨부파일 생성
    const attachments = await Promise.all(
      newFileIds.map((fileUploadId, index) =>
        db.messageAttachment.create({
          data: {
            messageId,
            fileUploadId,
            displayOrder: existingAttachments.length + index,
          },
          include: {
            file: true,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: attachments,
      message: `${attachments.length}개의 파일이 첨부되었습니다`,
    });
  } catch (error) {
    console.error('[Messages API] 첨부파일 추가 에러:', error);
    return NextResponse.json(
      { success: false, error: '첨부파일 추가에 실패했습니다' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messages/attachments?messageId=id
 * 메시지의 첨부파일 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const messageId = new URL(req.url).searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: '메시지 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 메시지 확인 및 권한 검사
    const message = await db.message.findUnique({
      where: { id: messageId },
      include: { room: { include: { members: true } } },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: '메시지를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 채팅방 멤버인지 확인
    const isMember = message.room?.members.some(m => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json(
        { success: false, error: '접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 첨부파일 조회
    const attachments = await db.messageAttachment.findMany({
      where: { messageId },
      include: { file: true },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    console.error('[Messages API] 첨부파일 조회 에러:', error);
    return NextResponse.json(
      { success: false, error: '첨부파일 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messages/attachments?attachmentId=id
 * 첨부파일 제거
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const attachmentId = new URL(req.url).searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json(
        { success: false, error: '첨부파일 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 첨부파일 확인
    const attachment = await db.messageAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        file: true,
        message: true,
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: '첨부파일을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 메시지 발신자만 제거 가능
    if (attachment.message.senderId !== user.id) {
      return NextResponse.json(
        { success: false, error: '삭제 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 첨부파일 삭제
    await db.messageAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({
      success: true,
      message: '첨부파일이 제거되었습니다',
    });
  } catch (error) {
    console.error('[Messages API] 첨부파일 삭제 에러:', error);
    return NextResponse.json(
      { success: false, error: '첨부파일 삭제에 실패했습니다' },
      { status: 500 }
    );
  }
}
