# Face Search Worker 2 (face_recognition)

Alternative worker implementation using the `face_recognition` library instead of DeepFace.

## Features

- ✅ **face_recognition Library**: Faster, simpler face recognition
- ✅ **GPU Acceleration**: CUDA support via dlib
- ✅ **Multi-GPU Support**: Automatically detects and utilizes available GPUs
- ✅ **CPU Fallback**: Works without GPU if unavailable
- ✅ **Stable Worker IDs**: `hostname_gpu{index}_fr` format
- ✅ **Auto-Registration**: Self-registers with queue on startup
- ✅ **Heartbeat System**: 5-second heartbeat with system metrics
- ✅ **Error Recovery**: Robust error handling and retry logic
- ✅ **Progress Updates**: Real-time job progress reporting
- ✅ **System Monitoring**: CPU, RAM, GPU utilization & temperature

## Differences from Worker 1

| Feature | Worker 1 (DeepFace) | Worker 2 (face_recognition) |
|---------|---------------------|----------------------------|
| **Library** | DeepFace + Facenet512 | face_recognition + dlib |
| **Model** | Facenet512 (512-dim) | dlib ResNet (128-dim) |
| **Speed** | Slower, more accurate | Faster, good accuracy |
| **GPU** | TensorFlow CUDA | dlib CUDA |
| **Memory** | Higher (~2GB) | Lower (~1GB) |
| **Dependencies** | TensorFlow, DeepFace | dlib, face_recognition |

## Installation

```bash
# Activate your conda ml environment
conda activate ml

# Install dependencies (if not already installed)
pip install -r requirements.txt
```

## Configuration

Create `.env` file (or copy from `.env.example`):
```env
REDIS_HOST=14.139.155.58
REDIS_PORT=6379
REDIS_PASSWORD=juFETredis@QT750!

# Optional
GPU_INDEX=0  # Which GPU to use (default: 0)
WORKER_CONCURRENCY=1  # Jobs to process simultaneously
```

## Usage

### Start Worker 2

```bash
# Windows
start.bat

# Or manually
conda activate ml
python worker.py
```

### Run Both Workers Together

```bash
# Terminal 1 - Worker 1 (DeepFace)
cd face-search-worker
python worker.py

# Terminal 2 - Worker 2 (face_recognition)
cd face-search-worker-2
python worker.py
```

Both workers will:
- Connect to the same Redis queue
- Process jobs in parallel
- Show up separately in the admin dashboard
- Have unique IDs (worker 1 ends in `_gpu0`, worker 2 ends in `_gpu0_fr`)

## Worker ID Format

- **Worker 2 GPU**: `JERY-LAPTOP_gpu0_fr` (note the `_fr` suffix)
- **Worker 2 CPU**: `JERY-LAPTOP_cpu0_fr`

The `_fr` suffix identifies this as a face_recognition worker.

## Face Recognition Algorithm

Uses the face_recognition library which wraps dlib:

1. **Input**: Base64 encoded selfie image
2. **Preprocessing**: Resize if needed (max 640px)
3. **Face Detection**: dlib HOG/CNN face detector
4. **Encoding**: dlib ResNet face descriptor (128-dim)
5. **Comparison**: Euclidean distance calculation
6. **Similarity**: 1 - distance (converted to 0-1 range)
7. **Filtering**: Return matches with similarity > 0.5
8. **Sorting**: Order by score (highest first)

## Performance Comparison

### Worker 1 (DeepFace + Facenet512)
- **Accuracy**: ★★★★★ (Very High)
- **Speed**: ★★★☆☆ (Moderate)
- **Memory**: ★★☆☆☆ (High)
- **Best For**: High accuracy requirements

### Worker 2 (face_recognition + dlib)
- **Accuracy**: ★★★★☆ (High)
- **Speed**: ★★★★☆ (Fast)
- **Memory**: ★★★★☆ (Low)
- **Best For**: High throughput, limited memory

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
  - Engine type: `face_recognition`

## Error Handling

- **No Face Detected**: Returns error to job
- **Invalid Image**: Returns error with details
- **GPU Out of Memory**: Automatically retries with CPU
- **Connection Lost**: Reconnects to Redis automatically
- **Worker Crash**: Redis heartbeat timeout marks offline

## Development

### Project Structure

```
face-search-worker-2/
├── worker.py              # Main worker process
├── face_search.py         # Face recognition logic (face_recognition)
├── metrics.py             # System metrics collection
├── requirements.txt       # Python dependencies
├── .env.example           # Configuration template
├── start.bat              # Windows quick start
└── README.md             # This file
```

### Key Dependencies

- `face-recognition`: Face recognition library
- `dlib`: Machine learning toolkit (with CUDA support)
- `redis`: Redis client
- `bullmq-python`: BullMQ worker library
- `opencv-python`: Image processing
- `psutil`: System metrics
- `py3nvml`: GPU metrics (NVIDIA)
- `python-dotenv`: Environment variables

## Monitoring

Both workers appear in the admin dashboard at http://localhost:3000 showing:

- Worker name and status
- Engine type (DeepFace vs face_recognition)
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
- Install dlib with CUDA support
- Verify with `nvidia-smi`

### dlib Installation Issues
```bash
# If dlib fails to install
conda install -c conda-forge dlib
```

### Face Detection Failing
- Ensure image quality is good
- Check lighting in photos
- Verify face is clearly visible
- Try lowering similarity threshold

## Performance Tips

1. **Use GPU**: Much faster than CPU (5-10x)
2. **Batch Processing**: Both workers can run simultaneously
3. **Image Quality**: Higher quality = better accuracy
4. **Similarity Threshold**: Adjust based on your needs (0.4-0.6 range)

## License

Part of the Jain Convocation Portal project.
