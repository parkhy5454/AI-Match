import {
  getOrCreateSubscription,
  getUserSubscription,
  hasFeatureAccess,
  checkLikeLimit,
  checkMessageLimit,
  getProfileBoosts,
  applyProfileBoost,
  cancelSubscription,
  createPayment,
  getPaymentHistory,
  isSubscriptionActive,
  getSubscriptionStats,
  handleSubscriptionRenewal,
  PLAN_FEATURES,
  PLAN_PRICES,
} from '@/lib/payment-system';
import { prisma } from '@/lib/db';

const userId1 = 'test-user-1';
const userId2 = 'test-user-2';
const userId3 = 'test-user-3';

describe('Payment System', () => {
  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: userId1, email: 'user1@test.com', password: 'hashed' },
        { id: userId2, email: 'user2@test.com', password: 'hashed' },
        { id: userId3, email: 'user3@test.com', password: 'hashed' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({});
    await prisma.profileBoost.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.user.deleteMany({
      where: { id: { in: [userId1, userId2, userId3] } },
    });
  });

  describe('getOrCreateSubscription', () => {
    test('should create default free subscription', async () => {
      const subscription = await getOrCreateSubscription(userId1);
      expect(subscription.userId).toBe(userId1);
      expect(subscription.plan).toBe('free');
      expect(subscription.status).toBe('active');
    });

    test('should return existing subscription', async () => {
      const sub1 = await getOrCreateSubscription(userId2);
      const sub2 = await getOrCreateSubscription(userId2);
      expect(sub1.id).toBe(sub2.id);
    });
  });

  describe('getUserSubscription', () => {
    test('should return subscription with features', async () => {
      const { subscription, features } = await getUserSubscription(userId1);
      expect(subscription).toBeDefined();
      expect(features).toBeDefined();
      expect(features.maxLikes).toBe(PLAN_FEATURES.free.maxLikes);
    });

    test('should return correct features for free plan', async () => {
      const { features } = await getUserSubscription(userId1);
      expect(features.maxLikes).toBe(10);
      expect(features.maxMessages).toBe(5);
      expect(features.adFree).toBe(false);
      expect(features.priorityMatch).toBe(false);
    });
  });

  describe('hasFeatureAccess', () => {
    test('should allow feature access for free plan', async () => {
      const hasAccess = await hasFeatureAccess(userId1, 'messageHistory');
      expect(hasAccess).toBe(true);
    });

    test('should deny ad-free feature on free plan', async () => {
      const hasAccess = await hasFeatureAccess(userId1, 'adFree');
      expect(hasAccess).toBe(false);
    });
  });

  describe('checkLikeLimit', () => {
    test('should allow likes within limit', async () => {
      const canLike = await checkLikeLimit(userId2, 5);
      expect(canLike).toBe(true);
    });

    test('should prevent likes exceeding limit', async () => {
      const canLike = await checkLikeLimit(userId2, 10);
      expect(canLike).toBe(false);
    });
  });

  describe('checkMessageLimit', () => {
    test('should allow messages within limit', async () => {
      const canMessage = await checkMessageLimit(userId3, 3);
      expect(canMessage).toBe(true);
    });

    test('should prevent messages exceeding limit', async () => {
      const canMessage = await checkMessageLimit(userId3, 5);
      expect(canMessage).toBe(false);
    });
  });

  describe('createPayment', () => {
    test('should create payment record', async () => {
      const payment = await createPayment({
        userId: userId1,
        plan: 'premium',
        billingPeriod: 'monthly',
        amount: 999,
        status: 'succeeded',
      });

      expect(payment.userId).toBe(userId1);
      expect(payment.plan).toBe('premium');
      expect(payment.amount).toBe(999);
      expect(payment.status).toBe('succeeded');
    });

    test('should support failed payments', async () => {
      const payment = await createPayment({
        userId: userId2,
        plan: 'vip',
        billingPeriod: 'yearly',
        amount: 29999,
        status: 'failed',
      });

      expect(payment.status).toBe('failed');
    });
  });

  describe('getPaymentHistory', () => {
    beforeEach(async () => {
      // Create multiple payments
      for (let i = 0; i < 3; i++) {
        await createPayment({
          userId: userId1,
          plan: 'premium',
          billingPeriod: 'monthly',
          amount: 999,
          status: 'succeeded',
        });
      }
    });

    test('should retrieve payment history', async () => {
      const payments = await getPaymentHistory(userId1);
      expect(payments.length).toBeGreaterThanOrEqual(3);
    });

    test('should support pagination', async () => {
      const page1 = await getPaymentHistory(userId1, 2, 0);
      const page2 = await getPaymentHistory(userId1, 2, 2);
      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
    });

    test('should order by creation date descending', async () => {
      const payments = await getPaymentHistory(userId1, 10, 0);
      if (payments.length >= 2) {
        expect(payments[0].createdAt.getTime()).toBeGreaterThanOrEqual(
          payments[1].createdAt.getTime()
        );
      }
    });
  });

  describe('cancelSubscription', () => {
    test('should cancel subscription', async () => {
      const subscription = await cancelSubscription(userId2);
      expect(subscription.status).toBe('cancelled');
      expect(subscription.cancelledAt).toBeDefined();
    });
  });

  describe('isSubscriptionActive', () => {
    test('should return true for active subscription', async () => {
      const active = await isSubscriptionActive(userId1);
      expect(active).toBe(true);
    });

    test('should return false for cancelled subscription', async () => {
      const active = await isSubscriptionActive(userId2);
      expect(active).toBe(false);
    });
  });

  describe('getProfileBoosts', () => {
    test('should return 0 boosts for free plan', async () => {
      const boosts = await getProfileBoosts(userId1);
      expect(boosts).toBe(0);
    });
  });

  describe('applyProfileBoost', () => {
    test('should throw error if no boosts available', async () => {
      await expect(applyProfileBoost(userId1)).rejects.toThrow(
        'No profile boosts available'
      );
    });
  });

  describe('PLAN_FEATURES', () => {
    test('should define free plan features', () => {
      expect(PLAN_FEATURES.free.maxLikes).toBe(10);
      expect(PLAN_FEATURES.free.maxMessages).toBe(5);
      expect(PLAN_FEATURES.free.adFree).toBe(false);
    });

    test('should define premium plan features', () => {
      expect(PLAN_FEATURES.premium.maxLikes).toBe(-1); // Unlimited
      expect(PLAN_FEATURES.premium.adFree).toBe(true);
      expect(PLAN_FEATURES.premium.priorityMatch).toBe(true);
    });

    test('should define vip plan features', () => {
      expect(PLAN_FEATURES.vip.maxLikes).toBe(-1);
      expect(PLAN_FEATURES.vip.profileBoosts).toBe(5);
      expect(PLAN_FEATURES.vip.messageHistory).toBe(-1); // Unlimited
    });
  });

  describe('PLAN_PRICES', () => {
    test('should define free plan price', () => {
      expect(PLAN_PRICES.free.monthly).toBe(0);
      expect(PLAN_PRICES.free.yearly).toBe(0);
    });

    test('should define premium plan prices', () => {
      expect(PLAN_PRICES.premium.monthly).toBe(999); // $9.99
      expect(PLAN_PRICES.premium.yearly).toBe(9999); // $99.99
    });

    test('should define vip plan prices', () => {
      expect(PLAN_PRICES.vip.monthly).toBe(2999); // $29.99
      expect(PLAN_PRICES.vip.yearly).toBe(29999); // $299.99
    });
  });

  describe('getSubscriptionStats', () => {
    test('should return subscription statistics', async () => {
      const stats = await getSubscriptionStats();
      expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
      expect(stats.freeUsers).toBeGreaterThanOrEqual(0);
      expect(stats.premiumUsers).toBeGreaterThanOrEqual(0);
      expect(stats.vipUsers).toBeGreaterThanOrEqual(0);
    });

    test('should calculate total revenue', async () => {
      const stats = await getSubscriptionStats();
      expect(stats.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(stats.monthlyRecurring + stats.yearlyRecurring).toBe(
        stats.totalRevenue
      );
    });
  });

  describe('handleSubscriptionRenewal', () => {
    test('should renew subscription dates', async () => {
      const subscription = await getOrCreateSubscription(userId3);
      const oldEnd = subscription.currentPeriodEnd;

      // Manually set to expired
      await prisma.subscription.update({
        where: { userId: userId3 },
        data: {
          status: 'active',
          currentPeriodEnd: new Date(Date.now() - 1000),
        },
      });

      const renewed = await handleSubscriptionRenewal(userId3);
      expect(renewed).toBeDefined();
      if (renewed) {
        expect(renewed.currentPeriodEnd.getTime()).toBeGreaterThan(
          oldEnd.getTime()
        );
      }
    });
  });

  describe('Feature hierarchy', () => {
    test('premium includes all free features and more', () => {
      const free = PLAN_FEATURES.free;
      const premium = PLAN_FEATURES.premium;

      expect(premium.maxLikes).toBeGreaterThanOrEqual(free.maxLikes);
      expect(premium.adFree).toBe(true);
      expect(premium.priorityMatch).toBe(true);
    });

    test('vip includes all premium features', () => {
      const premium = PLAN_FEATURES.premium;
      const vip = PLAN_FEATURES.vip;

      expect(vip.profileBoosts).toBeGreaterThan(premium.profileBoosts);
      expect(vip.adFree).toBe(premium.adFree);
    });
  });

  describe('Price validation', () => {
    test('yearly price should be less than 12x monthly', () => {
      const monthlyPrice = PLAN_PRICES.premium.monthly;
      const yearlyPrice = PLAN_PRICES.premium.yearly;

      expect(yearlyPrice).toBeLessThan(monthlyPrice * 12);
    });

    test('vip prices should be higher than premium', () => {
      expect(PLAN_PRICES.vip.monthly).toBeGreaterThan(
        PLAN_PRICES.premium.monthly
      );
      expect(PLAN_PRICES.vip.yearly).toBeGreaterThan(
        PLAN_PRICES.premium.yearly
      );
    });
  });

  describe('Edge cases and performance', () => {
    test('should handle concurrent subscription checks', async () => {
      const operations = [
        getUserSubscription(userId1),
        getUserSubscription(userId2),
        getUserSubscription(userId3),
      ];

      const results = await Promise.all(operations);
      expect(results.length).toBe(3);
    });

    test('should handle rapid payment creation', async () => {
      const payments = [];
      for (let i = 0; i < 20; i++) {
        payments.push(
          createPayment({
            userId: userId1,
            plan: 'premium',
            billingPeriod: 'monthly',
            amount: 999,
            status: 'succeeded',
          })
        );
      }

      const results = await Promise.all(payments);
      expect(results.length).toBe(20);
    });

    test('should gracefully handle invalid users', async () => {
      const fakeUserId = 'non-existent-user';
      const { subscription } = await getUserSubscription(fakeUserId);
      expect(subscription).toBeDefined();
    });
  });
});
