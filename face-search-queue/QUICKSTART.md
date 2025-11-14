# Face Search Queue Module - Quick Start

## ✅ What's Been Implemented

### Core Queue System
- ✅ **BullMQ Integration**: Robust queue management with Redis backend
- ✅ **Job Creation API** (`POST /api/create-job`): Create face search jobs with validation
- ✅ **SSE Status Stream** (`GET /api/get-job`): Real-time job status updates
- ✅ **Rate Limiting**: 5-minute cooldown per user
- ✅ **Duplicate Prevention**: One active job per user across all stages
- ✅ **Stage Isolation**: Independent queue tracking per gallery stage

### Admin Dashboard (http://localhost:3000)
- ✅ **Real-time Stats**: Auto-refreshing every 2 seconds
- ✅ **Queue Controls**: Pause, Resume, Clean, Manual Refresh
- ✅ **Statistics Overview**: 6 stat cards showing all queue states
- ✅ **Worker Management**: Live worker monitoring with metrics
- ✅ **Bulk Operations**: Retry/delete all failed, delete completed
- ✅ **Toast Notifications**: User-friendly action feedback
- ✅ **Keyboard Shortcuts**: Productivity shortcuts (Ctrl+P, Ctrl+R, etc.)
- ✅ **Help Modal**: Built-in documentation and API reference
- ✅ **Analytics Section**:
  - Queue distribution pie chart
  - Success rate percentage
  - Average processing time
  - Queue health indicators
  - Recent activity log
- ✅ **Kanban Board**: 5 columns (Waiting, Active, Completed, Failed, Delayed)
- ✅ **Job Management**:
  - Expand/collapse job cards
  - Promote waiting jobs
  - Retry failed jobs
  - Delete any job
  - View detailed job information

### API Endpoints Implemented

#### Public Endpoints (for frontend integration)
1. `POST /api/create-job` - Create new face search job
2. `GET /api/get-job?id={jobId}` - SSE stream for job status

#### Admin Endpoints (for dashboard)
1. `GET /api/admin/queue` - Get all queue stats and jobs
2. `GET /api/admin/workers` - Get all connected workers
3. `GET /api/admin/stats` - Combined stats + workers (optimized)
4. `DELETE /api/admin/queue?jobId={jobId}` - Delete specific job
5. `PATCH /api/admin/queue` - Update job (promote, retry, setPriority)
6. `POST /api/admin/pause` - Pause queue processing
7. `DELETE /api/admin/pause` - Resume queue processing
8. `GET /api/admin/pause` - Check pause status
## 🎨 Dashboard Features

### Ultra-Responsive Design
- Sleek dark mode aesthetic
- Glassmorphism effects (backdrop-blur + transparency)
- Gradient backgrounds with modern UI
- Tailwind CSS for styling
- Responsive grid layouts
- Hover effects and smooth transitions
- Custom minimalist scrollbars
- Color-coded states (Amber: Waiting, Blue: Active, Emerald: Completed, Red: Failed, Purple: Delayed)

### Interactive Components
1. **Stats Cards**: Visual counters with icons, gradients, and pulsing indicators
2. **Control Panel**: Action buttons with glassmorphism styling
3. **Worker Cards**: Live metrics with GPU temp, CPU/RAM/GPU gauges
4. **Bulk Actions**: One-click operations for multiple jobs
5. **Pie Chart**: SVG-based visualization of queue distribution
6. **Performance Metrics**: Success rate, avg processing time, health badges
7. **Activity Feed**: Recent completions with timestamps
8. **Kanban Columns**: Expandable cards with detailed info
9. **Toast Notifications**: Real-time action feedback
10. **Help Modal**: Keyboard shortcuts and API documentation

### Keyboard Shortcuts
- `Ctrl/Cmd + P` - Pause/Resume queue
- `Ctrl/Cmd + R` - Refresh data manually
- `Ctrl/Cmd + K` - Clean queue
- `Ctrl/Cmd + A` - Toggle auto-refresh
- `ESC` - Close modals
- `?` (click help button) - Show shortcuts

### Worker Monitoring
- **Real-time Metrics**: CPU, RAM, GPU utilization
- **Temperature Monitoring**: Color-coded temperature warnings
- **Job Tracking**: Current job, jobs processed/failed
- **Uptime Display**: Worker uptime in human-readable format
- **Online/Offline Status**: Auto-detection with heartbeat
- **GPU Info**: Model name, memory usage, temperature
- **Remove Worker**: Clean up offline workers
3. **Pie Chart**: SVG-based visualization of queue distribution
4. **Performance Metrics**: Success rate, avg processing time, health badges
5. **Activity Feed**: Recent completions with timestamps
6. **Kanban Columns**: Draggable-style cards with detailed info

### Job Card Details
- Job ID (with tooltip for full ID)
- User email
- Stage name
- Creation time
- Attempts made
- Progress bar (for active jobs)
- Processing/completion timestamps
- Duration calculation
- Error messages (for failed jobs)
- Result count (for completed jobs)

## 🚀 Running the Queue Module

```bash
cd face-search-queue
pnpm dev
```

Dashboard: http://localhost:3000

## 📝 API Usage Examples

