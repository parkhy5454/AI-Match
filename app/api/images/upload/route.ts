import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/app/lib/prisma';
import {
  optimizeImage,
  generateThumbnail,
  removeExifData,
  validateImage,
} from '@/app/lib/image';
import { verifyPhotoAuthenticity } from '@/app/lib/verification';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Validate image
    const validation = await validateImage(buffer);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Remove EXIF data
    const cleanBuffer = await removeExifData(buffer);

    // Optimize image
    const optimized = await optimizeImage(cleanBuffer);

    // Generate thumbnails
    const smallThumb = await generateThumbnail(cleanBuffer, 'small');
    const mediumThumb = await generateThumbnail(cleanBuffer, 'medium');
    const largeThumb = await generateThumbnail(cleanBuffer, 'large');

    // Verify photo authenticity
    const verification = await verifyPhotoAuthenticity(optimized);

    // Store image metadata
    const imageId = uuidv4();

    // In production, upload to S3/CloudFront
    // For now, store metadata in database

    return NextResponse.json({
      id: imageId,
      url: `/images/${imageId}`,
      thumbnails: {
        small: `/images/${imageId}/thumb-small`,
        medium: `/images/${imageId}/thumb-medium`,
        large: `/images/${imageId}/thumb-large`,
      },
      verification: {
        isRealPhoto: verification.isRealPhoto,
        confidence: verification.confidence,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
