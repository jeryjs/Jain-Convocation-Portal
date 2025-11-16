import { NextRequest } from 'next/server';
import { faceSearchQueue, queueEvents, clearActiveJob } from '@/lib/queue';
import type { JobStatus, JobResult, JobError } from '@/lib/types';
import { JobProgress } from 'bullmq';

export const dynamic = 'force-dynamic';

/**
 * Tunables
 */
const POLL_INTERVAL_MS = 2000; // How often to poll queue position
const KEEPALIVE_MS = 15000; // Keepalive ping interval (15s)

/**
 * GET /api/get-job?id=<jobId>
 * - Server-Sent Events (SSE) for job status, result, and error.
 * - Minimal changes to avoid breaking the frontend:
 *   * emits 'status' events with position updates (deduped)
 *   * emits 'result' on job completion
 *   * emits 'error' on job failure or internal error
 *   * emits 'ping' keepalive event periodically to avoid proxy idle timeouts
 */
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
      // --- Local state for the connection -------------------------------------------------
      let isClosed = false;
      let lastStatusSignature: string | null = null;
      let positionInterval: ReturnType<typeof setInterval> | null = null;
      let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

      // --- Helpers -----------------------------------------------------------------------
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
          // ignore
        }
      };

      const cleanupListeners = (completedListener: any, failedListener: any, progressListener?: any) => {
        try {
          if (positionInterval !== null) {
            clearInterval(positionInterval);
            positionInterval = null;
          }
          if (keepAliveInterval !== null) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
          queueEvents.off('completed', completedListener);
          queueEvents.off('failed', failedListener);
          if (progressListener) {
            queueEvents.off('progress', progressListener);
          }
        } catch (err) {
          // Best-effort cleanup
        }
      };

      // --- Main Flow --------------------------------------------------------------------
      try {
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

        const jobData = job.data;
        const state = await job.getState();

        // If job already finished
        if (state === 'completed') {
          const returnValue = job.returnvalue as FaceSearchResult[] | undefined;
          const result: JobResult = {
            result: returnValue || [],
            start_time: job.timestamp,
            finish_time: job.finishedOn || Date.now(),
            stage: jobData.stage,
          };
          sendEvent('result', result);
          await clearActiveJob(jobData.uid);
          closeConnection();
          return;
        }

        // If job already failed
        if (state === 'failed') {
          const error: JobError = {
            error: job.failedReason || 'Job processing failed',
            start_time: job.timestamp,
            finish_time: job.finishedOn || Date.now(),
            stage: jobData.stage,
          };
          sendEvent('error', error);
          await clearActiveJob(jobData.uid);
          closeConnection();
          return;
        }

        /**
         * sendPositionUpdate:
         * - Polls queue for waitingCount and position.
         * - Deduplicates emission to avoid event spam.
         */
        const sendPositionUpdate = async (): Promise<void> => {
          if (isClosed) return;
          try {
            // The waiting count and position checks are intentionally repeated to keep connection
            // state accurate across multiple connected clients.
            const waitingCount = await faceSearchQueue.getWaitingCount();
            const job = await faceSearchQueue.getJob(jobId);
            if (!job) {
              closeConnection();
              return;
            }

            const currentState = await job.getState();

            const waitingJobs = await faceSearchQueue.getWaiting();
            const position = waitingJobs.findIndex((j) => j.id === jobId);

            const status: JobStatus = {
              position: position >= 0 ? position + 1 : 1,
              total_size: waitingCount + 1,
              start_time: job.timestamp,
              stage: jobData.stage,
            };

            const statusSignature = JSON.stringify({
              position: status.position,
              total_size: status.total_size,
              state: currentState,
              stage: jobData.stage,
            });

            if (statusSignature === lastStatusSignature) {
              // Nothing changed — do not emit
              return;
            }

            lastStatusSignature = statusSignature;
            sendEvent('status', status);
          } catch (err) {
            console.error('Error sending position update:', err);
          }
        };

        // Start keepalive ping interval to avoid proxy idle timeout
        keepAliveInterval = setInterval(() => {
          if (isClosed) return;
          try {
            // Emit minimal payload; front-end should ignore if it's not used.
            controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
          } catch (err) {
            console.error('Error sending keepalive ping', err);
          }
        }, KEEPALIVE_MS);

        // Send initial position update, then set interval
        await sendPositionUpdate();
        positionInterval = setInterval(sendPositionUpdate, POLL_INTERVAL_MS);

        // Listener: job completed
        const completedListener = async ({ jobId: completedJobId }: { jobId: string }) => {
          if (completedJobId !== jobId || isClosed) return;

          cleanupListeners(completedListener, failedListener, progressListener);

          const job = await faceSearchQueue.getJob(jobId);
          if (!job) return;

          const returnValue = job.returnvalue as FaceSearchResult[] | undefined;
          const result: JobResult = {
            result: returnValue || [],
            start_time: job.timestamp,
            finish_time: job.finishedOn || Date.now(),
            stage: jobData.stage,
          };

          sendEvent('result', result);
          await clearActiveJob(jobData.uid);
          closeConnection();
        };

        // Listener: job failed
        const failedListener = async ({ jobId: failedJobId, failedReason }: { jobId: string; failedReason: string }) => {
          if (failedJobId !== jobId || isClosed) return;

          cleanupListeners(completedListener, failedListener, progressListener);

          const job = await faceSearchQueue.getJob(jobId);
          const error: JobError = {
            error: failedReason || 'Job processing failed',
            start_time: job?.timestamp || Date.now(),
            finish_time: job?.finishedOn || Date.now(),
            stage: jobData.stage,
          };

          sendEvent('error', error);
          await clearActiveJob(jobData.uid);
          closeConnection();
        };

        /**
         * Optional: job `progress` events (if queue emits),
         * broadcast to clients as a 'status' update – the front end already expects `status`.
         */
        const progressListener = async (args: { jobId: string; data: JobProgress }, _id?: string) => {
          const { jobId: progressJobId, data } = args;
          if (progressJobId !== jobId || isClosed) return;

          // Emit small progress update as 'status' with stage and progress if desired
          // Keep a stable payload consistent with existing 'status'
          try {
            const job = await faceSearchQueue.getJob(jobId);
            if (!job) return;

            // Normalize progress into a number if possible
            const progress = typeof data === 'number' ? data : (data as any)?.progress ?? undefined;

            // Keep the same status event type to avoid front-end changes
            const update: JobStatus = {
              position: undefined, // progress usually won't have position, keep undefined
              total_size: undefined,
              start_time: job.timestamp,
              stage: job.data?.stage,
            };
            sendEvent('status', { ...update, progress });
          } catch (err) {
            console.error('Error in progressListener', err);
          }
        };

        // Register listeners
        queueEvents.on('completed', completedListener);
        queueEvents.on('failed', failedListener);
        queueEvents.on('progress', progressListener);

        // Cleanup when client aborts (disconnects)
        request.signal.addEventListener('abort', () => {
          if (isClosed) return;
          cleanupListeners(completedListener, failedListener, progressListener);
          closeConnection();
        });
      } catch (internalError) {
        console.error('SSE Error:', internalError);
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

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/** Local types */
interface FaceSearchResult {
  id: string;
  score: number;
}