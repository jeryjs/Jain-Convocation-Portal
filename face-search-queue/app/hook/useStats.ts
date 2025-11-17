'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface QueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}

interface Job {
    id: string;
    name: string;
    data: any;
    progress: number;
    attemptsMade: number;
    timestamp: number;
    processedOn?: number;
    finishedOn?: number;
    failedReason?: string;
    returnvalue?: any;
}

interface QueueData {
    stats: QueueStats;
    jobs: {
        waiting: Job[];
        active: Job[];
        completed: Job[];
        failed: Job[];
        delayed: Job[];
    };
}

interface ActionResponse {
    success: boolean;
    message: string;
}

export function useStats() {
    const [queueData, setQueueData] = useState<QueueData | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Connect to SSE stream for real-time updates
    const connectToStream = useCallback(() => {
        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        setLoading(true);
        setError(null);

        const eventSource = new EventSource('/api/stream');
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'initial') {
                    // Initial data received
                    setQueueData({
                        stats: data.payload.stats,
                        jobs: data.payload.jobs,
                    });
                    setIsPaused(data.payload.isPaused);
                    setLoading(false);
                } else if (data.type === 'queue-update') {
                    // Queue update
                    setQueueData({
                        stats: data.payload.stats,
                        jobs: data.payload.jobs,
                    });
                } else if (data.type === 'pause-update') {
                    // Pause status update
                    setIsPaused(data.payload.isPaused);
                } else if (data.type === 'ping') {
                    // Keep-alive ping, do nothing
                }
            } catch (err) {
                console.error('Error parsing SSE data:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE connection error:', err);
            eventSource.close();
            eventSourceRef.current = null;
            setError('Connection lost. Reconnecting...');

            // Attempt to reconnect after 3 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
                console.log('Attempting to reconnect to SSE stream...');
                connectToStream();
            }, 3000);
        };

        eventSource.onopen = () => {
            console.log('SSE connection established');
            setError(null);
        };
    }, []);

    // Set up SSE connection
    useEffect(() => {
        connectToStream();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [connectToStream]);

    // Actions - Toggle pause/resume
    const togglePause = useCallback(async (): Promise<ActionResponse> => {
        try {
            const newPausedState = !isPaused;

            // Optimistically update UI
            setIsPaused(newPausedState);

            const response = await fetch('/api/admin/pause', {
                method: newPausedState ? 'POST' : 'DELETE',
            });

            if (!response.ok) {
                // Revert on error
                setIsPaused(isPaused);
                throw new Error('Failed to toggle pause');
            }

            return {
                success: true,
                message: newPausedState ? 'Queue paused' : 'Queue resumed'
            };
        } catch (err) {
            console.error('Error toggling pause:', err);
            return { success: false, message: 'Failed to toggle pause' };
        }
    }, [isPaused]);

    // Clean queue (remove completed and failed jobs)
    const cleanQueue = useCallback(async (): Promise<ActionResponse> => {
        try {
            const response = await fetch('/api/admin/clean', { method: 'POST' });

            if (!response.ok) {
                throw new Error('Failed to clean queue');
            }

            const result = await response.json();
            return { success: true, message: result.message || 'Queue cleaned successfully' };
        } catch (err) {
            console.error('Error cleaning queue:', err);
            return { success: false, message: 'Failed to clean queue' };
        }
    }, []);

    // Perform action on a specific job (retry, promote, setPriority)
    const performJobAction = useCallback(async (
        jobId: string,
        action: string,
        priority?: number
    ): Promise<ActionResponse> => {
        try {
            const response = await fetch('/api/admin/queue', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, action, priority }),
            });

            if (!response.ok) {
                throw new Error('Failed to perform job action');
            }

            const result = await response.json();
            return { success: true, message: result.message || `Job ${action}d successfully` };
        } catch (err) {
            console.error('Error performing job action:', err);
            return { success: false, message: 'Failed to perform action' };
        }
    }, []);

    // Delete a specific job
    const deleteJob = useCallback(async (jobId: string): Promise<ActionResponse> => {
        try {
            const response = await fetch(`/api/admin/queue?jobId=${jobId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete job');
            }

            const result = await response.json();
            return { success: true, message: result.message || 'Job deleted successfully' };
        } catch (err) {
            console.error('Error deleting job:', err);
            return { success: false, message: 'Failed to delete job' };
        }
    }, []);

    // Perform bulk action (retry-failed, delete-failed, delete-completed)
    const performBulkAction = useCallback(async (action: string): Promise<ActionResponse> => {
        try {
            const response = await fetch('/api/admin/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });

            if (!response.ok) {
                throw new Error('Failed to perform bulk action');
            }

            const result = await response.json();
            return { success: true, message: result.message || 'Action completed' };
        } catch (err) {
            console.error('Error performing bulk action:', err);
            return { success: false, message: 'Failed to perform bulk action' };
        }
    }, []);

    // Refresh connection (reconnect to SSE stream)
    const refresh = useCallback(() => {
        connectToStream();
    }, [connectToStream]);

    return {
        queueData,
        isPaused,
        loading,
        error,
        togglePause,
        cleanQueue,
        performJobAction,
        deleteJob,
        performBulkAction,
        refresh,
    };
}
