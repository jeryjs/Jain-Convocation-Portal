# Migration Guide: From API Folder to Custom Hooks

## Before (Polling)

```typescript
// Old approach - polling every 2 seconds
const [queueData, setQueueData] = useState(null);
const [isPaused, setIsPaused] = useState(false);

const fetchQueueData = async () => {
  const response = await fetch('/api/admin/queue');
  const data = await response.json();
  setQueueData(data);
};

useEffect(() => {
  const interval = setInterval(() => {
    fetchQueueData();
  }, 2000);
  return () => clearInterval(interval);
}, []);

const handlePause = async () => {
  await fetch('/api/admin/pause', { method: 'POST' });
  // Manually refetch data
  await fetchQueueData();
};
```

## After (Real-time with Hooks)

```typescript
// New approach - real-time updates
import { useStats } from '@/app/hook/useStats';

const {
  queueData,
  isPaused,
  loading,
  error,
  togglePause,
  cleanQueue,
  performJobAction,
  deleteJob,
  performBulkAction,
  refresh,
} = useStats();

// No useEffect needed - hook handles everything
// Data updates automatically in real-time

const handlePause = async () => {
  const result = await togglePause();
  // Data updates automatically via SSE
  showToast(result.message, result.success ? 'success' : 'error');
};
```

## Complete Example

```typescript
'use client';

import { useStats } from '@/app/hook/useStats';
import { useWorkers } from '@/app/hook/useWorkers';

export default function Dashboard() {
  // Get queue data and actions
  const {
    queueData,
    isPaused,
    loading: statsLoading,
    error: statsError,
    togglePause,
    cleanQueue,
    performJobAction,
    deleteJob,
    performBulkAction,
    refresh: refreshStats,
  } = useStats();

  // Get worker data and actions
  const {
    workers,
    loading: workersLoading,
    error: workersError,
    removeWorker,
    refresh: refreshWorkers,
  } = useWorkers();

  // Handle actions
  const handlePauseQueue = async () => {
    const result = await togglePause();
    if (result.success) {
      console.log('Queue paused/resumed');
    }
  };

  const handleCleanQueue = async () => {
    if (!confirm('Clean queue?')) return;
    const result = await cleanQueue();
    console.log(result.message);
  };

  const handleRetryJob = async (jobId: string) => {
    const result = await performJobAction(jobId, 'retry');
    console.log(result.message);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Delete job?')) return;
    const result = await deleteJob(jobId);
    console.log(result.message);
  };

  const handleRetryAllFailed = async () => {
    const result = await performBulkAction('retry-failed');
    console.log(result.message);
  };

  const handleRemoveWorker = async (workerId: string) => {
    if (!confirm('Remove worker?')) return;
    const result = await removeWorker(workerId);
    console.log(result.message);
  };

  // Render
  if (statsLoading || workersLoading) {
    return <div>Loading...</div>;
  }

  if (statsError || workersError) {
    return <div>Error: {statsError || workersError}</div>;
  }

  return (
    <div>
      <h1>Queue Dashboard</h1>
      
      <div>
        <h2>Queue Stats</h2>
        <p>Waiting: {queueData?.stats.waiting}</p>
        <p>Active: {queueData?.stats.active}</p>
        <p>Completed: {queueData?.stats.completed}</p>
        <p>Failed: {queueData?.stats.failed}</p>
        <p>Status: {isPaused ? 'Paused' : 'Running'}</p>
        
        <button onClick={handlePauseQueue}>
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={handleCleanQueue}>Clean Queue</button>
        <button onClick={handleRetryAllFailed}>Retry Failed</button>
      </div>

      <div>
        <h2>Jobs</h2>
        {queueData?.jobs.waiting.map(job => (
          <div key={job.id}>
            {job.id}
            <button onClick={() => handleRetryJob(job.id)}>Retry</button>
            <button onClick={() => handleDeleteJob(job.id)}>Delete</button>
          </div>
        ))}
      </div>

      <div>
        <h2>Workers</h2>
        {workers.map(worker => (
          <div key={worker.id}>
            {worker.id} - {worker.status}
            <button onClick={() => handleRemoveWorker(worker.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Available Hook Methods

### useStats

```typescript
interface UseStatsReturn {
  // State
  queueData: QueueData | null;
  isPaused: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  togglePause: () => Promise<ActionResponse>;
  cleanQueue: () => Promise<ActionResponse>;
  performJobAction: (jobId: string, action: string, priority?: number) => Promise<ActionResponse>;
  deleteJob: (jobId: string) => Promise<ActionResponse>;
  performBulkAction: (action: string) => Promise<ActionResponse>;
  refresh: () => void;
}

// Job actions: 'retry' | 'promote' | 'setPriority'
// Bulk actions: 'retry-failed' | 'delete-failed' | 'delete-completed'
```

### useWorkers

```typescript
interface UseWorkersReturn {
  // State
  workers: WorkerInfo[];
  loading: boolean;
  error: string | null;

  // Actions
  removeWorker: (workerId: string) => Promise<ActionResponse>;
  refresh: () => void;
}
```

## Benefits Summary

✅ **No polling** - Eliminates constant API requests  
✅ **Real-time** - Instant UI updates when data changes  
✅ **Auto-reconnect** - Handles network issues gracefully  
✅ **Type-safe** - Full TypeScript support  
✅ **Clean code** - All logic in hooks  
✅ **Better UX** - Immediate feedback on actions  
✅ **Reduced server load** - Single SSE connection vs many HTTP requests  

## Migration Steps

1. ✅ Remove all `fetch()` calls for queue/worker data
2. ✅ Remove all `useEffect()` hooks for polling
3. ✅ Remove all `useState()` for queue/worker data
4. ✅ Import and use `useStats()` and `useWorkers()`
5. ✅ Update handlers to use hook methods
6. ✅ Handle loading and error states from hooks
7. ✅ Test real-time updates work correctly

## You're Done! 🎉

The application now uses real-time Redis Pub/Sub with SSE instead of polling!
