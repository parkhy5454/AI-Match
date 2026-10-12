import { z, ZodError } from 'zod';

// 공통 검증 스키마
export const emailSchema = z.string().email('Invalid email format');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[!@#$%^&*]/, 'Password must contain special character');

export const messageSchema = z.object({
  content: z.string().min(1).max(5000, 'Message too long'),
  receiverId: z.string().uuid('Invalid receiver ID'),
});

export const searchSchema = z.object({
  ageMin: z.coerce.number().int().min(18).max(100),
  ageMax: z.coerce.number().int().min(18).max(100),
  region: z.string().optional(),
  gender: z.enum(['male', 'female', 'all']).optional(),
  mbti: z.string().optional(),
}).refine(
  (data) => data.ageMin <= data.ageMax,
  { message: 'ageMin must be less than or equal to ageMax', path: ['ageMin'] }
);

export const imageSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Invalid file type. Only JPEG, PNG, and WebP allowed'
    ),
});

export function validateData<T>(schema: z.ZodSchema, data: unknown): {
  success: boolean;
  data?: T;
  errors?: ZodError['errors'];
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false };
  }
}
