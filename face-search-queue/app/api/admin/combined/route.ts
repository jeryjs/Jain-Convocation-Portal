import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';

// Combined endpoint for queue and workers data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeJobs = searchParams.get('includeJobs') !== 'false';
    
    // Fetch queue stats and workers in parallel
    const [queueStats, workersData] = await Promise.all([
      fetchQueueStats(includeJobs),
      fetchWorkers(),
    ]);
    
    return NextResponse.json({
      ...queueStats,
      workers: workersData,
    });
  } catch (error) {
    console.error('Error fetching combined data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

async function fetchQueueStats(includeJobs: boolean) {
  const { faceSearchQueue } = await import('@/lib/queue');
  
  // Always fetch counts
  const counts = await Promise.all([
    faceSearchQueue.getWaitingCount(),
    faceSearchQueue.getActiveCount(),
    faceSearchQueue.getCompletedCount(),
    faceSearchQueue.getFailedCount(),
    faceSearchQueue.getDelayedCount(),
  ]);
  
  const [waitingCount, activeCount, completedCount, failedCount, delayedCount] = counts;
  
  let jobs = null;
  if (includeJobs) {
    const limit = 50;
    const [
      waitingJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      delayedJobs,
    ] = await Promise.all([
      faceSearchQueue.getWaiting(0, limit),
      faceSearchQueue.getActive(0, limit),
      faceSearchQueue.getCompleted(0, limit),
      faceSearchQueue.getFailed(0, limit),
      faceSearchQueue.getDelayed(0, limit),
    ]);
    
    const formatJob = (job: any) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
    });
    
    jobs = {
      waiting: waitingJobs.map(formatJob),
      active: activeJobs.map(formatJob),
      completed: completedJobs.map(formatJob),
      failed: failedJobs.map(formatJob),
      delayed: delayedJobs.map(formatJob),
    };
  }
  
  return {
    stats: {
      waiting: waitingCount,
      active: activeCount,
      completed: completedCount,
      failed: failedCount,
      delayed: delayedCount,
    },
    jobs,
  };
}

async function fetchWorkers() {
  const workersData = await redis.hgetall('workers');
  const workerIds = Object.keys(workersData);
  
  // Batch get all pause statuses
  const pipeline = redis.pipeline();
  workerIds.forEach(id => pipeline.get(`worker:${id}:paused`));
  const pauseResults = await pipeline.exec();
  
  const now = Date.now() / 1000;
  const workers = workerIds.map((id, index) => {
    const worker = JSON.parse(workersData[id]);
    const isOnline = (now - worker.last_heartbeat) < 15;
    const isPaused = pauseResults?.[index]?.[1] === '1';
    
    return {
      ...worker,
      status: isOnline ? 'online' : 'offline',
      paused: isPaused,
    };
  });
  
  workers.sort((a, b) => {
    if (a.status === b.status) return a.id.localeCompare(b.id);
    return a.status === 'online' ? -1 : 1;
  });
  
  return workers;
}
