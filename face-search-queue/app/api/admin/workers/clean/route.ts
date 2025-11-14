import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

// Clean up stale worker data and counters
export async function POST() {
  try {
    // Get all workers
    const workersData = await redis.hgetall('workers');
    const now = Date.now() / 1000;
    
    let cleaned = 0;
    
    // Remove offline workers (no heartbeat for 60+ seconds)
    for (const [workerId, data] of Object.entries(workersData)) {
      const worker = JSON.parse(data);
      const timeSinceHeartbeat = now - worker.last_heartbeat;
      
      if (timeSinceHeartbeat > 60) {
        await redis.hdel('workers', workerId);
        await redis.del(`worker:${workerId}:paused`);
        cleaned++;
      }
    }
    
    // Clean up old worker counter keys (no longer used)
    const keys = await redis.keys('worker_counter:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Cleaned ${cleaned} stale workers and removed old counter keys`,
      cleaned 
    });
  } catch (error) {
    console.error('Error cleaning workers:', error);
    return NextResponse.json({ error: 'Failed to clean workers' }, { status: 500 });
  }
}
