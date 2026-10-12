import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { markMessageAsRead, deleteMessage } from '@/lib/messaging-system';

/**
 * PUT /api/messaging/messages/:id
 * Mark message as read or perform other actions
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'read') {
      const message = await markMessageAsRead(params.id, userId);
      return NextResponse.json(message);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update message' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messaging/messages/:id
 * Delete a message (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message = await deleteMessage(params.id, userId);

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete message' },
      { status: 500 }
    );
  }
}
