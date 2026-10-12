import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { verifyPhotoAuthenticity, detectFace } from '@/app/lib/verification';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageId } = await request.json();

    // In production, fetch image from storage
    // For now, return mock verification

    const verification = await verifyPhotoAuthenticity(Buffer.from(''));
    const faceDetection = await detectFace(Buffer.from(''));

    return NextResponse.json({
      imageId,
      verification,
      faceDetection,
      status: verification.confidence > 70 ? 'approved' : 'review_needed',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
