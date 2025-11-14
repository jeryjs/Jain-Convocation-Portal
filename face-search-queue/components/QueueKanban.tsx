'use client';

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
    { title: 'Waiting', jobs: jobs.waiting, color: 'border-yellow-400', bgColor: 'bg-yellow-50' },
    { title: 'Active', jobs: jobs.active, color: 'border-blue-400', bgColor: 'bg-blue-50' },
    { title: 'Completed', jobs: jobs.completed, color: 'border-green-400', bgColor: 'bg-green-50' },
    { title: 'Failed', jobs: jobs.failed, color: 'border-red-400', bgColor: 'bg-red-50' },
    { title: 'Delayed', jobs: jobs.delayed, color: 'border-purple-400', bgColor: 'bg-purple-50' },
  ];

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (start?: number, end?: number) => {
    if (!start || !end) return null;
    const duration = Math.floor((end - start) / 1000);
    return `${duration}s`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Queue Jobs</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {columns.map((column) => (
          <div key={column.title} className="flex flex-col">
            <div className={`${column.bgColor} rounded-t-lg px-4 py-3 border-b-4 ${column.color}`}>
              <h3 className="font-semibold text-gray-800">
                {column.title} ({column.jobs.length})
              </h3>
            </div>
            
            <div className="flex-1 bg-gray-50 rounded-b-lg p-2 space-y-2 min-h-[400px] max-h-[600px] overflow-y-auto">
              {column.jobs.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No jobs</div>
              ) : (
                column.jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    status={column.title.toLowerCase()}
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
  onJobAction: (jobId: string, action: string) => void;
  onDeleteJob: (jobId: string) => void;
  formatTime: (timestamp?: number) => string;
  formatDuration: (start?: number, end?: number) => string | null;
}

function JobCard({ job, status, onJobAction, onDeleteJob, formatTime, formatDuration }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-gray-500 truncate" title={job.id}>
              {job.id}
            </div>
            <div className="text-sm font-semibold text-gray-800 mt-1">
              {job.data?.stage || 'N/A'}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          <div>🆔 {job.data?.uid || 'Unknown'}</div>
          <div>🕐 {formatTime(job.timestamp)}</div>
          {job.attemptsMade > 0 && (
            <div>🔄 Attempts: {job.attemptsMade}</div>
          )}
          {job.progress > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${job.progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            {job.processedOn && (
              <div className="text-xs text-gray-600">
                ⚙️ Processed: {formatTime(job.processedOn)}
              </div>
            )}
            {job.finishedOn && (
              <div className="text-xs text-gray-600">
                ✅ Finished: {formatTime(job.finishedOn)}
                {formatDuration(job.timestamp, job.finishedOn) && (
                  <span className="ml-1">({formatDuration(job.timestamp, job.finishedOn)})</span>
                )}
              </div>
            )}
            {job.failedReason && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                ❌ {job.failedReason}
              </div>
            )}
            {job.returnvalue && (
              <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                ✅ Results: {job.returnvalue.length || 0} matches
              </div>
            )}

            <div className="flex gap-1 mt-2 flex-wrap">
              {status === 'waiting' && (
                <button
                  onClick={() => onJobAction(job.id, 'promote')}
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  title="Move to front of queue"
                >
                  ⬆ Promote
                </button>
              )}
              {status === 'failed' && (
                <button
                  onClick={() => onJobAction(job.id, 'retry')}
                  className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  🔄 Retry
                </button>
              )}
              <button
                onClick={() => onDeleteJob(job.id)}
                className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                🗑 Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
