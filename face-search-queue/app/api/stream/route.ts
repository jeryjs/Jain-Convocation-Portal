import { NextRequest } from 'next/server';
import { faceSearchQueue } from '@/lib/queue';
import redis from '@/lib/redis';
import { redisSubClient, QUEUE_UPDATES_CHANNEL } from '@/lib/pubsub';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-Sent Events endpoint for real-time updates
export async function GET(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            // Helper to send SSE message
            const sendEvent = (data: any) => {
                const message = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            // Send initial data
            try {
                const [
                    waitingCount,
                    activeCount,
                    completedCount,
                    failedCount,
                    delayedCount,
                    isPaused,
                    workersData,
                    waitingJobs,
                    activeJobs,
                    completedJobs,
                    failedJobs,
                    delayedJobs,
                ] = await Promise.all([
                    faceSearchQueue.getWaitingCount(),
                    faceSearchQueue.getActiveCount(),
                    faceSearchQueue.getCompletedCount(),
                    faceSearchQueue.getFailedCount(),
                    faceSearchQueue.getDelayedCount(),
                    faceSearchQueue.isPaused(),
                    redis.hgetall('workers'),
                    faceSearchQueue.getWaiting(0, 50),
                    faceSearchQueue.getActive(0, 50),
                    faceSearchQueue.getCompleted(0, 50),
                    faceSearchQueue.getFailed(0, 50),
                    faceSearchQueue.getDelayed(0, 50),
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

                const now = Date.now() / 1000;
                const workers = Object.entries(workersData).map(([id, data]) => {
                    const worker = JSON.parse(data);
                    const isOnline = (now - worker.last_heartbeat) < 15;
                    return { ...worker, status: isOnline ? 'online' : 'offline' };
                });

                // Send initial queue data
                sendEvent({
                    type: 'initial',
                    payload: {
                        stats: {
                            waiting: waitingCount,
                            active: activeCount,
                            completed: completedCount,
                            failed: failedCount,
                            delayed: delayedCount,
                        },
                        jobs: {
                            waiting: waitingJobs.map(formatJob),
                            active: activeJobs.map(formatJob),
                            completed: completedJobs.map(formatJob),
                            failed: failedJobs.map(formatJob),
                            delayed: delayedJobs.map(formatJob),
                        },
                        isPaused,
                        workers,
                    },
                });
            } catch (error) {
                console.error('Error sending initial data:', error);
            }

            // Subscribe to Redis pub/sub for updates
            const subscriber = redisSubClient.duplicate();
            await subscriber.subscribe(QUEUE_UPDATES_CHANNEL);

            subscriber.on('message', async (channel, message) => {
                if (channel !== QUEUE_UPDATES_CHANNEL) return;

                try {
                    const update = JSON.parse(message);

                    if (update.type === 'queue') {
                        // Fetch updated queue data
                        const [
                            waitingCount,
                            activeCount,
                            completedCount,
                            failedCount,
                            delayedCount,
                            waitingJobs,
                            activeJobs,
                            completedJobs,
                            failedJobs,
                            delayedJobs,
                        ] = await Promise.all([
                            faceSearchQueue.getWaitingCount(),
                            faceSearchQueue.getActiveCount(),
                            faceSearchQueue.getCompletedCount(),
                            faceSearchQueue.getFailedCount(),
                            faceSearchQueue.getDelayedCount(),
                            faceSearchQueue.getWaiting(0, 50),
                            faceSearchQueue.getActive(0, 50),
                            faceSearchQueue.getCompleted(0, 50),
                            faceSearchQueue.getFailed(0, 50),
                            faceSearchQueue.getDelayed(0, 50),
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

                        sendEvent({
                            type: 'queue-update',
                            payload: {
                                stats: {
                                    waiting: waitingCount,
                                    active: activeCount,
                                    completed: completedCount,
                                    failed: failedCount,
                                    delayed: delayedCount,
                                },
                                jobs: {
                                    waiting: waitingJobs.map(formatJob),
                                    active: activeJobs.map(formatJob),
                                    completed: completedJobs.map(formatJob),
                                    failed: failedJobs.map(formatJob),
                                    delayed: delayedJobs.map(formatJob),
                                },
                            },
                        });
                    } else if (update.type === 'workers') {
                        // Fetch updated workers data
                        const workersData = await redis.hgetall('workers');
                        const now = Date.now() / 1000;
                        const workers = Object.entries(workersData).map(([id, data]) => {
                            const worker = JSON.parse(data);
                            const isOnline = (now - worker.last_heartbeat) < 15;
                            return { ...worker, status: isOnline ? 'online' : 'offline' };
                        });

                        sendEvent({
                            type: 'workers-update',
                            payload: { workers },
                        });
                    } else if (update.type === 'pause') {
                        sendEvent({
                            type: 'pause-update',
                            payload: { isPaused: update.isPaused },
                        });
                    }
                } catch (error) {
                    console.error('Error handling Redis message:', error);
                }
            });

            // Handle client disconnect
            request.signal.addEventListener('abort', async () => {
                await subscriber.unsubscribe(QUEUE_UPDATES_CHANNEL);
                await subscriber.quit();
                controller.close();
            });

            // Keep-alive ping every 15 seconds
            const keepAlive = setInterval(() => {
                try {
                    sendEvent({ type: 'ping', timestamp: Date.now() });
                } catch (error) {
                    clearInterval(keepAlive);
                }
            }, 15000);

            request.signal.addEventListener('abort', () => {
                clearInterval(keepAlive);
            });
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
