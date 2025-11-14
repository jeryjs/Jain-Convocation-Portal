# Face Search Queue

A robust, feature-rich queue management system for face search operations using Next.js, Redis, and BullMQ.

## Features

### 🎯 Core Functionality
- **Job Creation API**: Create face search jobs with rate limiting and validation
- **SSE Status Updates**: Real-time job status via Server-Sent Events
- **Queue Management**: Pause, resume, clean, and manage queue operations
- **Worker Support**: Designed to work with multiple distributed workers

### 📊 Admin Dashboard
- **Real-time Monitoring**: Auto-refreshing queue statistics
- **Kanban Board**: Visualize jobs across different states (Waiting, Active, Completed, Failed, Delayed)
- **Analytics**: Success rate, processing time, and queue health metrics
- **Interactive Charts**: Visual distribution of queue states
- **Job Management**: Promote, retry, delete jobs with a single click

### 🔒 Security & Validation
- **Rate Limiting**: 1 job per user per 5 minutes
- **Duplicate Prevention**: One active job per user across all stages
- **Input Validation**: Base64 image validation, email verification
- **Stage Isolation**: Independent queues for different gallery stages

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Queue**: BullMQ
- **Database**: Redis
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Node.js 20+
- Redis server (configured in `.env.local`)
- pnpm

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
Create `.env.local` file:
```env
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) to see the admin dashboard

## API Endpoints

### Public Endpoints

#### Create Job
```http
POST /api/create-job
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,...",
  "uid": "user@example.com",
  "stage": "stage-1"
}
```

**Response (201)**:
```json
{
  "jobId": "job_1699876543210_abc123",
  "timestamp": 1699876543210
}
```

**Rate Limited (429)**:
```json
{
  "error": "Rate limit exceeded",
  "message": "You can only create a job once every 5 minutes",
  "retryAfter": 120
}
```

#### Get Job Status (SSE)
```http
GET /api/get-job?id={jobId}
Accept: text/event-stream
```

**SSE Events**:
- `status`: Queue position updates
- `result`: Final results with matched images
- `error`: Job failure information

### Admin Endpoints

#### Get Queue Stats
```http
GET /api/admin/queue
```

#### Delete Job
```http
DELETE /api/admin/queue?jobId={jobId}
```

#### Update Job
```http
PATCH /api/admin/queue
Content-Type: application/json

{
  "jobId": "job_xxx",
  "action": "promote" | "retry" | "setPriority",
  "priority": 1 (optional)
}
```

#### Pause Queue
```http
POST /api/admin/pause
```

#### Resume Queue
```http
DELETE /api/admin/pause
```

#### Clean Queue
```http
POST /api/admin/clean
```

## Project Structure

```
face-search-queue/
├── app/
│   ├── api/
│   │   ├── create-job/         # Job creation endpoint
│   │   ├── get-job/            # SSE status endpoint
│   │   └── admin/              # Admin management endpoints
│   ├── layout.tsx
│   └── page.tsx                # Admin dashboard
├── components/
│   ├── AnalyticsCharts.tsx     # Performance metrics & charts
│   ├── QueueControls.tsx       # Control buttons
│   ├── QueueKanban.tsx         # Kanban board view
│   └── StatsOverview.tsx       # Stats cards
├── lib/
│   ├── queue.ts                # BullMQ queue configuration
│   ├── redis.ts                # Redis connection
│   └── types.ts                # TypeScript interfaces
└── .env.local                  # Environment variables
```

## Admin Dashboard Features

### Queue Controls
- **Pause/Resume**: Control queue processing
- **Auto-Refresh**: Toggle automatic updates (2s interval)
- **Manual Refresh**: Force immediate update
- **Clean Queue**: Remove completed/failed jobs

### Stats Overview
- Real-time counters for each queue state
- Total jobs counter
- Pause indicator

### Analytics
- **Queue Distribution**: Pie chart showing job distribution
- **Success Rate**: Percentage of successfully completed jobs
- **Avg Processing Time**: Average time per job
- **Queue Health**: Status indicators
- **Recent Activity**: Last 8 completed jobs

### Kanban Board
- **5 Columns**: Waiting, Active, Completed, Failed, Delayed
- **Job Cards**: Expandable cards with detailed information
- **Actions**:
  - Promote (move to front of queue)
  - Retry (for failed jobs)
  - Delete (remove job)
- **Job Details**:
  - Job ID
  - User ID
  - Stage
  - Timestamps
  - Progress bar (for active jobs)
  - Error messages (for failed jobs)
  - Results count (for completed jobs)

## Queue Behavior

### Job Lifecycle
1. **Created**: Job added to queue
2. **Waiting**: In queue, position updates sent via SSE
3. **Active**: Being processed by worker
4. **Completed/Failed**: Final result sent via SSE, connection closed
5. **Cleaned**: Removed after retention period

### Rate Limiting
- 5 minute cooldown after successful job creation
- Tracked per user (uid)
- Persists in Redis

### Duplicate Prevention
- One active job per user across ALL stages
- Checked before job creation
- Automatically cleaned up when job completes

## Worker Integration

Workers should:
1. Connect to the same Redis instance
2. Process jobs from the `face-search` queue
3. Update job progress (0-100)
4. Return results in format: `[{ id: string, score: number }]`
5. Throw errors for failures

Example worker setup (to be implemented in face-search-worker):
```typescript
import { Worker } from 'bullmq';

const worker = new Worker('face-search', async (job) => {
  // Process face search
  const { image, uid, stage } = job.data;
  
  // Update progress
  await job.updateProgress(50);
  
  // Return results
  return [
    { id: 'img_001', score: 0.95 },
    { id: 'img_042', score: 0.87 }
  ];
}, {
  connection: redis,
  concurrency: 1,
});
```

## Development

### Running in Development
```bash
pnpm dev
```

### Building for Production
```bash
pnpm build
pnpm start
```

### Linting
```bash
pnpm lint
```

## Next Steps

1. **Worker Module**: Create `face-search-worker` Python project
2. **Frontend Integration**: Integrate with convocation portal
3. **Authentication**: Add admin authentication
4. **Monitoring**: Add logging and error tracking
5. **Testing**: Add unit and integration tests

## License

Part of the Jain Convocation Portal project.

