import { prisma } from '@/lib/db';
import { Subscription, Payment, Prisma } from '@prisma/client';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export type SubscriptionPlan = 'free' | 'premium' | 'vip';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type BillingPeriod = 'monthly' | 'yearly';

export interface SubscriptionFeatures {
  maxLikes: number;
  maxMessages: number;
  profileBoosts: number;
  adFree: boolean;
  priorityMatch: boolean;
  advancedFilters: boolean;
  messageHistory: number; // Days
}

export const PLAN_FEATURES: Record<SubscriptionPlan, SubscriptionFeatures> = {
  free: {
    maxLikes: 10,
    maxMessages: 5,
    profileBoosts: 0,
    adFree: false,
    priorityMatch: false,
    advancedFilters: false,
    messageHistory: 30,
  },
  premium: {
    maxLikes: -1, // Unlimited
    maxMessages: -1,
    profileBoosts: 1,
    adFree: true,
    priorityMatch: true,
    advancedFilters: true,
    messageHistory: 365,
  },
  vip: {
    maxLikes: -1,
    maxMessages: -1,
    profileBoosts: 5,
    adFree: true,
    priorityMatch: true,
    advancedFilters: true,
    messageHistory: -1, // Unlimited
  },
};

export const PLAN_PRICES: Record<SubscriptionPlan, Record<BillingPeriod, number>> = {
  free: {
    monthly: 0,
    yearly: 0,
  },
  premium: {
    monthly: 999, // $9.99
    yearly: 9999, // $99.99
  },
  vip: {
    monthly: 2999, // $29.99
    yearly: 29999, // $299.99
  },
};

/**
 * Get or create subscription for user
 */
export async function getOrCreateSubscription(userId: string): Promise<Subscription> {
  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: 'free',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
  }

  return subscription;
}

/**
 * Get user's subscription with features
 */
export async function getUserSubscription(userId: string): Promise<{
  subscription: Subscription;
  features: SubscriptionFeatures;
}> {
  const subscription = await getOrCreateSubscription(userId);
  const features = PLAN_FEATURES[subscription.plan as SubscriptionPlan];

  return { subscription, features };
}

/**
 * Check if user has access to feature
 */
export async function hasFeatureAccess(userId: string, feature: keyof SubscriptionFeatures): Promise<boolean> {
  const { subscription, features } = await getUserSubscription(userId);

  if (subscription.status !== 'active') {
    return feature === 'adFree' ? false : PLAN_FEATURES.free[feature];
  }

  const featureValue = features[feature];

  // For boolean features
  if (typeof featureValue === 'boolean') {
    return featureValue;
  }

  // For numeric features, -1 means unlimited, 0 means disabled
  return featureValue !== 0;
}

/**
 * Create checkout session (Stripe)
 */
