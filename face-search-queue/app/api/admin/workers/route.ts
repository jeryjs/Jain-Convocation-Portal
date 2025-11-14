import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';

interface WorkerInfo {
  id: string;
  hostname: string;
  status: 'online' | 'offline';
  gpu_index?: number;
  gpu_name: string;
  use_cpu: boolean;
  concurrency: number;
  start_time: number;
  uptime: number;
  last_heartbeat: number;
  jobs_processed: number;
  jobs_failed: number;
  current_job: string | null;
  cpu_percent: number;
  ram_percent: number;
  ram_available_gb: number;
  gpu_utilization?: number;
  gpu_memory_used_mb?: number;
  gpu_temperature?: number;
}

export async function GET() {
  try {
    const workersData = await redis.hgetall('workers');
    
    const workers: WorkerInfo[] = await Promise.all(
      Object.entries(workersData).map(async ([id, data]) => {
        const worker = JSON.parse(data);
        const now = Date.now() / 1000; // Convert to seconds
        const isOnline = (now - worker.last_heartbeat) < 15; // 15 seconds timeout
        
        // Check if worker is paused
        const isPaused = await redis.get(`worker:${id}:paused`) === '1';
        
        return {
          ...worker,
          status: isOnline ? 'online' : 'offline',
          paused: isPaused,
        };
      })
    );
    
    // Sort by status (online first) then by ID
    workers.sort((a, b) => {
      if (a.status === b.status) return a.id.localeCompare(b.id);
      return a.status === 'online' ? -1 : 1;
    });
    
    return NextResponse.json({ workers });
  } catch (error) {
    console.error('Error fetching workers:', error);
    return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
  }
}

// Remove worker
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');
    
    if (!workerId) {
      return NextResponse.json({ error: 'Worker ID required' }, { status: 400 });
    }
    
    await redis.hdel('workers', workerId);
    return NextResponse.json({ success: true, message: 'Worker removed' });
  } catch (error) {
    console.error('Error removing worker:', error);
    return NextResponse.json({ error: 'Failed to remove worker' }, { status: 500 });
  }
}
