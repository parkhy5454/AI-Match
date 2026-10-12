import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getCallStatistics, getCallStatisticsSummary } from '@/lib/video-call-system';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyAuth(req);
    const { videoBitrate, audioBitrate, frameRate, resolution, packetLoss, latency, jitter, audioLevel } = await req.json();

    // Stats recording would be done here
    return NextResponse.json({
      success: true,
      message: 'Statistics recorded',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record statistics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAuth(req);
    const summary = await getCallStatisticsSummary(params.id);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get statistics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