export async function createCheckoutSession(
  userId: string,
  plan: SubscriptionPlan,
  billingPeriod: BillingPeriod
): Promise<{ sessionId: string; sessionUrl: string }> {
  if (plan === 'free') {
    throw new Error('Cannot checkout for free plan');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const priceInCents = PLAN_PRICES[plan][billingPeriod];
  const recurringInterval = billingPeriod === 'monthly' ? 'month' : 'year';

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
              description: `${billingPeriod === 'monthly' ? 'Monthly' : 'Annual'} subscription`,
            },
            unit_amount: priceInCents,
            recurring: {
              interval: recurringInterval,
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/cancel`,
      metadata: {
        userId,
        plan,
        billingPeriod,
      },
    });

    return {
      sessionId: session.id,
      sessionUrl: session.url || '',
    };
  } catch (error) {
    console.error('Stripe error:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Handle successful payment webhook
 */
export async function handlePaymentSuccess(
  sessionId: string,
  plan: SubscriptionPlan,
  billingPeriod: BillingPeriod,
  userId: string
): Promise<Subscription> {
  const priceInCents = PLAN_PRICES[plan][billingPeriod];

  // Create payment record
  await prisma.payment.create({
    data: {
      userId,
      stripeSessionId: sessionId,
      plan,
      billingPeriod,
      amount: priceInCents,
      status: 'succeeded',
      currency: 'usd',
    },
  });

  // Update subscription
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingPeriod === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      billingPeriod,
    },
    update: {
      plan,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      billingPeriod,
    },
  });

  return subscription;
}

/**
 * Create payment record
 */
export async function createPayment(data: {
  userId: string;
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
  amount: number;
  status: PaymentStatus;
  stripeSessionId?: string;
}): Promise<Payment> {
  return prisma.payment.create({
    data: {
      userId: data.userId,
      plan: data.plan,
      billingPeriod: data.billingPeriod,
      amount: data.amount,
      status: data.status,
      currency: 'usd',
      stripeSessionId: data.stripeSessionId,
    },
  });
}

/**
 * Get user's payment history
 */
export async function getPaymentHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Payment[]> {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string): Promise<Subscription> {
  return prisma.subscription.update({
    where: { userId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
  });
}

/**
 * Upgrade subscription plan
 */
export async function upgradePlan(
  userId: string,
  newPlan: SubscriptionPlan,
  billingPeriod: BillingPeriod
): Promise<{ sessionId: string; sessionUrl: string }> {
  const subscription = await getOrCreateSubscription(userId);

  if (subscription.plan === newPlan) {
    throw new Error('Already subscribed to this plan');
  }

  // Create new checkout session
  return createCheckoutSession(userId, newPlan, billingPeriod);
}

/**
 * Check if subscription is active
 */
export async function isSubscriptionActive(userId: string): Promise<boolean> {
  const subscription = await getOrCreateSubscription(userId);
  
  return (
    subscription.status === 'active' &&
    subscription.currentPeriodEnd > new Date()
  );
}

/**
 * Check user's like limit
 */
export async function checkLikeLimit(userId: string, currentLikes: number): Promise<boolean> {
  const { features } = await getUserSubscription(userId);

  if (features.maxLikes === -1) return true; // Unlimited
  return currentLikes < features.maxLikes;
}

/**
 * Check user's message limit
 */
export async function checkMessageLimit(userId: string, currentMessages: number): Promise<boolean> {
  const { features } = await getUserSubscription(userId);

  if (features.maxMessages === -1) return true; // Unlimited
  return currentMessages < features.maxMessages;
}

/**
 * Get available profile boosts
 */
export async function getProfileBoosts(userId: string): Promise<number> {
  const { features } = await getUserSubscription(userId);
  
  // Get used boosts this period
  const subscription = await getOrCreateSubscription(userId);
  const usedBoosts = await prisma.profileBoost.count({
    where: {
      userId,
      createdAt: {
        gte: subscription.currentPeriodStart,
        lte: subscription.currentPeriodEnd,
      },
    },
  });

  return Math.max(0, features.profileBoosts - usedBoosts);
}

/**
 * Apply profile boost
 */
export async function applyProfileBoost(userId: string): Promise<boolean> {
  const available = await getProfileBoosts(userId);

  if (available <= 0) {
    throw new Error('No profile boosts available');
  }

  await prisma.profileBoost.create({
    data: {
      userId,
      boostDuration: 24, // 24 hours
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return true;
}

/**
 * Get subscription statistics
 */
export async function getSubscriptionStats(): Promise<{
  totalUsers: number;
  freeUsers: number;
  premiumUsers: number;
  vipUsers: number;
  monthlyRecurring: number;
  yearlyRecurring: number;
  totalRevenue: number;
}> {
  const [totalUsers, planCounts, paymentStats] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.groupBy({
      by: ['plan'],
      _count: true,
    }),
    prisma.payment.groupBy({
      by: ['billingPeriod', 'status'],
      _sum: { amount: true },
      where: { status: 'succeeded' },
    }),
  ]);

  const freeCount = planCounts.find((p) => p.plan === 'free')?._count || 0;
  const premiumCount = planCounts.find((p) => p.plan === 'premium')?._count || 0;
  const vipCount = planCounts.find((p) => p.plan === 'vip')?._count || 0;

  const monthlyRevenue = paymentStats
    .filter((p) => p.billingPeriod === 'monthly' && p.status === 'succeeded')
    .reduce((sum, p) => sum + (p._sum.amount || 0), 0);

  const yearlyRevenue = paymentStats
    .filter((p) => p.billingPeriod === 'yearly' && p.status === 'succeeded')
    .reduce((sum, p) => sum + (p._sum.amount || 0), 0);

  return {
    totalUsers,
    freeUsers: freeCount,
    premiumUsers: premiumCount,
    vipUsers: vipCount,
    monthlyRecurring: monthlyRevenue,
    yearlyRecurring: yearlyRevenue,
    totalRevenue: monthlyRevenue + yearlyRevenue,
  };
}

/**
 * Generate invoice
 */
export async function generateInvoice(paymentId: string): Promise<{
  invoiceNumber: string;
  invoiceUrl: string;
}> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  const invoiceNumber = `INV-${payment.createdAt.getFullYear()}-${String(payment.id).substring(0, 8).toUpperCase()}`;
  
  // In production, generate actual PDF invoice
  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${paymentId}`;

  return {
    invoiceNumber,
    invoiceUrl,
  };
}

/**
 * Handle subscription renewal
 */
export async function handleSubscriptionRenewal(userId: string): Promise<Subscription | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || subscription.status !== 'active') {
    return null;
  }

  // Create payment record for renewal
  const plan = subscription.plan as SubscriptionPlan;
  const billingPeriod = subscription.billingPeriod as BillingPeriod;
  const amount = PLAN_PRICES[plan][billingPeriod];

  await createPayment({
    userId,
    plan,
    billingPeriod,
    amount,
    status: 'succeeded',
  });

  // Update period dates
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingPeriod === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  return prisma.subscription.update({
    where: { userId },
    data: {
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });
}

