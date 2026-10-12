import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { createCheckoutSession, SubscriptionPlan, BillingPeriod } from '@/lib/payment-system';

/**
 * POST /api/subscriptions/checkout
 * Create Stripe checkout session
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, billingPeriod } = await request.json();

    if (!plan || !billingPeriod) {
      return NextResponse.json(
        { error: 'plan and billingPeriod are required' },
        { status: 400 }
      );
    }

    if (!['premium', 'vip'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return NextResponse.json(
        { error: 'Invalid billing period' },
        { status: 400 }
      );
    }

    const { sessionId, sessionUrl } = await createCheckoutSession(
      userId,
      plan as SubscriptionPlan,
      billingPeriod as BillingPeriod
    );

    return NextResponse.json({
      sessionId,
      sessionUrl,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
