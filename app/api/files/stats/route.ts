/**
 * GET /api/files/stats
 * 파일 저장소 통계 및 쿼터 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatFileSize } from '@/lib/file-upload';

const STORAGE_QUOTA = {
  free: 5 * 1024 * 1024 * 1024, // 5GB
  premium: 50 * 1024 * 1024 * 1024, // 50GB
  unlimited: Number.MAX_SAFE_INTEGER, // Unlimited
};

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    // 사용자의 구독 정보 확인
    const subscription = await db.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'active',
        endDate: { gt: new Date() },
      },
      include: { plan: true },
    });

    // 저장소 쿼터 결정
    let storageQuota = STORAGE_QUOTA.free;
    let quotaType = 'free';

    if (subscription) {
      const planName = subscription.plan.name.toLowerCase();
      if (planName.includes('premium')) {
        storageQuota = STORAGE_QUOTA.premium;
        quotaType = 'premium';
      } else if (planName.includes('unlimited')) {
        storageQuota = STORAGE_QUOTA.unlimited;
        quotaType = 'unlimited';
      }
    }

    // 파일 통계
    const fileStats = await db.fileUpload.aggregate({
      where: { uploaderId: user.id },
      _sum: {
        fileSize: true,
      },
      _count: true,
    });

    const totalUsed = fileStats._sum.fileSize || 0;
    const fileCount = fileStats._count;

    // 파일 타입별 통계
    const fileTypeStats = await db.fileUpload.groupBy({
      by: ['fileType'],
      where: { uploaderId: user.id },
      _sum: {
        fileSize: true,
      },
      _count: true,
    });

    const typeBreakdown = fileTypeStats.reduce((acc, stat) => {
      acc[stat.fileType] = {
        count: stat._count,
        size: stat._sum.fileSize || 0,
        formattedSize: formatFileSize(stat._sum.fileSize || 0),
      };
      return acc;
    }, {} as Record<string, { count: number; size: number; formattedSize: string }>);

    // 최근 업로드 파일
    const recentFiles = await db.fileUpload.findMany({
      where: { uploaderId: user.id },
      orderBy: { uploadedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        uploadedAt: true,
      },
    });

    // 계산
    const remaining = Math.max(0, storageQuota - totalUsed);
    const percentUsed = storageQuota === Number.MAX_SAFE_INTEGER ? 0 : (totalUsed / storageQuota) * 100;
    const isNearLimit = percentUsed > 80;

    return NextResponse.json({
      success: true,
      data: {
        storage: {
          quota: storageQuota,
          quotaType,
          used: totalUsed,
          remaining,
          percentUsed: Math.round(percentUsed * 100) / 100,
          isNearLimit,
          formattedQuota: formatFileSize(storageQuota),
          formattedUsed: formatFileSize(totalUsed),
          formattedRemaining: formatFileSize(remaining),
        },
        files: {
          totalCount: fileCount,
          typeBreakdown,
        },
        recentFiles: recentFiles.map(f => ({
          ...f,
          formattedSize: formatFileSize(f.fileSize),
        })),
      },
    });
  } catch (error) {
    console.error('[Files API] 통계 조회 에러:', error);
    return NextResponse.json(
      { success: false, error: '통계 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}