/**
 * Get subscription by Stripe customer ID
 */
export async function getSubscriptionByStripeId(stripeCustomerId: string): Promise<Subscription | null> {
  return prisma.subscription.findFirst({
    where: { stripeCustomerId },
  });
}

/**
 * Update Stripe customer ID
 */
export async function updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<Subscription> {
  return prisma.subscription.update({
    where: { userId },
    data: { stripeCustomerId },
  });
}

/**
 * Alias exports and additional payment functions for API compatibility
 */

export async function getPayment(paymentId: string): Promise<Payment | null> {
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });
}

export async function confirmPayment(paymentId: string): Promise<Payment | null> {
  const payment = await getPayment(paymentId);
  if (!payment) return null;

  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'succeeded' },
    include: { user: true },
  });
}

export async function createPaymentIntent(
  userId: string,
  amount: number,
  plan: SubscriptionPlan
): Promise<{ clientSecret: string; intentId: string }> {
  try {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: { userId, plan },
    });

    return {
      clientSecret: intent.client_secret || '',
      intentId: intent.id,
    };
  } catch (error) {
    console.error('Failed to create payment intent:', error);
    throw new Error('Payment intent creation failed');
  }
}

export async function refundPayment(paymentId: string): Promise<Payment | null> {
  const payment = await getPayment(paymentId);
  if (!payment) return null;

  // Refund via Stripe if needed
  if (payment.stripeSessionId) {
    try {
      // Refund logic here
      console.log(`Refunding payment: ${paymentId}`);
    } catch (error) {
      console.error('Stripe refund failed:', error);
    }
  }

  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'refunded' },
    include: { user: true },
  });
}

export async function getReceiptUrl(paymentId: string): Promise<string> {
  const { invoiceUrl } = await generateInvoice(paymentId);
  return invoiceUrl;
}

export const getPaymentStatistics = getSubscriptionStats;

export async function handlePaymentWebhook(event: any): Promise<void> {
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { userId, plan, billingPeriod } = session.metadata;

      if (userId && plan && billingPeriod) {
        await handlePaymentSuccess(session.id, plan, billingPeriod, userId);
        console.log(`Payment webhook processed for user: ${userId}`);
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
}
