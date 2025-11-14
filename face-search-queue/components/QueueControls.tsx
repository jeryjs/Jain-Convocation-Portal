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
    <div className="flex gap-3">
      <button
        onClick={onPauseToggle}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          isPaused
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-yellow-500 hover:bg-yellow-600 text-white'
        }`}
      >
        {isPaused ? '▶ Resume Queue' : '⏸ Pause Queue'}
      </button>

      <button
        onClick={onRefreshToggle}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          autoRefresh
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
        }`}
      >
        {autoRefresh ? '🔄 Auto-Refresh ON' : '⏸ Auto-Refresh OFF'}
      </button>

      <button
        onClick={onManualRefresh}
        className="px-4 py-2 rounded-lg font-medium bg-purple-500 hover:bg-purple-600 text-white transition-colors"
      >
        🔃 Refresh Now
      </button>

      <button
        onClick={onCleanQueue}
        className="px-4 py-2 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
      >
        🗑 Clean Queue
      </button>
    </div>
  );
}
