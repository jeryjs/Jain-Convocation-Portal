'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface WorkerInfo {
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
    paused?: boolean;
}

interface ActionResponse {
    success: boolean;
    message: string;
}

export function useWorkers() {
    const [workers, setWorkers] = useState<WorkerInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Connect to SSE stream for real-time worker updates
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
                    setWorkers(data.payload.workers || []);
                    setLoading(false);
                } else if (data.type === 'workers-update') {
                    // Workers update
                    setWorkers(data.payload.workers || []);
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
            console.log('SSE connection established (Workers)');
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

    // Remove worker
    const removeWorker = useCallback(async (workerId: string): Promise<ActionResponse> => {
        try {
            const response = await fetch(`/api/admin/workers?workerId=${workerId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to remove worker');
            }

            const result = await response.json();
            return { success: true, message: result.message || 'Worker removed successfully' };
        } catch (err) {
            console.error('Error removing worker:', err);
            return { success: false, message: 'Failed to remove worker' };
        }
    }, []);

    // Refresh connection (reconnect to SSE stream)
    const refresh = useCallback(() => {
        connectToStream();
    }, [connectToStream]);

    return {
        workers,
        loading,
        error,
        removeWorker,
        refresh,
    };
}
