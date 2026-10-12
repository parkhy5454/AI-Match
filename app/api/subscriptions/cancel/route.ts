import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { cancelSubscription } from '@/lib/payment-system';

/**
 * POST /api/subscriptions/cancel
 * Cancel user's subscription
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await cancelSubscription(userId);

    return NextResponse.json({
      message: 'Subscription cancelled',
      subscription,
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
