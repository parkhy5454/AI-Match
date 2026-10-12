import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createCallRecording, getCallRecordings } from '@/lib/video-call-system';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyAuth(req);
    const { fileName, fileSize, duration, format, bitrate, resolution } = await req.json();

    const recording = await createCallRecording(
      params.id,
      fileName,
      fileSize,
      duration,
      format,
      bitrate,
      resolution
    );

    return NextResponse.json({
      success: true,
      data: recording,
      message: 'Recording created',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create recording';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAuth(req);
    const recordings = await getCallRecordings(params.id);

    return NextResponse.json({
      success: true,
      data: recordings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get recordings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
