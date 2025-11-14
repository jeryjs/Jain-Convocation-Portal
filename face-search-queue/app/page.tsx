'use client';

import { useState, useEffect } from 'react';
import StatsOverview from '@/components/StatsOverview';
import QueueKanban from '@/components/QueueKanban';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import QueueControls from '@/components/QueueControls';
import WorkerManagement from '@/components/WorkerManagement';
import BulkActions from '@/components/BulkActions';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import HelpModal from '@/components/HelpModal';
import { useToast } from '@/components/ToastProvider';

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

export default function Home() {
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { showToast } = useToast();

  const fetchQueueData = async () => {
    try {
      const response = await fetch('/api/admin/queue');
      const data = await response.json();
      setQueueData(data);
    } catch (error) {
      console.error('Error fetching queue data:', error);
      showToast('Failed to fetch queue data', 'error');
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await fetch('/api/admin/workers');
      const data = await response.json();
      setWorkers(data.workers || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const fetchPauseStatus = async () => {
    try {
      const response = await fetch('/api/admin/pause');
      const data = await response.json();
      setIsPaused(data.isPaused);
    } catch (error) {
      console.error('Error fetching pause status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    fetchWorkers();
    fetchPauseStatus();
  }, []);
  const handlePauseToggle = async () => {
    try {
      const endpoint = '/api/admin/pause';
      const method = isPaused ? 'DELETE' : 'POST';
      
      await fetch(endpoint, { method });
      setIsPaused(!isPaused);
      showToast(isPaused ? 'Queue resumed' : 'Queue paused', 'success');
    } catch (error) {
      console.error('Error toggling pause:', error);
      showToast('Failed to toggle pause', 'error');
    }
  };

  const handleCleanQueue = async () => {
    if (!confirm('Are you sure you want to clean completed and failed jobs?')) return;
    
    try {
      await fetch('/api/admin/clean', { method: 'POST' });
      fetchQueueData();
      showToast('Queue cleaned successfully', 'success');
    } catch (error) {
      console.error('Error cleaning queue:', error);
      showToast('Failed to clean queue', 'error');
    }
  };

  const handleJobAction = async (jobId: string, action: string, priority?: number) => {
    try {
      await fetch('/api/admin/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action, priority }),
      });
      fetchQueueData();
      showToast(`Job ${action}d successfully`, 'success');
    } catch (error) {
      console.error('Error performing job action:', error);
      showToast('Failed to perform action', 'error');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
      await fetch(`/api/admin/queue?jobId=${jobId}`, { method: 'DELETE' });
      fetchQueueData();
      showToast('Job deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting job:', error);
      showToast('Failed to delete job', 'error');
    }
  };

  const handleBulkAction = async (action: string) => {
    try {
      const response = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      fetchQueueData();
      showToast(data.message || 'Action completed', 'success');
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showToast('Failed to perform bulk action', 'error');
    }
  };

  const handleRemoveWorker = async (workerId: string) => {
    if (!confirm('Are you sure you want to remove this worker?')) return;
    
    try {
      await fetch(`/api/admin/workers?workerId=${workerId}`, { method: 'DELETE' });
      fetchWorkers();
      showToast('Worker removed successfully', 'success');
    } catch (error) {
      console.error('Error removing worker:', error);
      showToast('Failed to remove worker', 'error');
    }
  };

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchQueueData();
      fetchWorkers();
      fetchPauseStatus();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-gray-400">Initializing Dashboard</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-6">
      <KeyboardShortcuts
        onPauseToggle={handlePauseToggle}
        onRefresh={() => {
          fetchQueueData();
          fetchWorkers();
          fetchPauseStatus();
        }}
        onCleanQueue={handleCleanQueue}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
      />
      <HelpModal />
      
      <div className="max-w-[1920px] mx-auto space-y-4">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white rounded-xl border border-white/10 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Face Search Queue
              </h1>
              <p className="text-gray-400 mt-1 text-sm md:text-base">Real-time queue orchestration</p>
            </div>
            
            <QueueControls
              isPaused={isPaused}
              autoRefresh={autoRefresh}
              onPauseToggle={handlePauseToggle}
              onCleanQueue={handleCleanQueue}
              onRefreshToggle={() => setAutoRefresh(!autoRefresh)}
              onManualRefresh={() => {
                fetchQueueData();
                fetchPauseStatus();
              }}
            />
          </div>
        </div>

        {/* Stats Overview */}
        {queueData && <StatsOverview stats={queueData.stats} isPaused={isPaused} />}

        {/* Workers */}
        <WorkerManagement workers={workers} onRemoveWorker={handleRemoveWorker} />

        {/* Bulk Actions */}
        <BulkActions onAction={handleBulkAction} />

        {/* Analytics Charts */}
        {queueData && <AnalyticsCharts stats={queueData.stats} jobs={queueData.jobs} />}

        {/* Kanban Board */}
        {queueData && (
          <QueueKanban
            jobs={queueData.jobs}
            onJobAction={handleJobAction}
            onDeleteJob={handleDeleteJob}
          />
        )}
      </div>
    </div>
  );
}
