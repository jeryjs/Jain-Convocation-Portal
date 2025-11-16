import { NextRequest } from 'next/server';
import { faceSearchQueue, queueEvents, clearActiveJob } from '@/lib/queue';
import type { JobStatus, JobResult, JobError } from '@/lib/types';

/*
  Exposure: Keep export dynamic
*/
export const dynamic = 'force-dynamic';

/* -----------------------------
   Configurable constants
   ----------------------------- */
const POLL_INTERVAL_MS = 2000; // Poll frequency for status updates
const KEEPALIVE_MS = 15000; // Keepalive ping, 15s is safe for most proxies

/* -----------------------------
   Local types
   ----------------------------- */
interface FaceSearchResult {
  id: string;
  score: number;
}

type Subscriber = {
  id: string; // unique per connection; we can use jobId + random or stream's id
  sendEvent: (event: string, data: any) => void;
  closeConnection: () => void;
  // Keep subscriber-level lastSignature to avoid sending duplicates back to same subscriber
  lastSignature?: string | null;
};

/* -----------------------------
   In-memory per-job broadcasters
   -----------------------------
   Structure:
     jobBroadcasters (Map):
       key: jobId
       value: {
         subscribers: Set<Subscriber>,
         statusInterval: NodeJS.Timer,
         keepAliveInterval: NodeJS.Timer,
         lastSignature: string | null,
         listeners: { completed, failed, progress } // registered handlers for queueEvents
       }
*/
const jobBroadcasters = new Map<
  string,
  {
    subscribers: Set<Subscriber>;
    statusInterval: ReturnType<typeof setInterval> | null;
    keepAliveInterval: ReturnType<typeof setInterval> | null;
    lastSignature: string | null;
    listeners: {
      completed?: (payload: any) => void;
      failed?: (payload: any) => void;
      progress?: (payload: any) => void;
    };
  }
>();

/* -----------------------------
   Shared broadcaster helpers
   ----------------------------- */

/**
 * Send event to all subscribers (safe iteration)
 */
const broadcastToSubscribers = (jobId: string, event: string, payload: any) => {
  const broadcaster = jobBroadcasters.get(jobId);
  if (!broadcaster) return;
  for (const sub of broadcaster.subscribers) {
    try {
      // Use subscriber-level dedupe if signature exists
      if (event === 'status') {
        const subscriberSig = JSON.stringify(payload);
        // If signature is unchanged for subscriber, skip
        if (sub.lastSignature === subscriberSig) continue;
        sub.lastSignature = subscriberSig;
      }
      sub.sendEvent(event, payload);
    } catch (err) {
      // If sending fails, close subscriber safely
      try {
        sub.closeConnection();
      } catch {}
    }
  }
};

/**
 * Broadcast to all subscribers and optionally clear the broadcaster
 */
const endBroadcaster = async (jobId: string, finalEvent: 'result' | 'error', payload: any) => {
  // Broadcast final event to all subs
  broadcastToSubscribers(jobId, finalEvent, payload);

  const b = jobBroadcasters.get(jobId);
  if (!b) return;

  // Clear intervals and remove listeners
  if (b.statusInterval !== null) {
    clearInterval(b.statusInterval);
    b.statusInterval = null;
  }
  if (b.keepAliveInterval !== null) {
    clearInterval(b.keepAliveInterval);
    b.keepAliveInterval = null;
  }
  if (b.listeners.completed) queueEvents.off('completed', b.listeners.completed);
  if (b.listeners.failed) queueEvents.off('failed', b.listeners.failed);
  if (b.listeners.progress) queueEvents.off('progress', b.listeners.progress);

  // ClearActiveJob once at end to avoid races
  try {
    await clearActiveJob((payload as any).uid ?? (payload as any)?.uid);
  } catch (err) {
    // clearActiveJob might fail or be idempotent; ignore errors
  }

  // Close all subscribers
  for (const sub of b.subscribers) {
    try {
      sub.closeConnection();
    } catch {}
  }

  // Delete broadcaster entry
  jobBroadcasters.delete(jobId);
};

/**
 * Compute a consistent status signature (used for deduplication)
 */
const computeStatusSignature = (status: JobStatus, state: string | undefined) => {
  return JSON.stringify({
    position: status.position,
    total_size: status.total_size,
    stage: status.stage,
    start_time: status.start_time,
    state,
  });
};

/**
 * Start a broadcaster for a job - idempotent (will not re-create it if already exists)
 * This registers queueEvents listeners and a single polling loop for status updates.
 */
