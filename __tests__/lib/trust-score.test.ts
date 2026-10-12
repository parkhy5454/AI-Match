import { describe, it, expect } from 'vitest';
import { calculateTrustScore } from '@/app/lib/trust-score';

describe('Trust Score Calculation', () => {
  it('should calculate trust score between 0-100', async () => {
    const score = await calculateTrustScore('non-existent-user');

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should return 0 for non-existent user', async () => {
    const score = await calculateTrustScore('');

    expect(score).toBe(0);
  });
});
