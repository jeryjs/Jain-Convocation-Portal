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
    { label: 'Waiting', value: stats.waiting, color: 'bg-yellow-500' },
    { label: 'Active', value: stats.active, color: 'bg-blue-500' },
    { label: 'Completed', value: stats.completed, color: 'bg-green-500' },
    { label: 'Failed', value: stats.failed, color: 'bg-red-500' },
    { label: 'Delayed', value: stats.delayed, color: 'bg-purple-500' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Pie Chart Representation */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Queue Distribution</h3>
        
        <div className="flex justify-center mb-4">
          <div className="relative w-48 h-48">
            <svg className="transform -rotate-90 w-48 h-48">
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
                    
                    const colorMap: Record<string, string> = {
                      'bg-yellow-500': '#eab308',
                      'bg-blue-500': '#3b82f6',
                      'bg-green-500': '#22c55e',
                      'bg-red-500': '#ef4444',
                      'bg-purple-500': '#a855f7',
                    };
                    
                    acc.push(
                      <circle
                        key={item.label}
                        cx="96"
                        cy="96"
                        r={radius}
                        fill="none"
                        stroke={colorMap[item.color]}
                        strokeWidth="40"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    );
                    return acc;
                  }, [] as JSX.Element[])}
                </>
              ) : (
                <circle cx="96" cy="96" r="70" fill="none" stroke="#e5e7eb" strokeWidth="40" />
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">{totalJobs}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {chartData.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <span className="text-gray-700">{item.label}</span>
              </div>
              <span className="font-semibold text-gray-800">
                {item.value} ({totalJobs > 0 ? ((item.value / totalJobs) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Performance Metrics</h3>
        
        <div className="space-y-6">
          <div>
            <div className="text-sm text-gray-600 mb-2">Success Rate</div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-bold text-green-600">{completionRate}%</div>
              <div className="text-sm text-gray-500 mb-1">completion</div>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-2">Avg Processing Time</div>
            <div className="text-4xl font-bold text-blue-600">{avgProcessingTime}</div>
            <div className="text-xs text-gray-500 mt-1">per job</div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-2">Queue Health</div>
            <div className="flex gap-2">
              {stats.active > 0 && (
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  ⚡ Active
                </div>
              )}
              {stats.waiting > 5 && (
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  ⚠️ High Load
                </div>
              )}
              {stats.failed > 0 && (
                <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                  ❌ Errors
                </div>
              )}
              {stats.active === 0 && stats.waiting === 0 && (
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  ✅ Idle
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Recent Activity</h3>
        
        <div className="space-y-3">
          {[...jobs.completed, ...jobs.failed]
            .sort((a, b) => (b.finishedOn || 0) - (a.finishedOn || 0))
            .slice(0, 8)
            .map((job, index) => {
              const isSuccess = jobs.completed.includes(job);
              const duration = job.finishedOn ? ((job.finishedOn - job.timestamp) / 1000).toFixed(1) : '0';
              
              return (
                <div key={job.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gray-500 truncate">{job.id}</div>
                    <div className="text-xs text-gray-600">{duration}s</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(job.finishedOn || 0).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}
          
          {[...jobs.completed, ...jobs.failed].length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">
              No completed jobs yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
