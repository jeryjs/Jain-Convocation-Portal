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
    <div className="flex flex-wrap gap-2">
      <button
        onClick={onPauseToggle}
        className={`px-4 py-2 rounded-lg font-medium transition-all backdrop-blur-sm ${
          isPaused
            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50'
        }`}
      >
        {isPaused ? '▶ Resume' : '⏸ Pause'}
      </button>

      <button
        onClick={onRefreshToggle}
        className={`px-4 py-2 rounded-lg font-medium transition-all backdrop-blur-sm ${
          autoRefresh
            ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50'
            : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 border border-gray-500/50'
        }`}
      >
        {autoRefresh ? '🔄 Auto' : '⏸ Manual'}
      </button>

      <button
        onClick={onManualRefresh}
        className="px-4 py-2 rounded-lg font-medium bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50 transition-all backdrop-blur-sm"
      >
        ↻ Sync
      </button>

      <button
        onClick={onCleanQueue}
        className="px-4 py-2 rounded-lg font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 transition-all backdrop-blur-sm"
      >
        ⌫ Clean
      </button>
    </div>
  );
}
