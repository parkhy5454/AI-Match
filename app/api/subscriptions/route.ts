import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getUserSubscription, getPaymentHistory } from '@/lib/payment-system';

/**
 * GET /api/subscriptions
 * Get user's current subscription and payment history
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const { subscription, features } = await getUserSubscription(userId);
    const payments = await getPaymentHistory(userId, limit, offset);

    return NextResponse.json({
      subscription,
      features,
      payments,
      paymentCount: payments.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
