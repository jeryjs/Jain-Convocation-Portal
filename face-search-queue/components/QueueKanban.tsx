'use client';

import { useState } from 'react';

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

interface QueueKanbanProps {
  jobs: {
    waiting: Job[];
    active: Job[];
    completed: Job[];
    failed: Job[];
    delayed: Job[];
  };
  onJobAction: (jobId: string, action: string, priority?: number) => void;
  onDeleteJob: (jobId: string) => void;
}

export default function QueueKanban({ jobs, onJobAction, onDeleteJob }: QueueKanbanProps) {
  const columns = [
    { title: 'Waiting', jobs: jobs.waiting, color: 'amber', gradient: 'from-amber-500/20 to-yellow-500/20', border: 'border-amber-500/30' },
    { title: 'Active', jobs: jobs.active, color: 'blue', gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
    { title: 'Completed', jobs: jobs.completed, color: 'emerald', gradient: 'from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/30' },
    { title: 'Failed', jobs: jobs.failed, color: 'red', gradient: 'from-red-500/20 to-rose-500/20', border: 'border-red-500/30' },
    { title: 'Delayed', jobs: jobs.delayed, color: 'purple', gradient: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30' },
  ];

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (start?: number, end?: number) => {
    if (!start || !end) return null;
    const duration = Math.floor((end - start) / 1000);
    return `${duration}s`;
  };

  return (
    <div className="glass rounded-2xl p-4 md:p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all">
      <h2 className="text-2xl font-black mb-6 text-transparent bg-linear-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text">📊 Queue Pipeline</h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {columns.map((column) => (
          <div key={column.title} className="flex flex-col">
            <div className={`glass bg-linear-to-b ${column.gradient} rounded-t-xl px-4 py-3 border-b-2 ${column.border} hover:border-current transition-all`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">{column.title}</h3>
                <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-blue-200 text-xs font-bold border border-blue-400/30">
                  {column.jobs.length}
                </div>
              </div>
            </div>

            <div className="flex-1 glass rounded-b-xl p-3 space-y-2 min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar bg-slate-900/30">
              {column.jobs.length === 0 ? (
                <div className="text-center text-blue-300/50 py-12 text-xs font-semibold">
                  Empty
                </div>
              ) : (
                column.jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    status={column.title.toLowerCase()}
                    color={column.color}
                    onJobAction={onJobAction}
                    onDeleteJob={onDeleteJob}
                    formatTime={formatTime}
                    formatDuration={formatDuration}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface JobCardProps {
  job: Job;
  status: string; // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
  color: string;
  onJobAction: (jobId: string, action: string) => void;
  onDeleteJob: (jobId: string) => void;
  formatTime: (timestamp?: number) => string;
  formatDuration: (start?: number, end?: number) => string | null;
}

function JobCard({ job, status, color, onJobAction, onDeleteJob, formatTime, formatDuration }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);

  const colorMap: Record<string, string> = {
    amber: 'border-amber-500/50 hover:border-amber-500 hover:shadow-amber-500/20',
    blue: 'border-blue-500/50 hover:border-blue-500 hover:shadow-blue-500/20',
    emerald: 'border-emerald-500/50 hover:border-emerald-500 hover:shadow-emerald-500/20',
    red: 'border-red-500/50 hover:border-red-500 hover:shadow-red-500/20',
    purple: 'border-purple-500/50 hover:border-purple-500 hover:shadow-purple-500/20',
  };

  return (
    <div className={`glass rounded-xl border ${colorMap[color]} hover:bg-blue-500/10 hover:shadow-lg transition-all group transform hover:scale-102 cursor-pointer`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div onClick={() => setExpanded(!expanded)} className="flex-1 min-w-0">
            <div className="text-[11px] font-mono text-blue-300/60 truncate hover:text-blue-300 transition-colors" title={job.id}>
              #{job.id}
            </div>
            <div className="text-xs font-bold text-blue-100 mt-2">
              ...{job.data?.stage.slice(-35) || 'Processing'}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-300 hover:text-blue-100 ml-2 text-xs transition-all transform group-hover:rotate-90"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            ▶
          </button>
        </div>

        <div className="text-[11px] text-blue-200/60 space-y-1">
          <div className="flex justify-between items-center">
            <div className="truncate font-mono">{job.data?.uid.split('@')[0] + "@..." || 'Unknown'}</div>
            <div className="text-blue-300/70">{formatTime(job.timestamp)}</div>
            {job.attemptsMade > 0 && (
              <div className="text-amber-400 font-semibold">↻ Retry: {job.attemptsMade}</div>
            )}
          </div>
          {job.progress > 0 && job.progress < 100 && (
            <div className="mt-3">
              <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden border border-blue-400/30">
                <div
                  className="bg-linear-to-r from-blue-500 via-cyan-500 to-emerald-500 h-1.5 rounded-full transition-all duration-300 shadow-lg shadow-blue-500/50"
                  style={{ width: `${job.progress}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-blue-300 mt-1 font-bold">{job.progress}% Complete</div>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-blue-500/20 space-y-3 animate-fade-in">
            {job.processedOn && (
              <div className="text-[11px] text-blue-200/70 bg-blue-500/10 p-2 rounded border border-blue-500/20">
                ⚙️ Processed: {formatTime(job.processedOn)}
              </div>
            )}
            {job.finishedOn && (
              <div className="text-[11px] text-blue-200/70 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                ✓ Done: {formatTime(job.finishedOn)}
                {formatDuration(job.timestamp, job.finishedOn) && (
                  <span className="ml-1 text-emerald-300 font-semibold">({formatDuration(job.timestamp, job.finishedOn)})</span>
                )}
              </div>
            )}
            {job.failedReason && (
              <div className="text-[11px] text-red-300 bg-red-500/20 border border-red-500/50 p-2 rounded font-mono">
                ✗ {job.failedReason}
              </div>
            )}
            {job.returnvalue && Array.isArray(job.returnvalue) && (
              <div className="text-[11px] text-emerald-300 bg-emerald-500/20 border border-emerald-500/50 p-2 rounded">
                ✓ {job.returnvalue.length} match{job.returnvalue.length !== 1 ? 'es' : ''}
              </div>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              {status === 'waiting' && (
                <button
                  onClick={() => onJobAction(job.id, 'promote')}
                  className="text-[11px] px-3 py-1.5 bg-blue-500/30 border border-blue-400/70 text-blue-200 rounded-lg hover:bg-blue-500/50 transition-all font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-blue-500/30"
                  title="Move to front"
                >
                  ⬆ Promote
                </button>
              )}
              {status === 'failed' && (
                <button
                  onClick={() => onJobAction(job.id, 'retry')}
                  className="text-[11px] px-3 py-1.5 bg-amber-500/30 border border-amber-400/70 text-amber-200 rounded-lg hover:bg-amber-500/50 transition-all font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-amber-500/30"
                >
                  ↻ Retry
                </button>
              )}
              <button
                onClick={() => onDeleteJob(job.id)}
                hidden={status === 'completed' && job.returnvalue}
                className="text-[11px] px-3 py-1.5 bg-red-500/30 border border-red-400/70 text-red-200 rounded-lg hover:bg-red-500/50 transition-all font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-red-500/30"
              >
                ✗ Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
