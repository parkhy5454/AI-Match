import { prisma } from '@/lib/db';

export interface FraudFlags {
  isSpamming: boolean;
  hasAbnormalActivity: boolean;
  hasLowTrustProfile: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export async function checkUserFraud(userId: string): Promise<FraudFlags> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sentMessages: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 3600000), // Last hour
            },
          },
        },
        profileUpdates: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 86400000), // Last 24 hours
            },
          },
        },
      },
    });

    if (!user) {
      return {
        isSpamming: false,
        hasAbnormalActivity: false,
        hasLowTrustProfile: false,
        riskLevel: 'low',
      };
    }

    // Check for spam (>50 messages per hour)
    const isSpamming = user.sentMessages.length > 50;

    // Check for abnormal activity (>10 profile updates per day)
    const hasAbnormalActivity = user.profileUpdates.length > 10;

    // Check trust score
    const trustScore = user.trustScore || 50;
    const hasLowTrustProfile = trustScore < 30;

    // Calculate risk level
    let riskLevel: FraudFlags['riskLevel'] = 'low';
    if (hasLowTrustProfile) riskLevel = 'critical';
    else if (hasAbnormalActivity) riskLevel = 'high';
    else if (isSpamming) riskLevel = 'medium';

    return {
      isSpamming,
      hasAbnormalActivity,
      hasLowTrustProfile,
      riskLevel,
    };
  } catch (error) {
    console.error('Fraud check error:', error);
    return {
      isSpamming: false,
      hasAbnormalActivity: false,
      hasLowTrustProfile: false,
      riskLevel: 'low',
    };
  }
}

export async function detectAnomalousPattern(userId: string): Promise<{
  isAnomaly: boolean;
  type: string;
  confidence: number;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        loginHistory: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user || !user.loginHistory) {
      return { isAnomaly: false, type: 'none', confidence: 0 };
    }

    // Analyze login patterns
    const loginTimes = user.loginHistory.map((h) => h.createdAt.getTime());
    const timeDifferences = [];

    for (let i = 0; i < loginTimes.length - 1; i++) {
      timeDifferences.push(loginTimes[i] - loginTimes[i + 1]);
    }

    const avgTimeBetweenLogins =
      timeDifferences.reduce((a, b) => a + b, 0) / timeDifferences.length;

    // If last login is significantly different from average
    const lastDifference = loginTimes[0] - loginTimes[1];
    const deviation = Math.abs(lastDifference - avgTimeBetweenLogins) / avgTimeBetweenLogins;

    return {
      isAnomaly: deviation > 2, // >200% deviation
      type: deviation > 2 ? 'abnormal_login_pattern' : 'normal',
      confidence: Math.min(100, deviation * 50),
    };
  } catch (error) {
    console.error('Pattern detection error:', error);
    return { isAnomaly: false, type: 'none', confidence: 0 };
  }
}

const BANNED_KEYWORDS = [
  'bitcoin',
  'crypto',
  'payment',
  'wire money',
  'urgent',
  'verify account',
];

export function containsBannedKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return BANNED_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}
