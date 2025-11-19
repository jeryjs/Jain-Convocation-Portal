'use client';

import { useState } from 'react';

export default function HelpModal() {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { key: 'Ctrl/Cmd + P', action: 'Pause/Resume queue' },
    { key: 'Ctrl/Cmd + R', action: 'Refresh data' },
    { key: 'Ctrl/Cmd + K', action: 'Clean queue' },
    { key: 'Ctrl/Cmd + A', action: 'Toggle auto-refresh' },
    { key: 'ESC', action: 'Close modals' },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed! bottom-4 right-4 w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30 transition-all flex items-center justify-center text-xl z-40"
        title="Help & Shortcuts (Ctrl+/)"
      >
        ?
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-200">Keyboard Shortcuts</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-black/20 rounded-lg"
            >
              <span className="text-sm text-gray-300">{shortcut.action}</span>
              <kbd className="px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-xs font-mono text-gray-300">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">API Endpoints</h3>
          <div className="space-y-1 text-xs text-gray-400">
            <div><code className="text-blue-400">POST /api/create-job</code> - Create job</div>
            <div><code className="text-blue-400">GET /api/get-job?id=...</code> - SSE status</div>
            <div><code className="text-blue-400">GET /api/admin/queue</code> - Queue stats</div>
            <div><code className="text-blue-400">GET /api/admin/workers</code> - Worker list</div>
          </div>
        </div>
      </div>
    </div>
  );
}
