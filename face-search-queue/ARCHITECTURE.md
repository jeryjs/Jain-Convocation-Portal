# Face Search Queue - Real-Time Architecture

## Overview

This application uses **Server-Sent Events (SSE)** with **Redis Pub/Sub** for real-time updates, eliminating the need for polling.

## Architecture

### Custom Hooks

All API logic is now consolidated into two custom React hooks:

#### `useStats.ts`
Manages queue statistics and operations:
- Real-time queue stats (waiting, active, completed, failed, delayed)
- Job details for all queue states
- Pause/resume queue
- Clean queue
- Job actions (retry, promote, setPriority, delete)
- Bulk actions (retry-failed, delete-failed, delete-completed)

#### `useWorkers.ts`
Manages worker information:
- Real-time worker status and metrics
- Worker removal

### Real-Time Communication

**Server-Sent Events (SSE)**: `/api/stream`
- Maintains persistent HTTP connection
- Streams real-time updates to clients
- Auto-reconnects on connection loss
- Keep-alive pings every 15 seconds

**Redis Pub/Sub**: `lib/pubsub.ts`
- Queue updates published on job events (waiting, active, completed, failed, etc.)
- Worker updates published every 5 seconds
- Pause state changes published immediately
- Channel: `queue:updates`

### Event Flow

```
Job Event → BullMQ Queue Events → Redis Publish → SSE Stream → React Hook → UI Update
Worker Update → Worker Monitor → Redis Publish → SSE Stream → React Hook → UI Update
User Action → API Route → Redis Publish → SSE Stream → React Hook → UI Update
```

### Components

**API Routes** (`/api/admin/*`):
- `/api/stream` - SSE endpoint for real-time updates
- `/api/admin/pause` - Pause/resume queue
- `/api/admin/queue` - Queue operations (GET stats, DELETE job, PATCH job action)
- `/api/admin/bulk` - Bulk operations
- `/api/admin/clean` - Clean completed/failed jobs
- `/api/admin/workers` - Worker management

**Libraries**:
- `lib/pubsub.ts` - Redis pub/sub clients and publish functions
- `lib/queue.ts` - BullMQ queue with event listeners
- `lib/worker-monitor.ts` - Monitors and publishes worker updates
- `lib/redis.ts` - Redis client configuration

## Usage

### In Components

```typescript
import { useStats } from '@/app/hook/useStats';
import { useWorkers } from '@/app/hook/useWorkers';

function MyComponent() {
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

  const {
    workers,
    loading: workersLoading,
    error: workersError,
    removeWorker,
    refresh: refreshWorkers,
  } = useWorkers();

  // Use the data and actions
}
```

### No Polling Required

The hooks automatically establish SSE connections and receive real-time updates. No manual polling or intervals needed!

### Benefits

1. **Real-time updates**: Instant UI updates when queue or workers change
2. **Reduced server load**: No constant polling
3. **Better UX**: Immediate feedback on actions
4. **Automatic reconnection**: Handles network interruptions
5. **Consolidated logic**: All API code in custom hooks
6. **Type-safe**: Full TypeScript support

## Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password  # optional
```

## Event Types

### SSE Messages

- `initial` - Initial data when connection established
- `queue-update` - Queue stats and jobs updated
- `workers-update` - Worker list updated
- `pause-update` - Queue pause state changed
- `ping` - Keep-alive heartbeat

### Redis Pub/Sub Messages

Published to `queue:updates` channel:

```json
{ "type": "queue" }           // Queue data changed
{ "type": "workers" }          // Workers data changed
{ "type": "pause", "isPaused": boolean }  // Pause state changed
```

## Troubleshooting

**Connection Issues**: Check browser console for SSE connection errors. The hook will automatically attempt reconnection every 3 seconds.

**Missing Updates**: Ensure Redis pub/sub clients are properly initialized and BullMQ queue events are being captured.

**Worker Updates Not Showing**: Worker monitor publishes updates every 5 seconds. Check that workers are sending heartbeats to Redis.

## Future Enhancements

- Debounce rapid queue updates to reduce SSE message frequency
- Add websocket support as alternative to SSE
- Implement selective subscriptions (queue-only or workers-only)
