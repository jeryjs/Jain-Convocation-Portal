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

    // Remove pause flag from Redis
    await redis.del(`worker:${workerId}:paused`);

    return NextResponse.json({ success: true, workerId, paused: false });
  } catch (error) {
    console.error('Error resuming worker:', error);
    return NextResponse.json(
      { error: 'Failed to resume worker' },
      { status: 500 }
    );
  }
}
