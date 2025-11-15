import { NextRequest } from 'next/server';
import { faceSearchQueue, queueEvents, clearActiveJob } from '@/lib/queue';
import type { JobStatus, JobResult, JobError } from '@/lib/types';

export const dynamic = 'force-dynamic';

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
      let isClosed = false;

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
        } catch (err) {
          // Already closed, ignore
        }
      };

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

        // If job is already completed or failed, send result immediately
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

        // Job is still in queue or processing, send position updates
        const sendPositionUpdate = async () => {
          if (isClosed) return;

          try {
            const waitingCount = await faceSearchQueue.getWaitingCount();
            const job = await faceSearchQueue.getJob(jobId);

            if (!job) {
              closeConnection();
              return;
            }

            const currentState = await job.getState();

            // Send position update
            // Find job position in the waiting queue
            const waitingJobs = await faceSearchQueue.getWaiting();
            const position = waitingJobs.findIndex(j => j.id === jobId);
            const status: JobStatus = {
              position: position >= 0 ? position + 1 : 1, // 1-based index, fallback to 1 if not found
              total_size: waitingCount + 1,
              start_time: job.timestamp,
              stage: jobData.stage,
            };
            sendEvent('status', status);
          } catch (err) {
            console.error('Error sending position update:', err);
          }
        };

        // Send initial position
        await sendPositionUpdate();

        // Set up interval for position updates
        const positionInterval = setInterval(sendPositionUpdate, 2000);

        // Listen for job completion
        const completedListener = async ({ jobId: completedJobId }: { jobId: string }) => {
          if (completedJobId !== jobId || isClosed) return;

          clearInterval(positionInterval);
          queueEvents.off('completed', completedListener);
          queueEvents.off('failed', failedListener);

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

        const failedListener = async ({ jobId: failedJobId, failedReason }: { jobId: string; failedReason: string }) => {
          if (failedJobId !== jobId || isClosed) return;

          clearInterval(positionInterval);
          queueEvents.off('completed', completedListener);
          queueEvents.off('failed', failedListener);

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

        queueEvents.on('completed', completedListener);
        // Cleanup on connection close
        request.signal.addEventListener('abort', () => {
          if (isClosed) return;
          clearInterval(positionInterval);
          queueEvents.off('completed', completedListener);
          queueEvents.off('failed', failedListener);
          closeConnection();
        });
      } catch (error) {
        console.error('SSE Error:', error);
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
      'Connection': 'keep-alive',
    },
  });
}

interface FaceSearchResult {
  id: string;
  score: number;
}
