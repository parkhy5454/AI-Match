import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/app/lib/prisma';
import { uploadImage, deleteImage } from '@/app/lib/cloudinary';
import {
  removeExifData,
  validateImage,
  getImageDimensions,
} from '@/app/lib/image';
import { handleApiError, getClientIp } from '@/app/lib/error-handler';
import { checkRateLimit } from '@/app/lib/rate-limit';
import logger from '@/app/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitCheck = checkRateLimit(ip, 'UPLOAD');
    if (rateLimitCheck.limited) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate
    const validation = await validateImage(buffer);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Remove EXIF
    const cleanBuffer = await removeExifData(buffer);

    // Get dimensions
    const dimensions = await getImageDimensions(cleanBuffer);

    // Upload to Cloudinary
    const uploadResult = await uploadImage(cleanBuffer, 'profile-images', {
      resource_type: 'image',
      quality: 'auto',
    }) as any;

    logger.info('Image uploaded', {
      userId: user.id,
      cloudinaryId: uploadResult.public_id,
      size: uploadResult.bytes,
    });

    return NextResponse.json({
      id: uploadResult.public_id,
      url: uploadResult.secure_url,
      dimensions,
      size: uploadResult.bytes,
    });
  } catch (error) {
    logger.error('Image upload failed', { error: String(error) });
    return handleApiError(error);
  }
}
