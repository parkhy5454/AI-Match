import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { registerDevice, type DeviceInfo } from '@/lib/mobile-optimization-system';

/**
 * POST /api/mobile/device
 * Register or update mobile device information
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const deviceData = await req.json();

    if (!deviceData.deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const device = await registerDevice(userId, deviceData);

    return NextResponse.json({
      success: true,
      data: device,
      message: 'Device registered successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to register device';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
