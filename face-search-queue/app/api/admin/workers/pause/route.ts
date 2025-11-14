import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { workerId } = await request.json();

    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID is required' },
        { status: 400 }
      );
    }

    // Set pause flag in Redis
    await redis.set(`worker:${workerId}:paused`, '1');

    return NextResponse.json({ success: true, workerId, paused: true });
  } catch (error) {
    console.error('Error pausing worker:', error);
    return NextResponse.json(
      { error: 'Failed to pause worker' },
      { status: 500 }
    );
  }
}
