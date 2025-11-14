import { Queue, QueueEvents } from 'bullmq';
import redis from './redis';

export interface FaceSearchJobData {
  image: string;
  uid: string;
  stage: string;
  timestamp: number;
}

export interface FaceSearchResult {
  id: string;
  score: number;
}

export const faceSearchQueue = new Queue<FaceSearchJobData>('face-search', {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,  // No retries - each job runs once only
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

export const queueEvents = new QueueEvents('face-search', {
  connection: redis,
});

// Track active jobs per user (in-memory cache, backed by Redis)
const RATE_LIMIT_KEY = (uid: string) => `rate_limit:${uid}`;
const ACTIVE_JOB_KEY = (uid: string) => `active_job:${uid}`;

export async function checkRateLimit(uid: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const lastJobTime = await redis.get(RATE_LIMIT_KEY(uid));
  
  if (lastJobTime) {
    const elapsed = Date.now() - parseInt(lastJobTime);
    const TWO_MINUTES = 0 * 60 * 1000;
    
    if (elapsed < TWO_MINUTES) {
      return {
        allowed: false,
        retryAfter: Math.ceil((TWO_MINUTES - elapsed) / 1000),
      };
    }
  }
  
  return { allowed: true };
}

export async function checkExistingJob(uid: string): Promise<{ hasJob: boolean; jobId?: string; stage?: string }> {
  const activeJobData = await redis.get(ACTIVE_JOB_KEY(uid));
  
  if (activeJobData) {
    const { jobId, stage } = JSON.parse(activeJobData);
    
    // Verify job still exists and is active
    const job = await faceSearchQueue.getJob(jobId);
    if (job && (await job.getState()) !== 'completed' && (await job.getState()) !== 'failed') {
      return { hasJob: true, jobId, stage };
    }
    
    // Clean up stale data
    await redis.del(ACTIVE_JOB_KEY(uid));
  }
  
  return { hasJob: false };
}

export async function createJob(data: FaceSearchJobData) {
  const job = await faceSearchQueue.add('process-face', data, {
    jobId: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  });
  
  // Set rate limit
  await redis.set(RATE_LIMIT_KEY(data.uid), data.timestamp.toString(), 'EX', 2 * 60);
  
  // Track active job
  await redis.set(
    ACTIVE_JOB_KEY(data.uid),
    JSON.stringify({ jobId: job.id, stage: data.stage }),
    'EX', 30 * 60 // Expire after 30 minutes
  );
  
  return job;
}

export async function clearActiveJob(uid: string) {
  await redis.del(ACTIVE_JOB_KEY(uid));
}

export default faceSearchQueue;
