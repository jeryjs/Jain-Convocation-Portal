# Migration Guide: New Worker Architecture

## 🎯 What Changed?

### Before ❌
```
face-search-worker/          # Redundant code
face-search-worker-2/         # Duplicate implementation
├── worker.py (DeepFace)
├── worker.py (face_recognition)  
├── face_search.py (duplicated logic)
└── ...
```

### After ✅  
```
face-search-worker/           # Single, unified codebase
├── worker.py                 # One worker for all engines
├── core/                     # Shared logic (DRY)
│   ├── base_engine.py
│   ├── worker_manager.py
│   └── job_processor.py
└── engines/                  # Pluggable engines
    ├── deepface/
    └── face_recognition/
```

## 🔄 Key Improvements

### 1. No Code Duplication
- **Before**: Two separate worker.py files with 80% identical code
- **After**: One worker.py, engine-specific code isolated

### 2. Correct Face Matching Logic
- **Before**: Tried to return top N matches (wrong approach)
- **After**: Returns ALL matches sorted by similarity % (correct)
- **Uses**: `face_distance` for similarity calculation

### 3. Proper Exclude Faces
- **Before**: Mixed implementations, not consistent
- **After**: Shared `exclude_faces/` directory, both engines use it

### 4. Smart Worker IDs
- **Before**: Used counters, created "corpse" workers
- **After**: Auto-indexed based on active workers, reuses slots

### 5. Dynamic Engine Loading
- **Before**: Hard-coded engine selection
- **After**: Interactive selection or `--engine` flag

### 6. Graceful Shutdown
- **Before**: Abrupt exits, workers left in Redis
- **After**: Signal handling, cleanup on exit

## 📦 What Was Removed?

### Deleted Directories
- ❌ `face-search-worker-2/` - Redundant worker
- ❌ `engine_1/` - Old structure  
- ❌ `engine_2/` - Old structure

### Deleted Files
- ❌ Old `worker.py` from root
- ❌ Old `face_search.py` (logic moved to engines)
- ❌ Redundant metrics files

### What Stays
- ✅ `metrics.py` - System metrics (shared)
- ✅ `exclude_faces/` - Shared exclusion directory
- ✅ `.env` - Configuration

## 🚀 Migration Steps

### 1. Stop All Old Workers
```bash
# Press Ctrl+C on all running workers
# Or kill processes
```

### 2. Clean Redis
Remove old worker entries:
```bash
# Via Queue UI
POST /api/admin/workers/clean

# Or manually via redis-cli
redis-cli
> HGETALL workers
> HDEL workers <old_worker_ids>
```

### 3. Update Dependencies

**For DeepFace:**
```bash
conda activate tf
cd engines/deepface
pip install -r requirements.txt
```

**For face_recognition:**
```bash
conda activate ml
cd engines/face_recognition
pip install -r requirements.txt
```

### 4. Test New Worker

```bash
# Interactive mode
python worker.py

# Or direct mode
python worker.py --engine face_recognition
```

### 5. Verify in Queue UI
- Check worker appears with new ID format
- Test pause/resume functionality
- Create test job and verify processing

## 🔧 Configuration Changes

### Environment Variables (Same)
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
GPU_INDEX=0
WORKER_CONCURRENCY=1
USE_CPU=0
```

### New Worker ID Format
```
Before: LAPTOP_gpu0_face_recognition_12345 (process ID)
After:  LAPTOP_gpu0_face_recognition_1     (slot number)
```

## 🎯 New Features

### 1. Interactive Engine Selection
```bash
python worker.py

# Prompts:
Select engine:
  1. DeepFace (TensorFlow)
  2. face_recognition (dlib)
Enter choice (1/2): _
```

### 2. Auto-Index Worker IDs
- Worker 1 starts: `LAPTOP_gpu0_deepface_1`
- Worker 2 starts: `LAPTOP_gpu0_deepface_2`
- Worker 1 stops: Slot 1 freed
- Worker 3 starts: `LAPTOP_gpu0_deepface_1` (reuses slot!)

### 3. Deployment Scripts
```bash
# Windows
deploy.bat

# Linux/Mac
./deploy.sh
```

### 4. Proper Signal Handling
- Ctrl+C: Completes current job, then exits cleanly
- Worker removed from Redis automatically
- No orphaned workers

## 📊 Response Format Change

### Before (Incorrect)
```json
{
  "top_matches": [
    {"id": "img_001", "score": 0.95}
  ]
}
```

### After (Correct)
```json
[
  {"id": "img_001", "similarity": 0.9523},
  {"id": "img_042", "similarity": 0.8734},
  {"id": "img_123", "similarity": 0.8201},
  ...all matches sorted by similarity...
]
```

## ⚠️ Breaking Changes

### 1. Worker ID Format
Old workers won't be recognized. Clean Redis before deploying.

### 2. Response Structure
Frontend might need updates if it expected different response format.

### 3. Engine Import Paths
If you have custom scripts importing engines, update paths:
```python
# Before
from face_search import FaceSearchEngine

# After
from engines.face_recognition.engine import FaceRecognitionEngine
```

## 🐛 Troubleshooting

### "Module not found" errors
```bash
# Ensure you're in correct environment
conda activate tf  # or ml

# Reinstall dependencies
cd engines/deepface  # or face_recognition
pip install -r requirements.txt
```

### Worker not appearing in UI
```bash
# Check Redis connection
redis-cli ping

# Check worker logs
python worker.py --engine face_recognition
# Look for "Worker registered" message
```

### Old workers still showing
```bash
# Clean stale workers
curl -X POST http://localhost:3000/api/admin/workers/clean
```

## ✅ Verification Checklist

- [ ] Old workers stopped
- [ ] Redis cleaned of old worker entries  
- [ ] Dependencies installed for chosen engine(s)
- [ ] New worker starts without errors
- [ ] Worker appears in Queue UI with new ID format
- [ ] Test job processes successfully
- [ ] Pause/resume works
- [ ] Exclude faces directory has sample images
- [ ] Graceful shutdown works (Ctrl+C)
- [ ] Worker ID reuse works after restart

## 🎉 Benefits Summary

✅ **90% less code duplication**  
✅ **Correct face matching algorithm**  
✅ **Cleaner architecture**  
✅ **Easier to maintain**  
✅ **Easier to add new engines**  
✅ **Better error handling**  
✅ **Proper shutdown behavior**  
✅ **No corpse workers**  

## 📞 Need Help?

Check the updated `README.md` for full documentation, or review:
- `core/base_engine.py` - Engine interface
- `core/worker_manager.py` - Lifecycle management
- `core/job_processor.py` - Job processing logic
- `engines/*/engine.py` - Engine implementations

Happy deploying! 🚀
