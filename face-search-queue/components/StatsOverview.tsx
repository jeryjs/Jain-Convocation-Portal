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
    { label: 'Waiting', value: stats.waiting, color: 'from-amber-500 to-yellow-500', border: 'border-amber-500/50', icon: '⏳', glow: 'from-amber-500/30 to-transparent' },
    { label: 'Active', value: stats.active, color: 'from-blue-500 to-cyan-500', border: 'border-blue-500/50', icon: '⚡', glow: 'from-blue-500/30 to-transparent' },
    { label: 'Completed', value: stats.completed, color: 'from-emerald-500 to-green-500', border: 'border-emerald-500/50', icon: '✓', glow: 'from-emerald-500/30 to-transparent' },
    { label: 'Failed', value: stats.failed, color: 'from-red-500 to-rose-500', border: 'border-red-500/50', icon: '✕', glow: 'from-red-500/30 to-transparent' },
    { label: 'Delayed', value: stats.delayed, color: 'from-purple-500 to-pink-500', border: 'border-purple-500/50', icon: '◷', glow: 'from-purple-500/30 to-transparent' },
  ];

  const total = stats.waiting + stats.active + stats.completed + stats.failed + stats.delayed;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className={`glass rounded-2xl p-5 border ${stat.border} hover:border-current group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-500/20 transform hover:scale-105`}
        >
          <div className={`absolute inset-0 bg-linear-to-b ${stat.glow} opacity-0 group-hover:opacity-60 transition-opacity`}></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl opacity-70 group-hover:opacity-100 transition-all transform group-hover:scale-110 group-hover:rotate-12">{stat.icon}</span>
              <div className={`w-3 h-3 rounded-full bg-linear-to-r ${stat.color} animate-pulse shadow-lg shadow-current/50`}></div>
            </div>
            <div className={`text-4xl font-black bg-linear-to-r ${stat.color} bg-clip-text text-transparent drop-shadow-lg`}>{stat.value}</div>
            <div className="text-xs text-blue-200/60 mt-2 uppercase tracking-widest font-bold">{stat.label}</div>
          </div>
        </div>
      ))}

      <div className="glass rounded-2xl p-5 border border-indigo-500/50 relative overflow-hidden group hover:shadow-lg hover:shadow-indigo-500/20 transform hover:scale-105 transition-all">
        {isPaused && (
          <div className="absolute top-2 right-2 text-[10px] bg-red-500/40 border border-red-400/70 px-2 py-1 rounded-full text-red-200 uppercase tracking-wider font-bold animate-pulse">
            Paused
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-b from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-60 transition-opacity"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl group-hover:scale-125 transition-transform">∑</span>
          </div>
          <div className="text-4xl font-black bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">{total}</div>
          <div className="text-xs text-blue-200/60 mt-2 uppercase tracking-widest font-bold">Total</div>
        </div>
      </div>
    </div>
  );
}
