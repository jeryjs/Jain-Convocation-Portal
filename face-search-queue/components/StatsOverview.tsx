'use client';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface StatsOverviewProps {
  stats: QueueStats;
  isPaused: boolean;
}

export default function StatsOverview({ stats, isPaused }: StatsOverviewProps) {
  const statCards = [
    { label: 'Waiting', value: stats.waiting, color: 'bg-yellow-500', icon: '⏳' },
    { label: 'Active', value: stats.active, color: 'bg-blue-500', icon: '⚡' },
    { label: 'Completed', value: stats.completed, color: 'bg-green-500', icon: '✅' },
    { label: 'Failed', value: stats.failed, color: 'bg-red-500', icon: '❌' },
    { label: 'Delayed', value: stats.delayed, color: 'bg-purple-500', icon: '⏰' },
  ];

  const total = stats.waiting + stats.active + stats.completed + stats.failed + stats.delayed;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">{stat.icon}</span>
            <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{stat.value}</div>
          <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
        </div>
      ))}

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl">📊</span>
          {isPaused && <span className="text-xs bg-white/30 px-2 py-1 rounded">PAUSED</span>}
        </div>
        <div className="text-3xl font-bold">{total}</div>
        <div className="text-sm opacity-90 mt-1">Total Jobs</div>
      </div>
    </div>
  );
}
