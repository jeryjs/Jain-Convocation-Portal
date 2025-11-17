'use client';

import { useState } from 'react';
import StatsOverview from '@/components/StatsOverview';
import QueueKanban from '@/components/QueueKanban';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import QueueControls from '@/components/QueueControls';
import WorkerManagement from '@/components/WorkerManagement';
import BulkActions from '@/components/BulkActions';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import HelpModal from '@/components/HelpModal';
import { useToast } from '@/components/ToastProvider';
import { useStats } from '@/app/hook/useStats';
import { useWorkers } from '@/app/hook/useWorkers';

export default function Home() {
  const { showToast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Use custom hooks for all data and actions
  const {
    queueData,
    isPaused,
    loading: statsLoading,
    error: statsError,
    togglePause,
    cleanQueue,
    performJobAction,
    deleteJob,
    performBulkAction,
    refresh: refreshStats,
  } = useStats();

  const {
    workers,
    loading: workersLoading,
    error: workersError,
    removeWorker,
    refresh: refreshWorkers,
  } = useWorkers();

  const loading = statsLoading || workersLoading;

  // Handle actions with toast notifications
  const handlePauseToggle = async () => {
    const result = await togglePause();
    showToast(result.message, result.success ? 'success' : 'error');
  };

  const handleCleanQueue = async () => {
    if (!confirm('Are you sure you want to clean completed and failed jobs?')) return;
    const result = await cleanQueue();
    showToast(result.message, result.success ? 'success' : 'error');
  };

  const handleJobAction = async (jobId: string, action: string, priority?: number) => {
    const result = await performJobAction(jobId, action, priority);
    showToast(result.message, result.success ? 'success' : 'error');
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    const result = await deleteJob(jobId);
    showToast(result.message, result.success ? 'success' : 'error');
  };

  const handleBulkAction = async (action: string) => {
    const result = await performBulkAction(action);
    showToast(result.message, result.success ? 'success' : 'error');
  };

  const handleRemoveWorker = async (workerId: string) => {
    if (!confirm('Are you sure you want to remove this worker?')) return;
    const result = await removeWorker(workerId);
    showToast(result.message, result.success ? 'success' : 'error');
  };

  const handleManualRefresh = () => {
    refreshStats();
    refreshWorkers();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-spin blur"></div>
            <div className="absolute inset-1 bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 rounded-full"></div>
            <div className="absolute inset-2 border-4 border-transparent border-t-blue-400 border-r-purple-400 rounded-full animate-spin"></div>
          </div>
          <div className="text-lg font-bold text-transparent bg-linear-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text animate-pulse">
            Initializing Dashboard
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-4 md:p-6">
      <KeyboardShortcuts
        onPauseToggle={handlePauseToggle}
        onRefresh={handleManualRefresh}
        onCleanQueue={handleCleanQueue}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
      />
      <HelpModal />

      <div className="max-w-[1920px] mx-auto space-y-4">
        {/* Header */}
        <div className="glass rounded-2xl p-4 md:p-8 border border-blue-500/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-linear-to-r from-blue-500/0 via-purple-500/10 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-5xl md:text-6xl font-black gradient-text drop-shadow-lg animate-pulse-glow">
                Face Search Queue
              </h1>
              <p className="text-blue-200/70 mt-2 text-sm md:text-base font-medium">Real-time queue orchestration & worker management</p>
            </div>

            <QueueControls
              isPaused={isPaused}
              autoRefresh={autoRefresh}
              onPauseToggle={handlePauseToggle}
              onCleanQueue={handleCleanQueue}
              onRefreshToggle={() => setAutoRefresh(!autoRefresh)}
              onManualRefresh={handleManualRefresh}
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
