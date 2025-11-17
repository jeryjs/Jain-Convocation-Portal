export interface QueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}

export interface Job {
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
}

export interface QueueData {
    stats: QueueStats;
    jobs: {
        waiting: Job[];
        active: Job[];
        completed: Job[];
        failed: Job[];
        delayed: Job[];
    };
}
