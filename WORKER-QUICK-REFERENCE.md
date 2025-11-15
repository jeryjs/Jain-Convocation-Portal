# Face Search Worker - Quick Reference

## 🚀 Quick Start

### Run Worker (Interactive)
```bash
python worker.py
```

### Run Worker (Direct)
```bash
# DeepFace
conda activate tf
python worker.py --engine deepface

# face_recognition  
conda activate ml
python worker.py --engine face_recognition
```

### Deployment Scripts
```bash
# Windows
deploy.bat

# Linux/Mac
./deploy.sh
```

## 📁 Project Structure

```
face-search-worker/
├── worker.py                      # Main entry point
├── core/
│   ├── base_engine.py            # Engine interface
│   ├── worker_manager.py         # Lifecycle management
│   └── job_processor.py          # Job processing
├── engines/
│   ├── deepface/engine.py        # TensorFlow engine
│   └── face_recognition/engine.py # dlib engine
├── exclude_faces/                 # Shared exclusions
├── metrics.py                     # System metrics
└── .env                          # Configuration
```

## 🔧 Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
GPU_INDEX=0
WORKER_CONCURRENCY=1
USE_CPU=0
```

## 🎯 Worker ID Format

```
{hostname}_{type}_{engine}_{number}

Examples:
- LAPTOP_gpu0_deepface_1
- LAPTOP_gpu0_face_recognition_2
```

## 📤 Response Format

```json
[
  {"id": "photo_001.jpg", "similarity": 0.9523},
  {"id": "photo_042.jpg", "similarity": 0.8734},
  ...
]
```
Sorted descending by similarity (best first).

## 🎛️ Controls

| Action | Method |
|--------|--------|
| Pause worker | Click ⏸️ in Queue UI |
| Resume worker | Click ▶️ in Queue UI |
| Stop worker | Ctrl+C (graceful) |
| View metrics | Queue UI dashboard |

## 🚫 Exclude Faces

Add images to `exclude_faces/`:
```
exclude_faces/
├── person1.jpg
├── person2.jpg
└── unwanted/
    └── group.jpg
```

## 📊 Monitoring

View at: http://localhost:3000

Metrics updated every 5 seconds:
- CPU, RAM, GPU usage
- Jobs processed/failed
- Current job
- Uptime

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Import error | Check conda env activated |
| GPU not found | Verify CUDA with `nvidia-smi` |
| Worker missing | Check Redis connection |
| Job fails | Check selfie has visible face |

## 📝 Adding New Engine

1. Create `engines/my_engine/`
2. Add `engine.py` implementing `BaseEngine`
3. Add `requirements.txt`
4. Update `worker.py` engine loader

## 🔄 Signal Handling

- **Ctrl+C**: Graceful shutdown
- **SIGTERM**: Graceful shutdown
- **Auto cleanup**: Worker removed from Redis

## 📚 Documentation

- `README.md` - Full documentation
- `WORKER-MIGRATION.md` - Migration guide
- `WORKER-PAUSE-BEHAVIOR.md` - Pause behavior
- `WORKER-ARCHITECTURE.md` - Architecture details

## 💡 Tips

- Use `deploy.bat`/`deploy.sh` for quick deployment
- Multiple workers for load balancing
- Check Queue UI for real-time status
- Exclude faces shared across engines
- Worker IDs auto-reuse available slots

## 🎯 Design Goals

✅ No code duplication  
✅ Reusable components  
✅ Engine abstraction  
✅ Graceful shutdown  
✅ Smart ID management  
✅ Shared resources  
