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
    { label: 'Waiting', value: stats.waiting, color: 'from-amber-500 to-yellow-500', border: 'border-amber-500/50', icon: '⏳' },
    { label: 'Active', value: stats.active, color: 'from-blue-500 to-cyan-500', border: 'border-blue-500/50', icon: '⚡' },
    { label: 'Completed', value: stats.completed, color: 'from-emerald-500 to-green-500', border: 'border-emerald-500/50', icon: '✓' },
    { label: 'Failed', value: stats.failed, color: 'from-red-500 to-rose-500', border: 'border-red-500/50', icon: '✕' },
    { label: 'Delayed', value: stats.delayed, color: 'from-purple-500 to-pink-500', border: 'border-purple-500/50', icon: '◷' },
  ];

  const total = stats.waiting + stats.active + stats.completed + stats.failed + stats.delayed;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className={`backdrop-blur-xl bg-white rounded-xl p-4 border ${stat.border} hover:bg-gray-100 transition-all group`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl opacity-70 group-hover:opacity-100 transition-opacity">{stat.icon}</span>
            <div className={`w-2 h-2 rounded-full bg-linear-to-r ${stat.color} animate-pulse`}></div>
          </div>
          <div className={`text-3xl font-bold bg-linear-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</div>
          <div className="text-xs text-gray-900 mt-1 uppercase tracking-wider">{stat.label}</div>
        </div>
      ))}

      <div className="backdrop-blur-xl bg-white rounded-xl p-4 border border-indigo-500/50 relative overflow-hidden">
        {isPaused && (
          <div className="absolute top-2 right-2 text-[10px] bg-red-500/30 border border-red-500/50 px-2 py-0.5 rounded-full text-red-300 uppercase tracking-wider">Paused</div>
        )}
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">∑</span>
        </div>
        <div className="text-3xl font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{total}</div>
        <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Total</div>
      </div>
    </div>
  );
}
