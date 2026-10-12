import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { updateReportStatus, type ReportStatus } from '@/lib/blocking-reporting-system';

/**
 * PUT /api/reports/[id]
 * Update report status (admin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(req);
    const { status, adminNotes } = await req.json();

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const report = await updateReportStatus(params.id, status as ReportStatus, adminNotes);

    return NextResponse.json({
      success: true,
      data: report,
      message: 'Report updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update report';
    const status = message.includes('unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
