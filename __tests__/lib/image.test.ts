import { describe, it, expect, vi } from 'vitest';
import { validateImage } from '@/app/lib/image';

describe('Image Processing', () => {
  it('should validate valid image', async () => {
    const buffer = Buffer.alloc(1000000); // 1MB
    const validation = await validateImage(buffer);
    expect(validation.isValid).toBe(true);
  });

  it('should reject small images', async () => {
    const buffer = Buffer.alloc(10000); // 10KB
    const validation = await validateImage(buffer);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toBeDefined();
  });

  it('should reject oversized images', async () => {
    const buffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
    const validation = await validateImage(buffer);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toBeDefined();
  });
});
