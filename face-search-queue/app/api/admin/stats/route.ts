import { NextResponse } from 'next/server';
import { faceSearchQueue } from '@/lib/queue';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';

// Combined stats endpoint (reduces API calls)
export async function GET() {
  try {
    const [
      waitingCount,
      activeCount,
      completedCount,
      failedCount,
      delayedCount,
      isPaused,
      workersData,
    ] = await Promise.all([
      faceSearchQueue.getWaitingCount(),
      faceSearchQueue.getActiveCount(),
      faceSearchQueue.getCompletedCount(),
      faceSearchQueue.getFailedCount(),
      faceSearchQueue.getDelayedCount(),
      faceSearchQueue.isPaused(),
      redis.hgetall('workers'),
    ]);
    
    const workers = Object.entries(workersData).map(([id, data]) => {
      const worker = JSON.parse(data);
      const now = Date.now() / 1000;
      const isOnline = (now - worker.last_heartbeat) < 15;
      return { ...worker, status: isOnline ? 'online' : 'offline' };
    });
    
    return NextResponse.json({
      stats: {
        waiting: waitingCount,
        active: activeCount,
        completed: completedCount,
        failed: failedCount,
        delayed: delayedCount,
      },
      isPaused,
      workers,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching combined stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
