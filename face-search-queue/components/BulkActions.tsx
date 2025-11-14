'use client';

interface BulkActionsProps {
  onAction: (action: string) => void;
}

export default function BulkActions({ onAction }: BulkActionsProps) {
  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10">
      <h3 className="text-sm font-semibold text-gray-200 mb-3">Bulk Operations</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            if (confirm('Retry all failed jobs?')) {
              onAction('retry-failed');
            }
          }}
          className="text-xs px-3 py-1.5 bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded hover:bg-amber-500/30 transition-colors"
        >
          ↻ Retry All Failed
        </button>
        <button
          onClick={() => {
            if (confirm('Delete all failed jobs?')) {
              onAction('delete-failed');
            }
          }}
          className="text-xs px-3 py-1.5 bg-red-500/20 border border-red-500/50 text-red-300 rounded hover:bg-red-500/30 transition-colors"
        >
          ✗ Delete Failed
        </button>
        <button
          onClick={() => {
            if (confirm('Delete all completed jobs?')) {
              onAction('delete-completed');
            }
          }}
          className="text-xs px-3 py-1.5 bg-red-500/20 border border-red-500/50 text-red-300 rounded hover:bg-red-500/30 transition-colors"
        >
          ✗ Delete Completed
        </button>
      </div>
    </div>
  );
}
