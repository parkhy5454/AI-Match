import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { getUserDetails, logAdminAction } from '@/lib/admin-system';
import { banUser, suspendUser, unsuspendUser } from '@/lib/blocking-reporting-system';

/**
 * GET /api/admin/users/[id]
 * Get user details (admin only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(req);

    const user = await getUserDetails(params.id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get user';
    const status = message.includes('unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/users/[id]
 * Update user moderation status (admin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminId = await verifyAdminAuth(req);
    const { action, reason, durationDays } = await req.json();

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const validActions = ['suspend', 'unsuspend', 'ban'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    if (action === 'suspend') {
      if (!reason) {
        return NextResponse.json(
          { error: 'reason is required for suspension' },
          { status: 400 }
        );
      }
      await suspendUser(params.id, reason, durationDays || 7);
      await logAdminAction(adminId.id, 'SUSPEND_USER', {
        targetUserId: params.id,
        reason,
        durationDays: durationDays || 7,
      });
    } else if (action === 'unsuspend') {
      await unsuspendUser(params.id);
      await logAdminAction(adminId.id, 'UNSUSPEND_USER', {
        targetUserId: params.id,
      });
    } else if (action === 'ban') {
      if (!reason) {
        return NextResponse.json(
          { error: 'reason is required for ban' },
          { status: 400 }
        );
      }
      await banUser(params.id, reason);
      await logAdminAction(adminId.id, 'BAN_USER', {
        targetUserId: params.id,
        reason,
      });
    }

    return NextResponse.json({
      success: true,
      message: `User ${action} action completed successfully`,
      action,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    const status = message.includes('unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
