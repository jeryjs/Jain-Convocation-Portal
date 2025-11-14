# Face Search Worker

GPU-powered Python worker for processing face search jobs from the BullMQ queue.

## Features

- ✅ **Multi-GPU Support**: Automatically detects and utilizes available GPUs
- ✅ **CPU Fallback**: Works without GPU if unavailable
- ✅ **Stable Worker IDs**: `hostname_gpu{index}` format
- ✅ **Auto-Registration**: Self-registers with queue on startup
- ✅ **Heartbeat System**: 5-second heartbeat with system metrics
- ✅ **Error Recovery**: Robust error handling and retry logic
- ✅ **Progress Updates**: Real-time job progress reporting
- ✅ **System Monitoring**: CPU, RAM, GPU utilization & temperature

## Architecture

```
Worker (Python) → Connects to Cloud Redis → Processes Jobs → Returns Results
     │
     ├── Registers itself (hostname_gpu0)
     ├── Sends heartbeat every 5s (CPU, RAM, GPU metrics)
     ├── Pulls jobs from 'face-search' queue
     ├── Processes face search (GPU accelerated)
     ├── Updates job progress (0-100%)
     └── Returns results [{id: str, score: float}]
```

## Installation

```bash
# Create virtual environment
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Create `.env` file:
```env
REDIS_HOST=14.139.155.58
REDIS_PORT=6379
REDIS_PASSWORD=juFETredis@QT750!

# Optional
GPU_INDEX=0  # Which GPU to use (default: 0)
WORKER_CONCURRENCY=1  # Jobs to process simultaneously
```

## Usage

### Start Worker

```bash
python worker.py
```

### Multiple Workers (Same Machine)

```bash
# Terminal 1 - GPU 0
GPU_INDEX=0 python worker.py

# Terminal 2 - GPU 1 (if you have 2 GPUs)
GPU_INDEX=1 python worker.py

# Terminal 3 - CPU Fallback
USE_CPU=1 python worker.py
```

## Worker ID Format

- **Single GPU**: `JERY-LAPTOP_gpu0`
- **Multiple GPUs**: `JERY-LAPTOP_gpu0`, `JERY-LAPTOP_gpu1`
- **CPU Fallback**: `JERY-LAPTOP_cpu0`

**Benefits**:
- Same ID across restarts (no random UUIDs)
- Easy identification of device
- Supports multiple workers per machine
- Tracks which GPU is being used

## System Metrics Collected

- **CPU Usage**: Overall percentage
- **RAM Usage**: Percentage and available GB
- **GPU Metrics** (if available):
  - Utilization percentage
  - Temperature (°C)
  - Memory usage
  - Memory available
- **Worker Stats**:
  - Jobs processed count
  - Current job ID
  - Last heartbeat timestamp
  - Uptime

## Face Search Algorithm

The worker implements DeepFace-based face recognition:

1. **Input**: Base64 encoded selfie image
2. **Face Detection**: Detect face in selfie
3. **Encoding**: Generate face embedding (512-dim vector)
4. **Comparison**: Compare against gallery images
5. **Scoring**: Calculate similarity scores (0-1)
6. **Filtering**: Return matches above threshold (0.6)
7. **Sorting**: Order by score (highest first)

## Error Handling

- **No Face Detected**: Returns error to job
- **Invalid Image**: Returns error with details
- **GPU Out of Memory**: Automatically retries with CPU
- **Connection Lost**: Reconnects to Redis automatically
- **Worker Crash**: Redis heartbeat timeout marks offline

## Development

### Project Structure

```
face-search-worker/
├── worker.py              # Main worker process
├── face_search.py         # Face recognition logic
├── metrics.py             # System metrics collection
├── requirements.txt       # Python dependencies
├── .env                   # Configuration
└── README.md             # This file
```

### Key Dependencies

- `redis`: Redis client
- `bullmq-python`: BullMQ worker library
- `deepface`: Face recognition
- `tensorflow`: Deep learning backend
- `opencv-python`: Image processing
- `psutil`: System metrics
- `py3nvml`: GPU metrics (NVIDIA)
- `python-dotenv`: Environment variables

## Monitoring

Workers appear in the admin dashboard at http://localhost:3000 showing:

- Worker name and status
- GPU/CPU model
- Current utilization
- Temperature
- Memory usage
- Jobs processed
- Current job
- Last heartbeat

## Troubleshooting

### Worker Not Connecting
- Check Redis credentials in `.env`
- Verify network connectivity
- Check firewall rules

### No GPU Detected
- Install NVIDIA drivers
- Install CUDA toolkit
- Verify with `nvidia-smi`

### High Memory Usage
- Reduce concurrency
- Process one job at a time
- Clear TensorFlow cache

### Jobs Failing
- Check image format (base64)
- Verify face is visible
- Check error logs

## Performance

- **GPU (RTX 3060)**: ~2-3s per job
- **CPU (i7-10700)**: ~8-10s per job
- **Memory**: ~2GB per worker
- **Recommended**: 1 worker per GPU

## License

Part of the Jain Convocation Portal project.
