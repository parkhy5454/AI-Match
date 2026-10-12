import { describe, it, expect, vi } from 'vitest';
import { checkUserFraud, containsBannedKeywords } from '@/app/lib/fraud-detection';

describe('Fraud Detection', () => {
  it('should identify banned keywords', () => {
    expect(containsBannedKeywords('Please send bitcoin payment')).toBe(true);
    expect(containsBannedKeywords('Hello world')).toBe(false);
  });

  it('should return fraud flags', async () => {
    const flags = await checkUserFraud('non-existent-user');

    expect(flags).toHaveProperty('isSpamming');
    expect(flags).toHaveProperty('hasAbnormalActivity');
    expect(flags).toHaveProperty('hasLowTrustProfile');
    expect(flags).toHaveProperty('riskLevel');
  });

  it('should have valid risk levels', async () => {
    const flags = await checkUserFraud('non-existent-user');
    expect(['low', 'medium', 'high', 'critical']).toContain(flags.riskLevel);
  });
});
