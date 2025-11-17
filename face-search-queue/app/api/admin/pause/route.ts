import { NextResponse } from 'next/server';
import { faceSearchQueue } from '@/lib/queue';

// Pause queue
export async function POST() {
  try {
    await faceSearchQueue.pause();
    return NextResponse.json({ success: true, message: 'Queue paused' });
  } catch (error) {
    console.error('Error pausing queue:', error);
    return NextResponse.json({ error: 'Failed to pause queue' }, { status: 500 });
  }
}

// Resume queue
export async function DELETE() {
  try {
    await faceSearchQueue.resume();
    return NextResponse.json({ success: true, message: 'Queue resumed' });
  } catch (error) {
    console.error('Error resuming queue:', error);
    return NextResponse.json({ error: 'Failed to resume queue' }, { status: 500 });
  }
}

// Get pause status
export async function GET() {
  try {
    const isPaused = await faceSearchQueue.isPaused();
    return NextResponse.json({ isPaused });
  } catch (error) {
    console.error('Error checking pause status:', error);
    return NextResponse.json({ error: 'Failed to check pause status' }, { status: 500 });
  }
}
