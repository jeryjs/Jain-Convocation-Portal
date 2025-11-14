'use client';

import { useState, useEffect } from 'react';
import StatsOverview from '@/components/StatsOverview';
import QueueKanban from '@/components/QueueKanban';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import QueueControls from '@/components/QueueControls';

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

export default function Home() {
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchQueueData = async () => {
    try {
      const response = await fetch('/api/admin/queue');
      const data = await response.json();
      setQueueData(data);
    } catch (error) {
      console.error('Error fetching queue data:', error);
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
    fetchPauseStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchQueueData();
      fetchPauseStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handlePauseToggle = async () => {
    try {
      const endpoint = '/api/admin/pause';
      const method = isPaused ? 'DELETE' : 'POST';
      
      await fetch(endpoint, { method });
      setIsPaused(!isPaused);
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  const handleCleanQueue = async () => {
    if (!confirm('Are you sure you want to clean completed and failed jobs?')) return;
    
    try {
      await fetch('/api/admin/clean', { method: 'POST' });
      fetchQueueData();
    } catch (error) {
      console.error('Error cleaning queue:', error);
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
    } catch (error) {
      console.error('Error performing job action:', error);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
      await fetch(`/api/admin/queue?jobId=${jobId}`, { method: 'DELETE' });
      fetchQueueData();
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-gray-400">Initializing Dashboard</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-[1920px] mx-auto space-y-4">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-4 md:p-6">
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
