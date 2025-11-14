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
    <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 md:p-6 border border-white/10">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Queue Pipeline</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {columns.map((column) => (
          <div key={column.title} className="flex flex-col">
            <div className={`backdrop-blur-sm bg-linear-to-br ${column.gradient} rounded-t-lg px-3 py-2 border-b-2 ${column.border}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm">{column.title}</h3>
                <div className="px-2 py-0.5 rounded-full bg-white/10 text-gray-600 text-xs font-mono">
                  {column.jobs.length}
                </div>
              </div>
            </div>
            
            <div className="flex-1 bg-black/20 rounded-b-lg p-2 space-y-2 min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar">
              {column.jobs.length === 0 ? (
                <div className="text-center text-gray-600 py-12 text-xs">
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
  status: string;
  color: string;
  onJobAction: (jobId: string, action: string) => void;
  onDeleteJob: (jobId: string) => void;
  formatTime: (timestamp?: number) => string;
  formatDuration: (start?: number, end?: number) => string | null;
}

function JobCard({ job, status, color, onJobAction, onDeleteJob, formatTime, formatDuration }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);

  const colorMap: Record<string, string> = {
    amber: 'border-amber-500/50 hover:border-amber-500',
    blue: 'border-blue-500/50 hover:border-blue-500',
    emerald: 'border-emerald-500/50 hover:border-emerald-500',
    red: 'border-red-500/50 hover:border-red-500',
    purple: 'border-purple-500/50 hover:border-purple-500',
  };

  return (
    <div className={`backdrop-blur-sm bg-white/5 rounded-lg border ${colorMap[color]} hover:bg-white/10 transition-all group`}>
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-gray-500 truncate" title={job.id}>
              {job.id.slice(-12)}
            </div>
            <div className="text-xs font-semibold text-gray-600 mt-1">
              {job.data?.stage || 'N/A'}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-700 hover:text-gray-500 ml-2 text-xs transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            ▶
          </button>
        </div>

        <div className="text-[10px] text-gray-400 space-y-1">
          <div className="truncate">{job.data?.uid || 'Unknown'}</div>
          <div>{formatTime(job.timestamp)}</div>
          {job.attemptsMade > 0 && (
            <div className="text-amber-400">Retry: {job.attemptsMade}</div>
          )}
          {job.progress > 0 && job.progress < 100 && (
            <div className="mt-2">
              <div className="w-full bg-gray-300/50 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-linear-to-r from-blue-500 to-cyan-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                ></div>
              </div>
              <div className="text-[9px] text-gray-700 mt-0.5">{job.progress}%</div>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            {job.processedOn && (
              <div className="text-[10px] text-gray-400">
                ⚙ Processed: {formatTime(job.processedOn)}
              </div>
            )}
            {job.finishedOn && (
              <div className="text-[10px] text-gray-400">
                ✓ Done: {formatTime(job.finishedOn)}
                {formatDuration(job.timestamp, job.finishedOn) && (
                  <span className="ml-1 text-gray-500">({formatDuration(job.timestamp, job.finishedOn)})</span>
                )}
              </div>
            )}
            {job.failedReason && (
              <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/30 p-2 rounded">
                ✗ {job.failedReason}
              </div>
            )}
            {job.returnvalue && Array.isArray(job.returnvalue) && (
              <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-2 rounded">
                ✓ {job.returnvalue.length} match{job.returnvalue.length !== 1 ? 'es' : ''}
              </div>
            )}

            <div className="flex gap-1 mt-2 flex-wrap">
              {status === 'waiting' && (
                <button
                  onClick={() => onJobAction(job.id, 'promote')}
                  className="text-[10px] px-2 py-1 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded hover:bg-blue-500/30 transition-colors"
                  title="Move to front"
                >
                  ⬆ Promote
                </button>
              )}
              {status === 'failed' && (
                <button
                  onClick={() => onJobAction(job.id, 'retry')}
                  className="text-[10px] px-2 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded hover:bg-amber-500/30 transition-colors"
                >
                  ↻ Retry
                </button>
              )}
              <button
                onClick={() => onDeleteJob(job.id)}
                className="text-[10px] px-2 py-1 bg-red-500/20 border border-red-500/50 text-red-300 rounded hover:bg-red-500/30 transition-colors"
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
