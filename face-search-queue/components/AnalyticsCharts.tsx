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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Distribution Chart */}
      <div className="glass rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all">
        <h3 className="text-lg font-bold mb-6 text-transparent bg-linear-to-r from-blue-300 to-purple-300 bg-clip-text">📊 Distribution</h3>

        <div className="flex justify-center mb-6">
          <div className="relative w-48 h-48">
            <svg className="transform -rotate-90 w-48 h-48 drop-shadow-lg">
              {totalJobs > 0 ? (
                <>
                  {chartData.reduce((acc, item, index) => {
                    const percentage = (item.value / totalJobs) * 100;
                    const prevPercentage = chartData
                      .slice(0, index)
                      .reduce((sum, i) => sum + (i.value / totalJobs) * 100, 0);

                    const radius = 70;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((prevPercentage / 100) * circumference);

                    acc.push(
                      <circle
                        key={item.label}
                        cx="96"
                        cy="96"
                        r={radius}
                        fill="none"
                        stroke={item.hexColor}
                        strokeWidth="32"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500 drop-shadow-lg"
                        style={{ filter: `drop-shadow(0 0 8px ${item.hexColor}40)` }}
                      />
                    );
                    return acc;
                  }, [] as JSX.Element[])}
                </>
              ) : (
                <circle cx="96" cy="96" r="70" fill="none" stroke="#475569" strokeWidth="32" />
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-black text-transparent bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text drop-shadow-lg">{totalJobs}</div>
                <div className="text-[11px] text-blue-300 uppercase tracking-widest font-bold">Jobs</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {chartData.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-blue-500/10 transition-all group">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full bg-linear-to-r ${item.color} group-hover:scale-125 transition-transform shadow-lg shadow-current/50`}></div>
                <span className="text-blue-100 text-xs font-semibold">{item.label}</span>
              </div>
              <span className="font-bold text-blue-300 text-xs">
                {item.value} <span className="text-blue-400/70">({totalJobs > 0 ? ((item.value / totalJobs) * 100).toFixed(0) : 0}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="glass rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all">
        <h3 className="text-lg font-bold mb-6 text-transparent bg-linear-to-r from-blue-300 to-purple-300 bg-clip-text">⚡ Performance</h3>

        <div className="space-y-8">
          <div>
            <div className="text-xs text-blue-300 mb-3 uppercase tracking-wider font-bold">Success Rate</div>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-black bg-linear-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent drop-shadow-lg">{completionRate}%</div>
            </div>
            <div className="mt-3 w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden border border-emerald-400/30">
              <div
                className="bg-linear-to-r from-emerald-500 to-green-500 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/50"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="text-xs text-blue-300 mb-3 uppercase tracking-wider font-bold">Avg Processing</div>
            <div className="text-5xl font-black bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">{avgProcessingTime}</div>
          </div>

          <div>
            <div className="text-xs text-blue-300 mb-3 uppercase tracking-wider font-bold">Status</div>
            <div className="flex flex-wrap gap-2">
              {stats.active > 0 && (
                <div className="px-3 py-2 bg-blue-500/30 border border-blue-400/70 text-blue-200 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-blue-500/50 transition-all">
                  ⚡ Active
                </div>
              )}
              {stats.waiting > 5 && (
                <div className="px-3 py-2 bg-amber-500/30 border border-amber-400/70 text-amber-200 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-amber-500/50 transition-all">
                  📈 High Load
                </div>
              )}
              {stats.failed > 0 && (
                <div className="px-3 py-2 bg-red-500/30 border border-red-400/70 text-red-200 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-red-500/50 transition-all">
                  ⚠️ Errors
                </div>
              )}
              {stats.active === 0 && stats.waiting === 0 && (
                <div className="px-3 py-2 bg-emerald-500/30 border border-emerald-400/70 text-emerald-200 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500/50 transition-all">
                  ✓ Idle
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="glass rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all">
        <h3 className="text-lg font-bold mb-6 text-transparent bg-linear-to-r from-blue-300 to-purple-300 bg-clip-text">📝 Recent Activity</h3>

        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
          {[...jobs.completed, ...jobs.failed]
            .sort((a, b) => (b.finishedOn || 0) - (a.finishedOn || 0))
            .slice(0, 10)
            .map((job) => {
              const isSuccess = jobs.completed.includes(job);
              const duration = job.finishedOn ? ((job.finishedOn - job.timestamp) / 1000).toFixed(1) : '0';

              return (
                <div key={job.id} className="flex items-center gap-3 p-3 hover:bg-blue-500/10 rounded-lg transition-all group border border-transparent hover:border-blue-500/30">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isSuccess ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono text-blue-200/80 truncate group-hover:text-blue-200 transition-colors">{job.id.slice(-16)}</div>
                    <div className="text-[10px] text-blue-300/60">{duration}s</div>
                  </div>
                  <div className="text-[10px] text-blue-300/60 whitespace-nowrap">
                    {new Date(job.finishedOn || 0).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}

          {[...jobs.completed, ...jobs.failed].length === 0 && (
            <div className="text-center text-blue-300/50 py-12 text-sm font-semibold">
              No activity yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
