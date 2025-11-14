'use client';

import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onPauseToggle: () => void;
  onRefresh: () => void;
  onCleanQueue: () => void;
  onToggleAutoRefresh: () => void;
}

export default function KeyboardShortcuts({
  onPauseToggle,
  onRefresh,
  onCleanQueue,
  onToggleAutoRefresh,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl/Cmd is pressed
      const isMod = e.ctrlKey || e.metaKey;
      
      // Prevent default for our shortcuts
      if (isMod) {
        switch (e.key.toLowerCase()) {
          case 'p':
            e.preventDefault();
            onPauseToggle();
            break;
          case 'r':
            e.preventDefault();
            onRefresh();
            break;
          case 'k':
            e.preventDefault();
            onCleanQueue();
            break;
          case 'a':
            e.preventDefault();
            onToggleAutoRefresh();
            break;
        }
      }
      
      // ESC to close modals (if any)
      if (e.key === 'Escape') {
        // Could be used to close job detail modal
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPauseToggle, onRefresh, onCleanQueue, onToggleAutoRefresh]);

  return null; // No UI, just keyboard event handler
}
