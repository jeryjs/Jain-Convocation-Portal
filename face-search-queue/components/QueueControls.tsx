'use client';

interface QueueControlsProps {
  isPaused: boolean;
  autoRefresh: boolean;
  onPauseToggle: () => void;
  onCleanQueue: () => void;
  onRefreshToggle: () => void;
  onManualRefresh: () => void;
}

export default function QueueControls({
  isPaused,
  autoRefresh,
  onPauseToggle,
  onCleanQueue,
  onRefreshToggle,
  onManualRefresh,
}: QueueControlsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={onPauseToggle}
        className={`px-5 py-2.5 rounded-lg font-bold transition-all backdrop-blur-sm relative group overflow-hidden ${isPaused
          ? 'bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-300 border border-emerald-400/70 shadow-lg shadow-emerald-500/20'
          : 'bg-amber-500/30 hover:bg-amber-500/50 text-amber-300 border border-amber-400/70 shadow-lg shadow-amber-500/20'
          }`}
      >
        <span className="relative z-10">{isPaused ? '▶ Resume' : '⏸ Pause'}</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-full group-hover:translate-x-0 transition-transform"></div>
      </button>

      <button
        onClick={onRefreshToggle}
        className={`px-5 py-2.5 rounded-lg font-bold transition-all backdrop-blur-sm relative group overflow-hidden ${autoRefresh
          ? 'bg-blue-500/30 hover:bg-blue-500/50 text-blue-300 border border-blue-400/70 shadow-lg shadow-blue-500/20'
          : 'bg-slate-600/30 hover:bg-slate-600/50 text-slate-300 border border-slate-500/70 shadow-lg shadow-slate-500/10'
          }`}
      >
        <span className="relative z-10">{autoRefresh ? '🔄 Auto' : '⏸ Manual'}</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-full group-hover:translate-x-0 transition-transform"></div>
      </button>

      <button
        onClick={onManualRefresh}
        className="px-5 py-2.5 rounded-lg font-bold bg-purple-500/30 hover:bg-purple-500/50 text-purple-300 border border-purple-400/70 transition-all backdrop-blur-sm relative group overflow-hidden shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95"
      >
        <span className="relative z-10">↻ Sync</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-full group-hover:translate-x-0 transition-transform"></div>
      </button>

      <button
        onClick={onCleanQueue}
        className="px-5 py-2.5 rounded-lg font-bold bg-red-500/30 hover:bg-red-500/50 text-red-300 border border-red-400/70 transition-all backdrop-blur-sm relative group overflow-hidden shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95"
      >
        <span className="relative z-10">⌫ Clean</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-full group-hover:translate-x-0 transition-transform"></div>
      </button>
    </div>
  );
}
