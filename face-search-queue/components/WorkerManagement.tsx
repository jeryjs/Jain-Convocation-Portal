'use client';

import { useEffect, useState } from 'react';

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

const MAX_HISTORY_POINTS = 24;

type PerfSample = {
  cpu: number;
  ram: number;
  gpu: number | null;
};

export default function WorkerManagement({ workers, onRemoveWorker }: WorkerManagementProps) {
  const [pausingWorker, setPausingWorker] = useState<string | null>(null);
  const [perfHistory, setPerfHistory] = useState<Record<string, PerfSample[]>>({});

  useEffect(() => {
    setPerfHistory((prev) => {
      const next: Record<string, PerfSample[]> = {};
      workers.forEach((worker) => {
        const previousPoints = prev[worker.id] ?? [];
        const newPoint: PerfSample = {
          cpu: Number.isFinite(worker.cpu_percent) ? worker.cpu_percent : 0,
          ram: Number.isFinite(worker.ram_percent) ? worker.ram_percent : 0,
          gpu:
            worker.gpu_utilization !== undefined && Number.isFinite(worker.gpu_utilization)
              ? worker.gpu_utilization
              : null,
        };
        const updated = [...previousPoints, newPoint].slice(-MAX_HISTORY_POINTS);
        next[worker.id] = updated;
      });
      return next;
    });
  }, [workers]);

  const buildPath = (points: PerfSample[], key: keyof PerfSample) => {
    if (!points.length) return '';
    return points
      .map((point, idx) => {
        const rawValue = point[key] ?? 0;
        const value = typeof rawValue === 'number' ? Math.max(0, Math.min(100, rawValue)) : 0;
        const x = points.length === 1 ? 0 : (idx / (points.length - 1)) * 100;
        const y = 100 - value;
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

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
      <div className="glass rounded-2xl p-8 border border-blue-500/20">
        <h2 className="text-2xl font-black mb-6 text-transparent bg-linear-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text">🤖 Workers</h2>
        <div className="text-center py-16">
          <div className="text-7xl mb-6 animate-float">🤖</div>
          <div className="text-blue-300 mb-2 font-bold text-lg">No workers connected</div>
          <div className="text-xs text-blue-200/60">Start a worker to process jobs</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 md:p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-transparent bg-linear-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text">
          🤖 Workers ({onlineWorkers.length}/{workers.length})
        </h2>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-400/70 text-emerald-300 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20">
            ● {onlineWorkers.length} Online
          </div>
          {offlineWorkers.length > 0 && (
            <div className="px-4 py-2 bg-slate-600/30 border border-slate-500/70 text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-slate-500/10">
              ○ {offlineWorkers.length} Offline
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {workers.map((worker) => (
          <div
            key={worker.id}
            className={`glass rounded-xl border p-5 transition-all transform hover:scale-105 ${worker.status === 'online'
              ? 'border-emerald-500/50 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 bg-emerald-950/20'
              : 'border-slate-500/30 opacity-60 hover:opacity-80 bg-slate-950/20'
              }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${worker.status === 'online' ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-slate-500'}`}></div>
                  <div className="text-sm font-bold text-white truncate">{worker.hostname}</div>
                </div>
                <div className="text-[11px] text-blue-300/60 font-mono truncate" title={worker.id}>
                  {worker.id.slice(-14)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {worker.status === 'online' && (
                  <button
                    onClick={() => toggleWorkerPause(worker.id, worker.paused || false)}
                    disabled={pausingWorker === worker.id}
                    className={`text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold ${worker.paused
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
                  className="text-slate-400 hover:text-red-400 text-sm transition-all font-bold hover:scale-125"
                  title="Remove worker"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* GPU/CPU Info */}
            <div className="mb-4 pb-4 border-b border-blue-500/20 bg-blue-950/20 p-3 rounded-lg">
              <div className="text-xs text-blue-200 truncate font-mono" title={worker.gpu_name}>
                {worker.use_cpu ? '💻 CPU' : '🎮 GPU'}: {worker.gpu_name}
              </div>
              {worker.gpu_temperature && (
                <div className={`text-xs mt-2 font-bold ${getTemperatureColor(worker.gpu_temperature)}`}>
                  🌡️ {worker.gpu_temperature}°C
                </div>
              )}
            </div>

            {/* Metrics - Historical Overlay Chart */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] mb-2 font-bold">
                <span className="text-blue-200">Performance</span>
                <div className="flex gap-3 text-[10px]">
                  <span className="text-purple-300">CPU {worker.cpu_percent.toFixed(1)}%</span>
                  <span className="text-cyan-300">RAM {worker.ram_percent.toFixed(1)}%</span>
                  {worker.gpu_utilization !== undefined && (
                    <span className="text-pink-300">GPU {worker.gpu_utilization}%</span>
                  )}
                </div>
              </div>

              <div className="relative w-full h-34 bg-slate-950/60 rounded-lg overflow-hidden border border-blue-400/20">
                <div className="absolute inset-0 grid grid-cols-10 opacity-10 pointer-events-none">
                  {[...Array(10)].map((_, index) => (
                    <div key={index} className="border-r border-blue-200/20"></div>
                  ))}
                </div>
                <div className="absolute inset-0">
                  <div className="absolute top-1/4 left-0 right-0 h-px bg-blue-400/10"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-400/20"></div>
                  <div className="absolute top-3/4 left-0 right-0 h-px bg-blue-400/10"></div>
                </div>

                {(() => {
                  const history = perfHistory[worker.id] ?? [];
                  const sanitizedId = worker.id.replace(/[^a-zA-Z0-9]/g, '') || 'worker';
                  const cpuPath = buildPath(history, 'cpu');
                  const ramPath = buildPath(history, 'ram');
                  const hasGpuHistory = history.some((point) => point.gpu !== null);
                  const gpuPath = hasGpuHistory ? buildPath(history, 'gpu') : '';
                  const latestPoint = history.length ? history[history.length - 1] : null;

                  return (
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full"
                    >
                      <defs>
                        <linearGradient id={`cpuStroke-${sanitizedId}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.8" />
                        </linearGradient>
                        <linearGradient id={`ramStroke-${sanitizedId}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.8" />
                        </linearGradient>
                        <linearGradient id={`gpuStroke-${sanitizedId}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#f472b6" stopOpacity="0.8" />
                        </linearGradient>
                      </defs>

                      {gpuPath && (
                        <path
                          d={gpuPath}
                          fill="none"
                          stroke={`url(#gpuStroke-${sanitizedId})`}
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="drop-shadow-[0_0_6px_rgba(244,114,182,0.35)]"
                        />
                      )}

                      {ramPath && (
                        <path
                          d={ramPath}
                          fill="none"
                          stroke={`url(#ramStroke-${sanitizedId})`}
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="drop-shadow-[0_0_6px_rgba(103,232,249,0.35)]"
                        />
                      )}

                      {cpuPath && (
                        <path
                          d={cpuPath}
                          fill="none"
                          stroke={`url(#cpuStroke-${sanitizedId})`}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="drop-shadow-[0_0_6px_rgba(192,132,252,0.35)]"
                        />
                      )}

                      {latestPoint && (
                        <>
                          <circle
                            cx="100"
                            cy={100 - Math.max(0, Math.min(100, latestPoint.cpu ?? 0))}
                            r="1.4"
                            fill="#c084fc"
                          />
                          <circle
                            cx="100"
                            cy={100 - Math.max(0, Math.min(100, latestPoint.ram ?? 0))}
                            r="1.2"
                            fill="#67e8f9"
                          />
                          {latestPoint.gpu !== null && (
                            <circle
                              cx="100"
                              cy={100 - Math.max(0, Math.min(100, latestPoint.gpu ?? 0))}
                              r="1.2"
                              fill="#f472b6"
                            />
                          )}
                        </>
                      )}
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* Metrics Summary */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="glass rounded-lg p-3 text-center border border-emerald-500/20 hover:border-emerald-500/50 transition-all">
                <div className="text-sm text-emerald-400 font-bold">{worker.jobs_processed}</div>
                <div className="text-[10px] text-blue-200/70 uppercase tracking-wider font-semibold">Done</div>
              </div>
              <div className="glass rounded-lg p-3 text-center border border-red-500/20 hover:border-red-500/50 transition-all">
                <div className="text-sm text-red-400 font-bold">{worker.jobs_failed}</div>
                <div className="text-[10px] text-blue-200/70 uppercase tracking-wider font-semibold">Failed</div>
              </div>
              <div className="glass rounded-lg p-3 text-center border border-blue-500/20 hover:border-blue-500/50 transition-all">
                <div className="text-sm text-blue-400 font-bold">{formatUptime(worker.uptime)}</div>
                <div className="text-[10px] text-blue-200/70 uppercase tracking-wider font-semibold">Uptime</div>
              </div>
            </div>

            {/* Current Job */}
            {worker.current_job ? (
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 hover:bg-blue-500/30 transition-all">
                <div className="text-[10px] text-blue-300 uppercase tracking-widest font-bold mb-2">⚙️ Processing</div>
                <div className="text-[11px] text-blue-100 font-mono truncate hover:text-clip" title={worker.current_job}>
                  {worker.current_job.slice(-18)}
                </div>
              </div>
            ) : (
              <div className="bg-slate-600/20 border border-slate-500/30 rounded-lg p-3 text-center hover:bg-slate-600/30 transition-all">
                <div className="text-[11px] text-slate-300 font-bold">💤 Idle</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
