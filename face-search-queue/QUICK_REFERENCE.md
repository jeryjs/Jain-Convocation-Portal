# Quick Reference

## What Changed?

Your Face Search Queue now uses **real-time Redis Pub/Sub with Server-Sent Events** instead of polling every 2 seconds.

## New Files Created

| File | Purpose |
|------|---------|
| `app/hook/useStats.ts` | Custom hook for queue stats & operations |
| `app/hook/useWorkers.ts` | Custom hook for worker management |
| `app/api/stream/route.ts` | SSE endpoint for real-time updates |
| `lib/pubsub.ts` | Redis pub/sub infrastructure |
| `lib/worker-monitor.ts` | Monitors workers and publishes updates |
| `ARCHITECTURE.md` | Architecture documentation |
| `IMPLEMENTATION.md` | Implementation details |
| `MIGRATION_GUIDE.md` | How to use the new hooks |

## Modified Files

| File | Changes |
|------|---------|
| `app/page.tsx` | Uses hooks instead of polling |
| `app/api/admin/pause/route.ts` | Publishes Redis updates |
| `app/api/admin/clean/route.ts` | Publishes Redis updates |
| `app/api/admin/queue/route.ts` | Publishes Redis updates |
| `app/api/admin/bulk/route.ts` | Publishes Redis updates |
| `app/api/admin/workers/route.ts` | Publishes Redis updates |
| `lib/queue.ts` | Listens to BullMQ events and publishes |

## How to Use

### Import Hooks
```typescript
import { useStats } from '@/app/hook/useStats';
import { useWorkers } from '@/app/hook/useWorkers';
```

### Use in Component
```typescript
const {
  queueData,     // Queue stats and jobs
  isPaused,      // Pause state
  loading,       // Loading state
  error,         // Error message
  togglePause,   // Pause/resume queue
  cleanQueue,    // Clean completed/failed jobs
  performJobAction,  // Retry, promote, setPriority
  deleteJob,     // Delete a job
  performBulkAction, // Bulk operations
  refresh,       // Reconnect to SSE
} = useStats();

const {
  workers,       // Worker list
  loading,       // Loading state
  error,         // Error message
  removeWorker,  // Remove a worker
  refresh,       // Reconnect to SSE
} = useWorkers();
```

### Perform Actions
```typescript
// Toggle pause
const result = await togglePause();
console.log(result.message); // "Queue paused" or "Queue resumed"

// Clean queue
const result = await cleanQueue();

// Retry a job
const result = await performJobAction(jobId, 'retry');

// Delete a job
const result = await deleteJob(jobId);

// Retry all failed jobs
const result = await performBulkAction('retry-failed');

// Remove a worker
const result = await removeWorker(workerId);
```

## Testing

1. Start Redis: `redis-server`
2. Start app: `npm run dev` or `pnpm dev`
3. Open browser console
4. You should see:
   - `SSE connection established`
   - Real-time updates without page refresh
   - Instant feedback on actions

## Troubleshooting

### Connection Issues
- Check Redis is running: `redis-cli ping` (should return PONG)
- Check browser console for SSE errors
- Hook will auto-reconnect every 3 seconds

### No Real-Time Updates
- Verify `/api/stream` endpoint is accessible
- Check Redis pub/sub is working: `redis-cli SUBSCRIBE queue:updates`
- Verify BullMQ queue events are firing

### Workers Not Updating
- Worker monitor publishes every 5 seconds
- Check workers are sending heartbeats to Redis
- Verify `workers` hash exists: `redis-cli HGETALL workers`

## API Folder

You can now delete most of `/api/admin` folder if you want, as all logic is in hooks. However, **you must keep**:
- `/api/stream` - SSE endpoint (required)
- `/api/admin/*` - Backend endpoints that hooks call

Recommended: **Keep all API routes** as they provide the backend implementation.

## Performance

**Before**: Polling every 2 seconds = 30 requests/minute per client

**After**: 1 SSE connection per client + Redis pub/sub

**Result**: ~95% reduction in HTTP requests! 🎉

## Need Help?

See the full documentation:
- `ARCHITECTURE.md` - How the system works
- `IMPLEMENTATION.md` - What was built
- `MIGRATION_GUIDE.md` - Detailed usage examples
