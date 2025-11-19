# Face Search Worker

GPU-powered face recognition worker for processing face search jobs from BullMQ queue.

## 🏗️ Architecture

```
face-search-worker/
├── worker.py              # Main worker orchestrator
├── core/                  # Shared core functionality
│   ├── base_engine.py    # Abstract base class for engines
│   ├── worker_manager.py # Worker lifecycle management
│   └── job_processor.py  # Job processing logic
├── engines/              # Face recognition engines
│   ├── deepface/        # DeepFace engine (TensorFlow)
│   │   ├── engine.py
│   │   └── requirements.txt
│   └── face_recognition/ # face_recognition engine (dlib)
│       ├── engine.py
│       └── requirements.txt
├── exclude_faces/        # Shared exclude faces directory
├── metrics.py           # System metrics collection
├── deploy.bat           # Windows deployment script
├── deploy.sh            # Linux/Mac deployment script
└── .env                 # Configuration
```

## 🚀 Quick Start

### 1. Choose Your Engine

**Engine 1: DeepFace** (TensorFlow-based)
```bash
conda activate tf
cd engines/deepface
pip install -r requirements.txt
```

**Engine 2: face_recognition** (dlib-based)  
```bash
conda activate ml
cd engines/face_recognition
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
GPU_INDEX=0
WORKER_CONCURRENCY=1
USE_CPU=0
```

### 3. Run Worker

**Interactive Mode:**
```bash
# Activate appropriate environment first
conda activate tf  # or ml
python worker.py
```

**Direct Mode:**
```bash
conda activate tf
python worker.py --engine deepface

# OR

conda activate ml
python worker.py --engine face_recognition
```

**Using Deployment Scripts:**
```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh
./deploy.sh
```

## 🎯 How It Works

### 1. Worker Initialization
- Connects to Redis
- Registers worker with unique ID (auto-indexed based on active workers)
- Starts heartbeat thread (5-second interval)
- Loads selected engine dynamically

### 2. Job Processing
```
Job Received → Check Pause Status → Load Exclude Faces → 
Process Gallery Images → Calculate Similarities → 
Return Sorted Results (Best Matches First)
```

### 3. Face Matching Algorithm
- **Not**: Finding top N matches
- **Is**: Calculating similarity % for ALL gallery images
- **Returns**: Dict of `{id: similarity}` sorted in descending order
- **Uses**: `face_distance` to calculate similarity scores

### 4. Exclude Faces
- Shared `exclude_faces/` directory for both engines
- Worker passes file paths to engine
- Engine handles exclusion logic
- Filters out matching faces from results

## 🔧 Engine Details

### DeepFace Engine
- **Backend**: TensorFlow
- **Models**: VGG-Face, Facenet, OpenFace, DeepID, etc.
- **Method**: Embedding-based similarity (cosine distance)
- **GPU**: CUDA accelerated
- **Dependencies**: `tensorflow`, `deepface`, `opencv-python`

### face_recognition Engine
- **Backend**: dlib
- **Method**: Face encoding + distance calculation
- **GPU**: CUDA accelerated via dlib
- **Speed**: Faster than DeepFace
- **Accuracy**: High (based on ResNet)
- **Dependencies**: `face_recognition`, `dlib`, `opencv-python`

## 📤 API Response Format

Jobs return sorted list of ALL matches:

```json
[
  { "id": "photo_001.jpg", "similarity": 0.9523 },
  { "id": "photo_042.jpg", "similarity": 0.8734 },
  { "id": "photo_123.jpg", "similarity": 0.8201 },
  { "id": "photo_456.jpg", "similarity": 0.7856 },
  ...
]
```

**Sorted**: Descending order (best matches at top)  
**Similarity**: 0.0 to 1.0 (1.0 = perfect match)

## 🚫 Exclude Faces

Place images to exclude in `exclude_faces/`:

```
exclude_faces/
├── staff_member1.jpg
├── staff_member2.jpg
├── photographer.jpg
└── unwanted/
    ├── group1.jpg
    └── group2.jpg
```

These faces are automatically filtered from all results.

## 📊 Monitoring

Workers report metrics every 5 seconds:
- **System**: CPU, RAM, GPU usage & temperature
- **Jobs**: Processed count, failed count, current job
- **Status**: Online/offline, paused/running
- **Uptime**: Time since worker started

**View in Queue UI**: http://localhost:3000

## 🎛️ Worker Controls

### Pause/Resume
- Click pause button (⏸️) in Queue UI
- Worker checks pause flag before each job
- Paused jobs delayed (not failed!)
- Resume to continue processing

### Worker ID Format
```
{hostname}_{type}_{engine}_{number}
```

Examples:
- `LAPTOP_gpu0_deepface_1`
- `LAPTOP_gpu0_face_recognition_2`

IDs auto-index based on **active** workers (reuses slots when workers stop).

## 🛠️ Troubleshooting

**Import errors**  
→ Ensure correct conda environment activated

**GPU not detected**  
→ Check `nvidia-smi` and CUDA installation

**Worker not showing in UI**  
→ Check Redis connection and heartbeat logs

**Jobs failing**  
→ Check logs, verify engine dependencies installed

**"No face detected" errors**  
→ Ensure selfie has clear, visible face  
→ Try different lighting/angle

## 🔄 Signal Handling

Worker handles graceful shutdown:
- **SIGINT** (Ctrl+C): Completes current job, then exits
- **SIGTERM**: Same as SIGINT
- **Cleanup**: Removes worker from Redis, clears pause flags

## 📁 Shared Resources

### Core Modules
- `base_engine.py`: Abstract interface all engines implement
- `worker_manager.py`: Lifecycle, registration, heartbeat, cleanup
- `job_processor.py`: Job processing logic with pause checks

### Engine Interface
All engines must implement:
```python
class Engine(BaseEngine):
    def search_faces(
        selfie_base64: str,
        gallery_images: List[Dict],
        exclude_images: List[str]
    ) -> List[Dict[str, float]]:
        # Return sorted results
        pass
```

## 🚀 Production Deployment

### Multiple Workers
Run multiple workers for load balancing:
```bash
# Terminal 1
conda activate tf
python worker.py --engine deepface

# Terminal 2
conda activate ml
python worker.py --engine face_recognition
```

### Auto-Restart (Linux/systemd)
```ini
[Unit]
Description=Face Search Worker (DeepFace)
After=network.target redis.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/face-search-worker
ExecStart=/path/to/conda/envs/tf/bin/python worker.py --engine deepface
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## 📝 Development

### Adding New Engine

1. Create `engines/new_engine/` directory
2. Create `engine.py` implementing `BaseEngine`
3. Create `requirements.txt`
4. Update `worker.py` engine loading logic

### Testing

```bash
# Test engine directly
python -c "from engines.face_recognition.engine import FaceRecognitionEngine; e = FaceRecognitionEngine(); print(e.name)"

# Test with mock job
python worker.py --engine face_recognition
# Create test job via Queue UI
```

## 📄 License

Part of Jain-Convocation-Portal project.