const startBroadcaster = async (jobId: string) => {
  // If exists already, return
  if (jobBroadcasters.has(jobId)) return;

  const subscribers = new Set<Subscriber>();
  let lastSignature: string | null = null;
  let statusInterval: ReturnType<typeof setInterval> | null = null;
  let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  const listeners: {
    completed?: (payload: any) => void;
    failed?: (payload: any) => void;
    progress?: (payload: any) => void;
  } = {};

  // Poll function - single shared for the job
  const pollStatus = async () => {
    try {
      // Fetch lightweight job state and position
      const waitingCount = await faceSearchQueue.getWaitingCount();
      const job = await faceSearchQueue.getJob(jobId);
      if (!job) {
        // If job missing (deleted), end broadcaster with an error event
        const error: JobError = {
          error: 'Job no longer exists',
          start_time: Date.now(),
          finish_time: Date.now(),
          stage: 'unknown',
        };
        await endBroadcaster(jobId, 'error', error);
        return;
      }

      const currentState = await job.getState();
      const waitingJobs = await faceSearchQueue.getWaiting();
      const position = waitingJobs.findIndex((j) => j.id === jobId);
      const status: JobStatus = {
        position: position >= 0 ? position + 1 : 1,
        total_size: waitingCount + 1,
        start_time: job.timestamp,
        stage: job.data?.stage ?? 'search',
      };

      const signature = computeStatusSignature(status, currentState);
      if (signature === lastSignature) {
        // Nothing changed, skip broadcasting
        return;
      }
      lastSignature = signature;
      // Broadcast to all subscribers
      broadcastToSubscribers(jobId, 'status', status);
    } catch (err) {
      // If polling fails for any reason, log and continue; don't crash broadcaster
      console.error(`[SSE] Polling error for job ${jobId}:`, err);
    }
  };

  // Completed listener
  listeners.completed = async ({ jobId: completedJobId }: { jobId: string }) => {
    if (completedJobId !== jobId) return;
    try {
      const job = await faceSearchQueue.getJob(jobId);
      if (!job) return;

      const returnValue = job.returnvalue as FaceSearchResult[] | undefined;
      const result: JobResult = {
        result: returnValue || [],
        start_time: job.timestamp,
        finish_time: job.finishedOn || Date.now(),
        stage: job.data?.stage,
      };

      // Broadcast result and cleanup
      await endBroadcaster(jobId, 'result', result);
    } catch (err) {
      console.error(`[SSE] Error in completed listener for ${jobId}`, err);
    }
  };

  // Failed listener
  listeners.failed = async ({ jobId: failedJobId, failedReason }: { jobId: string; failedReason: string }) => {
    if (failedJobId !== jobId) return;
    try {
      const job = await faceSearchQueue.getJob(jobId);
      const error: JobError = {
        error: failedReason || 'Job processing failed',
        start_time: job?.timestamp || Date.now(),
        finish_time: job?.finishedOn || Date.now(),
        stage: job?.data?.stage ?? 'search',
      };
      await endBroadcaster(jobId, 'error', error);
    } catch (err) {
      console.error(`[SSE] Error in failed listener for ${jobId}`, err);
    }
  };

  // Optional: Progress listener (if queue emits)
  listeners.progress = async ({ jobId: progressJobId, progress }: { jobId: string; progress: number }) => {
    if (progressJobId !== jobId) return;
    try {
      const job = await faceSearchQueue.getJob(jobId);
      if (!job) return;

      // Keep front-end compatibility: broadcast a 'status' update with progress included
      const update: any = {
        position: undefined, // Not necessarily relevant
        total_size: undefined,
        start_time: job.timestamp,
        stage: job.data?.stage,
        progress,
      };
      broadcastToSubscribers(jobId, 'status', update);
    } catch (err) {
      console.error(`[SSE] Error in progress listener for ${jobId}`, err);
    }
  };

  // Register queue event listeners
  queueEvents.on('completed', listeners.completed);
  queueEvents.on('failed', listeners.failed);
  queueEvents.on('progress', listeners.progress);

  // Set up polling interval for status updates
  statusInterval = setInterval(pollStatus, POLL_INTERVAL_MS) as unknown as ReturnType<typeof setInterval>;

  // Immediately poll once to fire initial status
  setImmediate(pollStatus);

  // Keepalive ping for all subscribers as separate interval
  keepAliveInterval = setInterval(() => {
    // Ping will be the same for all subscribers - it just keeps connections alive
    broadcastToSubscribers(jobId, 'ping', {});
  }, KEEPALIVE_MS) as unknown as ReturnType<typeof setInterval>;

  // Store broadcaster
  jobBroadcasters.set(jobId, {
    subscribers,
    statusInterval,
    keepAliveInterval,
    lastSignature,
    listeners,
  });
};

/**
 * Add a subscriber to a (possibly) existing broadcaster; will create broadcaster if needed
 */
