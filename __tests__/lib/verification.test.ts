import { describe, it, expect } from 'vitest';
import { verifyPhotoAuthenticity, detectFace } from '@/app/lib/verification';

describe('Photo Verification', () => {
  it('should verify photo authenticity', async () => {
    const buffer = Buffer.alloc(100000);
    const verification = await verifyPhotoAuthenticity(buffer);

    expect(verification).toHaveProperty('isRealPhoto');
    expect(verification).toHaveProperty('confidence');
    expect(verification.confidence).toBeGreaterThanOrEqual(0);
    expect(verification.confidence).toBeLessThanOrEqual(100);
  });

  it('should detect faces', async () => {
    const buffer = Buffer.alloc(100000);
    const detection = await detectFace(buffer);

    expect(detection).toHaveProperty('hasFace');
    expect(detection).toHaveProperty('confidence');
    expect(detection.confidence).toBeGreaterThanOrEqual(0);
    expect(detection.confidence).toBeLessThanOrEqual(100);
  });
});