### Creating a Job
```bash
curl -X POST http://localhost:3000/api/create-job \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "uid": "student@example.com",
    "stage": "Day-1/Morning/Batch-A"
  }'
```

### Monitoring Job Status (SSE)
```javascript
const eventSource = new EventSource(`http://localhost:3000/api/get-job?id=${jobId}`);

eventSource.addEventListener('status', (e) => {
  const data = JSON.parse(e.data);
  console.log(`Position: ${data.position}/${data.total_size}`);
});

eventSource.addEventListener('result', (e) => {
  const data = JSON.parse(e.data);
  console.log('Results:', data.result);
  eventSource.close();
});

eventSource.addEventListener('error', (e) => {
  const data = JSON.parse(e.data);
  console.error('Error:', data.error);
  eventSource.close();
});
```

## 🔧 Configuration

### Environment Variables (.env.local)
```env
REDIS_HOST=14.139.155.58
REDIS_PORT=6379
REDIS_PASSWORD=juFETredis@QT750!
```

### Redis Connection
- Auto-retry on connection failure
- Exponential backoff strategy
- Connection pooling enabled
- Read-ready check disabled for performance

### Queue Configuration
- **Job Retention**:
  - Completed: 24 hours (max 1000 jobs)
  - Failed: 7 days
- **Retry Strategy**: 3 attempts with exponential backoff (2s base delay)
- **Concurrency**: Configurable per worker

## 📊 Queue Metrics Tracked

1. **Waiting Count**: Jobs in queue
2. **Active Count**: Currently processing
3. **Completed Count**: Successfully finished
4. **Failed Count**: Processing errors
5. **Delayed Count**: Scheduled for later
6. **Total Jobs**: Sum of all states
7. **Success Rate**: % of successful completions
8. **Avg Processing Time**: Mean duration
9. **Queue Health**: Status indicators

## 🎯 Next Steps

### Immediate Requirements
1. **Test the Dashboard**:
   - Navigate to http://localhost:3000
   - Verify all components load
   - Test queue controls
   - Check SSE connections

2. **Worker Module** (To be created next):
   - Python-based worker
   - Face recognition algorithm
   - GPU support
   - BullMQ worker integration

3. **Frontend Integration** (After worker):
   - Add to convocation portal
   - Face capture component
   - LocalStorage management
   - Filter UI integration

### Testing Checklist
- [ ] Dashboard loads without errors
- [ ] Stats update in real-time
- [ ] Can create jobs via API
- [ ] SSE streams work correctly
- [ ] Rate limiting prevents spam
- [ ] Duplicate jobs rejected
- [ ] Job actions work (promote, retry, delete)
- [ ] Queue pause/resume functions
- [ ] Clean operation works

## 🛠 Troubleshooting

### Redis Connection Issues
- Verify Redis server is running
- Check `.env.local` credentials
- Ensure network connectivity to Redis host

### Dashboard Not Loading
- Check terminal for compilation errors
- Verify all dependencies installed (`pnpm install`)
- Clear `.next` folder and rebuild

### Jobs Not Processing
- Ensure worker module is running (to be created)
- Check queue pause status
- Verify Redis connection

## 📦 Project Structure

```
face-search-queue/
├── app/
│   ├── api/                    # API routes
│   │   ├── create-job/        # Job creation
│   │   ├── get-job/           # SSE endpoint
│   │   └── admin/             # Admin APIs
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Dashboard page
├── components/                 # React components
│   ├── AnalyticsCharts.tsx    # Charts & metrics
│   ├── QueueControls.tsx      # Control buttons
│   ├── QueueKanban.tsx        # Kanban board
│   └── StatsOverview.tsx      # Stats cards
├── lib/                        # Core logic
│   ├── queue.ts               # BullMQ setup
│   ├── redis.ts               # Redis connection
│   └── types.ts               # TypeScript types
├── .env.local                  # Environment config
├── package.json               # Dependencies
└── README.md                  # Full documentation
```

## 🎓 Key Concepts

### BullMQ Queue System
- Jobs are stored in Redis
- Workers process jobs asynchronously
- Multiple workers can connect
- Built-in retry and error handling

### Server-Sent Events (SSE)
- One-way server-to-client communication
- Real-time updates without polling
- Auto-reconnect on connection drop
- Lower overhead than WebSockets

### Rate Limiting
- Redis-backed tracking
- Per-user cooldown periods
- TTL-based expiration
- Prevents abuse

## 💡 Design Decisions

1. **Tailwind CSS over Material-UI**: Faster setup, smaller bundle, more control
2. **SSE over WebSockets**: Simpler for one-way updates, better browser support
3. **BullMQ over Bull**: Modern, TypeScript-first, better Redis integration
4. **Single-page Dashboard**: All info at a glance, no navigation needed
5. **Auto-refresh**: Real-time feel without manual updates

## ⚡ Performance Optimizations

- Memoized chart calculations
- Efficient Redis queries
- Limited job history (100 per state)
- Automatic cleanup of old jobs
- Connection pooling
- Minimal re-renders

---

**Status**: ✅ Queue Module Complete - Ready for Worker Development

**Dashboard**: http://localhost:3000

**Next**: Create `face-search-worker` Python module