const addSubscriber = async (jobId: string, sub: Subscriber) => {
  await startBroadcaster(jobId);
  const broadcaster = jobBroadcasters.get(jobId);
  if (!broadcaster) {
    // If still missing, startBroadcaster may have failed, but create a fallback set
    jobBroadcasters.set(jobId, {
      subscribers: new Set([sub]),
      statusInterval: null,
      keepAliveInterval: null,
      lastSignature: null,
      listeners: {},
    });
    return;
  }
  broadcaster.subscribers.add(sub);
  // If we already have a lastSignature, send current status to the new subscriber
  // We'll fetch an immediate job status cheaply from the broadcaster (via current lastSignature or a quick poll)
  // For simplicity, let the broadcaster's immediate poll fire and send the new subscriber a status via broadcastToSubscribers
  // However, to ensure immediate response, let's trigger a quick poll for the job (not expensive if only once)
  try {
    const waitingCount = await faceSearchQueue.getWaitingCount();
    const job = await faceSearchQueue.getJob(jobId);
    if (job) {
      const waitingJobs = await faceSearchQueue.getWaiting();
      const position = waitingJobs.findIndex((j) => j.id === jobId);
      const status: JobStatus = {
        position: position >= 0 ? position + 1 : 1,
        total_size: waitingCount + 1,
        start_time: job.timestamp,
        stage: job.data?.stage ?? 'search',
      };
      // Avoid sending to all subscribers (we want to send to this subscriber only)
      // Update sub signature to match new signature and send
      const sig = computeStatusSignature(status, await job.getState());
      if (sub.lastSignature !== sig) {
        sub.lastSignature = sig;
        sub.sendEvent('status', status);
      }
    }
  } catch {
    // ignore immediate poll errors
  }
};

/**
 * Remove a subscriber; if no subscribers left, cleanup broadcaster
 */
const removeSubscriber = (jobId: string, sub: Subscriber) => {
  const b = jobBroadcasters.get(jobId);
  if (!b) return;
  b.subscribers.delete(sub);

  // If no subscribers, cleanup everything to reduce work
  if (b.subscribers.size === 0) {
    if (b.statusInterval !== null) {
      clearInterval(b.statusInterval);
      b.statusInterval = null;
    }
    if (b.keepAliveInterval !== null) {
      clearInterval(b.keepAliveInterval);
      b.keepAliveInterval = null;
    }
    if (b.listeners.completed) queueEvents.off('completed', b.listeners.completed);
    if (b.listeners.failed) queueEvents.off('failed', b.listeners.failed);
    if (b.listeners.progress) queueEvents.off('progress', b.listeners.progress);
    jobBroadcasters.delete(jobId);
  }
};

/* -----------------------------
   Route handler
   ----------------------------- */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('id');

  if (!jobId) {
    return new Response('Job ID is required', { status: 400 });
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Basic per-request state
      let isClosed = false;

      // sendEvent is a local function for each connection that delegates to the controller
      const sendEvent = (event: string, data: any) => {
        if (isClosed) return;
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          console.error('Error sending event:', err);
          isClosed = true;
        }
      };

      const closeConnection = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      try {
        // Validate job existence and state early on
        const job = await faceSearchQueue.getJob(jobId);
        if (!job) {
          sendEvent('error', {
            error: 'Job not found',
            start_time: Date.now(),
            finish_time: Date.now(),
            stage: 'unknown',
          });
          closeConnection();
          return;
        }

        const state = await job.getState();
        const jobData = job.data;

        // If job completed/failed, return immediately and close
        if (state === 'completed') {
          const returnValue = job.returnvalue as FaceSearchResult[] | undefined;
          const result: JobResult = {
            result: returnValue || [],
            start_time: job.timestamp,
            finish_time: job.finishedOn || Date.now(),
            stage: jobData.stage,
          };
          sendEvent('result', result);
          try {
            await clearActiveJob(jobData.uid);
          } catch {}
          closeConnection();
          return;
        }

        if (state === 'failed') {
          const error: JobError = {
            error: job.failedReason || 'Job processing failed',
            start_time: job.timestamp,
            finish_time: job.finishedOn || Date.now(),
            stage: jobData.stage,
          };
          sendEvent('error', error);
          try {
            await clearActiveJob(jobData.uid);
          } catch {}
          closeConnection();
          return;
        }

        // Otherwise, job is in queue/in-progress - subscribe to broadcaster
        const subscriber: Subscriber = {
          id: `${jobId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          sendEvent,
          closeConnection,
          lastSignature: null,
        };

        // Ensure broadcaster is active and add subscriber
        await addSubscriber(jobId, subscriber);

        // Add an on-abort handler to remove this subscriber
        const abortHandler = () => {
          if (isClosed) return;
          isClosed = true;
          removeSubscriber(jobId, subscriber);
          try {
            controller.close();
          } catch {}
        };
        request.signal.addEventListener('abort', abortHandler);

        // On client disconnect via closing, ensure subscriber removed
        // The closeConnection is captured by broadcaster, but also remove explicitly
        // We wrap it so we only remove once
        const wrappedClose = () => {
          if (isClosed) return;
          isClosed = true;
          removeSubscriber(jobId, subscriber);
          try {
            controller.close();
          } catch {}
        };
        subscriber.closeConnection = wrappedClose;
      } catch (err) {
        console.error('[SSE] Unexpected error in GET handler', err);
        sendEvent('error', {
          error: 'Internal server error',
          start_time: Date.now(),
          finish_time: Date.now(),
          stage: 'unknown',
        });
        closeConnection();
      }
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}