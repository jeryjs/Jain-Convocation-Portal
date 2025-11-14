'use client';

import { JSX, useMemo } from 'react';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface Job {
  id: string;
  timestamp: number;
  finishedOn?: number;
}

interface AnalyticsChartsProps {
  stats: QueueStats;
  jobs: {
    waiting: Job[];
    active: Job[];
    completed: Job[];
    failed: Job[];
    delayed: Job[];
  };
}

export default function AnalyticsCharts({ stats, jobs }: AnalyticsChartsProps) {
  const totalJobs = stats.waiting + stats.active + stats.completed + stats.failed + stats.delayed;
  
  const completionRate = useMemo(() => {
    const completed = stats.completed + stats.failed;
    return completed > 0 ? ((stats.completed / completed) * 100).toFixed(1) : '0.0';
  }, [stats]);

  const avgProcessingTime = useMemo(() => {
    const completedJobs = [...jobs.completed, ...jobs.failed];
    if (completedJobs.length === 0) return '0s';
    
    const totalTime = completedJobs.reduce((sum, job) => {
      if (job.finishedOn) {
        return sum + (job.finishedOn - job.timestamp);
      }
      return sum;
    }, 0);
    
    const avgMs = totalTime / completedJobs.length;
    return `${(avgMs / 1000).toFixed(1)}s`;
  }, [jobs]);

  const chartData = [
    { label: 'Waiting', value: stats.waiting, color: 'from-amber-500 to-yellow-500', hexColor: '#f59e0b' },
    { label: 'Active', value: stats.active, color: 'from-blue-500 to-cyan-500', hexColor: '#3b82f6' },
    { label: 'Completed', value: stats.completed, color: 'from-emerald-500 to-green-500', hexColor: '#10b981' },
    { label: 'Failed', value: stats.failed, color: 'from-red-500 to-rose-500', hexColor: '#ef4444' },
    { label: 'Delayed', value: stats.delayed, color: 'from-purple-500 to-pink-500', hexColor: '#a855f7' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Distribution Chart */}
      <div className="backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Distribution</h3>
        
        <div className="flex justify-center mb-4">
          <div className="relative w-40 h-40">
            <svg className="transform -rotate-90 w-40 h-40">
              {totalJobs > 0 ? (
                <>
                  {chartData.reduce((acc, item, index) => {
                    const percentage = (item.value / totalJobs) * 100;
                    const prevPercentage = chartData
                      .slice(0, index)
                      .reduce((sum, i) => sum + (i.value / totalJobs) * 100, 0);
                    
                    const radius = 60;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((prevPercentage / 100) * circumference);
                    
                    acc.push(
                      <circle
                        key={item.label}
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        stroke={item.hexColor}
                        strokeWidth="28"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500"
                      />
                    );
                    return acc;
                  }, [] as JSX.Element[])}
                </>
              ) : (
                <circle cx="80" cy="80" r="60" fill="none" stroke="#374151" strokeWidth="28" />
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totalJobs}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Jobs</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {chartData.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${item.color}`}></div>
                <span className="text-gray-300 text-xs">{item.label}</span>
              </div>
              <span className="font-semibold text-gray-200 text-xs">
                {item.value} <span className="text-gray-500">({totalJobs > 0 ? ((item.value / totalJobs) * 100).toFixed(0) : 0}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Performance</h3>
        
        <div className="space-y-6">
          <div>
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Success Rate</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">{completionRate}%</div>
            </div>
            <div className="mt-2 w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-green-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Avg Processing</div>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{avgProcessingTime}</div>
          </div>

          <div>
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Status</div>
            <div className="flex flex-wrap gap-2">
              {stats.active > 0 && (
                <div className="px-2 py-1 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded text-[10px] font-medium uppercase tracking-wider">
                  Active
                </div>
              )}
              {stats.waiting > 5 && (
                <div className="px-2 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded text-[10px] font-medium uppercase tracking-wider">
                  High Load
                </div>
              )}
              {stats.failed > 0 && (
                <div className="px-2 py-1 bg-red-500/20 border border-red-500/50 text-red-300 rounded text-[10px] font-medium uppercase tracking-wider">
                  Errors
                </div>
              )}
              {stats.active === 0 && stats.waiting === 0 && (
                <div className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded text-[10px] font-medium uppercase tracking-wider">
                  Idle
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Recent Activity</h3>
        
        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
          {[...jobs.completed, ...jobs.failed]
            .sort((a, b) => (b.finishedOn || 0) - (a.finishedOn || 0))
            .slice(0, 8)
            .map((job) => {
              const isSuccess = jobs.completed.includes(job);
              const duration = job.finishedOn ? ((job.finishedOn - job.timestamp) / 1000).toFixed(1) : '0';
              
              return (
                <div key={job.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded transition-colors group">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'} ${isSuccess ? 'animate-pulse' : ''}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono text-gray-400 truncate group-hover:text-gray-300 transition-colors">{job.id}</div>
                    <div className="text-[10px] text-gray-500">{duration}s</div>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {new Date(job.finishedOn || 0).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          
          {[...jobs.completed, ...jobs.failed].length === 0 && (
            <div className="text-center text-gray-500 py-8 text-sm">
              No activity yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
