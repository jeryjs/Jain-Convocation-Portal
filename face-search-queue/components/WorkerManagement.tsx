'use client';

import { useState } from 'react';

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
  paused?: boolean;
}

interface WorkerManagementProps {
  workers: WorkerInfo[];
  onRemoveWorker: (workerId: string) => void;
}

export default function WorkerManagement({ workers, onRemoveWorker }: WorkerManagementProps) {
  const [pausingWorker, setPausingWorker] = useState<string | null>(null);
  
  const onlineWorkers = workers.filter(w => w.status === 'online');
  const offlineWorkers = workers.filter(w => w.status === 'offline');
  
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };
  
  const getTemperatureColor = (temp?: number) => {
    if (!temp) return 'text-gray-400';
    if (temp < 60) return 'text-emerald-400';
    if (temp < 75) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getUtilizationColor = (util: number) => {
    if (util < 50) return 'from-emerald-500 to-green-500';
    if (util < 80) return 'from-yellow-500 to-amber-500';
    return 'from-red-500 to-rose-500';
  };
  
  const toggleWorkerPause = async (workerId: string, currentlyPaused: boolean) => {
    setPausingWorker(workerId);
    try {
      const endpoint = currentlyPaused ? '/api/admin/workers/resume' : '/api/admin/workers/pause';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle worker pause');
      }
      
      // Refresh will happen via polling
    } catch (error) {
      console.error('Error toggling worker pause:', error);
      alert('Failed to toggle worker pause');
    } finally {
      setPausingWorker(null);
    }
  };
  
  if (workers.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-bold mb-4 text-gray-200">Workers</h2>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🤖</div> 
          <div className="text-gray-400 mb-2">No workers connected</div>
          <div className="text-xs text-gray-500">Start a worker to process jobs</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 md:p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-black">
          Workers ({onlineWorkers.length}/{workers.length})
        </h2>
        <div className="flex gap-2">
          <div className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded text-xs">
            {onlineWorkers.length} Online
          </div>
          {offlineWorkers.length > 0 && (
            <div className="px-2 py-1 bg-gray-500/20 border border-gray-500/50 text-gray-400 rounded text-xs">
              {offlineWorkers.length} Offline
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {workers.map((worker) => (
          <div
            key={worker.id}
            className={`backdrop-blur-sm bg-white/5 rounded-lg border p-4 transition-all ${
              worker.status === 'online'
                ? 'border-emerald-500/50 hover:border-emerald-500'
                : 'border-gray-500/30 opacity-60'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${worker.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <div className="text-sm font-semibold text-black truncate">{worker.hostname}</div>
                </div>
                <div className="text-[10px] text-gray-400 font-mono truncate" title={worker.id}>
                  {worker.id}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {worker.status === 'online' && (
                  <button
                    onClick={() => toggleWorkerPause(worker.id, worker.paused || false)}
                    disabled={pausingWorker === worker.id}
                    className={`text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      worker.paused
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-yellow-400 hover:text-yellow-300'
                    }`}
                    title={worker.paused ? 'Resume worker' : 'Pause worker'}
                  >
                    {pausingWorker === worker.id ? '⏳' : worker.paused ? '▶️' : '⏸️'}
                  </button>
                )}
                <button
                  onClick={() => onRemoveWorker(worker.id)}
                  className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                  title="Remove worker"
                >
                  ✗
                </button>
              </div>
            </div>
            
            {/* GPU/CPU Info */}
            <div className="mb-3 pb-3 border-b border-white/10">
              <div className="text-xs text-black truncate" title={worker.gpu_name}>
                {worker.use_cpu ? '💻' : '🎮'} {worker.gpu_name}
              </div>
              {worker.gpu_temperature && (
                <div className={`text-xs mt-1 ${getTemperatureColor(worker.gpu_temperature)}`}>
                  🌡️ {worker.gpu_temperature}°C
                </div>
              )}
            </div>
            
            {/* Metrics */}
            <div className="space-y-2 mb-3">
              {/* CPU */}
              <div>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-gray-700">CPU</span>
                  <span className="text-gray-600">{worker.cpu_percent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`bg-linear-to-r ${getUtilizationColor(worker.cpu_percent)} h-1.5 rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(worker.cpu_percent, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              {/* RAM */}
              <div>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-gray-700">RAM</span>
                  <span className="text-gray-600">{worker.ram_percent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`bg-linear-to-r ${getUtilizationColor(worker.ram_percent)} h-1.5 rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(worker.ram_percent, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              {/* GPU Utilization */}
              {worker.gpu_utilization !== undefined && (
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-gray-700">GPU</span>
                    <span className="text-gray-600">{worker.gpu_utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`bg-linear-to-r ${getUtilizationColor(worker.gpu_utilization)} h-1.5 rounded-full transition-all duration-300`}
                      style={{ width: `${Math.min(worker.gpu_utilization, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Metrics Summary */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-black/20 rounded p-2 text-center">
                <div className="text-xs text-emerald-400 font-bold">{worker.jobs_processed}</div>
                <div className="text-[9px] text-gray-700">Processed</div>
              </div>
              <div className="bg-black/20 rounded p-2 text-center">
                <div className="text-xs text-red-400 font-bold">{worker.jobs_failed}</div>
                <div className="text-[9px] text-gray-700">Failed</div>
              </div>
              <div className="bg-black/20 rounded p-2 text-center">
                <div className="text-xs text-blue-400 font-bold">{formatUptime(worker.uptime)}</div>
                <div className="text-[9px] text-gray-700">Uptime</div>
              </div>
            </div>

            {/* Current Job */}
            {worker.current_job ? (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                <div className="text-[9px] text-blue-400 uppercase tracking-wider mb-1">Processing</div>
                <div className="text-[10px] text-gray-300 font-mono truncate" title={worker.current_job}>
                  {worker.current_job.slice(-16)}
                </div>
              </div>
            ) : (
              <div className="bg-gray-500/10 border border-gray-500/30 rounded p-2 text-center">
                <div className="text-[10px] text-black">Idle</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
