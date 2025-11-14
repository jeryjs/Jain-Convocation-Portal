# pyright: reportAttributeAccessIssue=false
# pyright: reportOptionalMemberAccess=false

"""
Face Search Worker
GPU-powered Python worker for processing face search jobs from BullMQ queue
"""

import asyncio
import os
import sys
import time
import json
import socket
import signal
import threading
from typing import Dict, Any, List
from dotenv import load_dotenv
import redis
from bullmq import Worker, Job

from face_search import FaceSearchEngine
from metrics import MetricsCollector

# Load environment variables
load_dotenv()

# Configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')
GPU_INDEX = int(os.getenv('GPU_INDEX', 0))
WORKER_CONCURRENCY = int(os.getenv('WORKER_CONCURRENCY', 1))
USE_CPU = os.getenv('USE_CPU', '0') == '1'

# Worker identification
HOSTNAME = socket.gethostname()
PROCESS_ID = os.getpid()  # Add process ID for uniqueness
WORKER_ID = f"{HOSTNAME}_{'cpu' if USE_CPU else 'gpu'}{GPU_INDEX}_{PROCESS_ID}"

# Global instances
redis_client = None
face_engine = None
metrics_collector = None
worker_stats = {
    'jobs_processed': 0,
    'jobs_failed': 0,
    'current_job': None,
    'start_time': time.time()
}


def initialize_redis() -> redis.Redis:
    """Initialize Redis connection"""
    print(f"🔌 Connecting to Redis at {REDIS_HOST}:{REDIS_PORT}...")
    
    client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD if REDIS_PASSWORD else None,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True
    )
    
    # Test connection
    client.ping()
    print("✅ Redis connected!")
    
    return client


def register_worker():
    """Register worker with Redis"""
    gpu_info = metrics_collector.get_gpu_metrics()
    
    worker_info = {
        'id': WORKER_ID,
        'hostname': HOSTNAME,
        'status': 'online',
        'gpu_index': GPU_INDEX if not USE_CPU else None,
        'gpu_name': gpu_info['name'] if gpu_info else 'CPU',
        'use_cpu': USE_CPU,
        'concurrency': WORKER_CONCURRENCY,
        'start_time': worker_stats['start_time'],
        'last_heartbeat': time.time(),
        'jobs_processed': 0,
        'jobs_failed': 0,
        'current_job': None
    }
    
    redis_client.hset('workers', WORKER_ID, json.dumps(worker_info))
    print(f"✅ Worker registered: {WORKER_ID}")


def heartbeat_loop():
    """Send heartbeat to Redis every 5 seconds"""
    while True:
        try:
            metrics = metrics_collector.get_all_metrics()
            
            worker_info = {
                'id': WORKER_ID,
                'hostname': HOSTNAME,
                'status': 'online',
                'gpu_index': GPU_INDEX if not USE_CPU else None,
                'gpu_name': metrics['gpu']['name'] if metrics['gpu'] else 'CPU',
                'use_cpu': USE_CPU,
                'concurrency': WORKER_CONCURRENCY,
                'start_time': worker_stats['start_time'],
                'uptime': time.time() - worker_stats['start_time'],
                'last_heartbeat': time.time(),
                'jobs_processed': worker_stats['jobs_processed'],
                'jobs_failed': worker_stats['jobs_failed'],
                'current_job': worker_stats['current_job'],
                'cpu_percent': metrics['cpu_percent'],
                'ram_percent': metrics['ram']['percent'],
                'ram_available_gb': metrics['ram']['available_gb'],
                'gpu_utilization': metrics['gpu']['utilization'] if metrics['gpu'] else None,
                'gpu_memory_used_mb': metrics['gpu']['memory_used_mb'] if metrics['gpu'] else None,
                'gpu_temperature': metrics['gpu']['temperature'] if metrics['gpu'] else None
            }
            
            redis_client.hset('workers', WORKER_ID, json.dumps(worker_info))
            
        except Exception as e:
            print(f"⚠️  Heartbeat error: {e}")
        
        time.sleep(5)


async def process_job(job: Job, token: str) -> List[Dict[str, float]]:
    """
    Process a face search job
    
    Job data format:
    {
        "image": "data:image/jpeg;base64,...",
        "uid": "user@example.com",
        "stage": "Day-1/Morning/Batch-A",
        "timestamp": 1699876543210
    }
    
    Returns:
    [
        {"id": "img_001", "score": 0.95},
        {"id": "img_042", "score": 0.87},
        ...
    ]
    """
    worker_stats['current_job'] = job.id
    
    try:
        data = job.data
        selfie_image = data.get('image')
        uid = data.get('uid')
        stage = data.get('stage')
        
        print(f"\n{'='*60}")
        print(f"📋 Processing Job: {job.id}")
        print(f"👤 User: {uid}")
        print(f"📍 Stage: {stage}")
        print(f"{'='*60}\n")
        
        if not selfie_image:
            raise ValueError("No image provided")
        
        # Update progress
        await job.update_progress(5)
        
        # For testing, return mock results
        # TODO: Replace with actual gallery images from your backend
        # gallery_images = fetch_gallery_images(stage)
        
        # Mock gallery for testing
        gallery_images = [
            {'id': 'img_001', 'image': selfie_image},  # Same image = high score
        ]
        
        # Perform face search
        def progress_callback(progress: int):
            # Update job progress
            try:
                import asyncio
                asyncio.create_task(job.update_progress(progress))
            except:
                pass
        
        results = face_engine.search_faces(
            selfie_base64=selfie_image,
            gallery_images=gallery_images,
            progress_callback=progress_callback
        )
        
        print(f"\n✅ Job completed: {len(results)} matches found\n")
        
        worker_stats['jobs_processed'] += 1
        worker_stats['current_job'] = None
        
        return results
        
    except Exception as e:
        worker_stats['jobs_failed'] += 1
        worker_stats['current_job'] = None
        print(f"\n❌ Job failed: {e}\n")
        raise


def cleanup_worker():
    """Cleanup worker on shutdown"""
    print("\n🛑 Shutting down worker...")
    
    # Mark worker as offline
    try:
        worker_info_str = redis_client.hget('workers', WORKER_ID)
        if worker_info_str and isinstance(worker_info_str, str):
            worker_info = json.loads(worker_info_str)
            worker_info['status'] = 'offline'
            worker_info['last_heartbeat'] = time.time()
            redis_client.hset('workers', WORKER_ID, json.dumps(worker_info))
    except:
        pass
    
    # Cleanup metrics
    if metrics_collector:
        metrics_collector.cleanup()
    
    print("✅ Cleanup complete")


def signal_handler(sig, frame):
    """Handle shutdown signals"""
    cleanup_worker()
    sys.exit(0)


async def main():
    """Main worker entry point"""
    global redis_client, face_engine, metrics_collector
    
    # Print banner
    print("\n" + "="*60)
    print("🚀 Face Search Worker")
    print("="*60)
    print(f"Worker ID: {WORKER_ID}")
    print(f"Hostname: {HOSTNAME}")
    print(f"GPU Index: {GPU_INDEX if not USE_CPU else 'N/A (CPU)'}")
    print(f"Concurrency: {WORKER_CONCURRENCY}")
    print(f"Redis: {REDIS_HOST}:{REDIS_PORT}")
    print("="*60 + "\n")
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Initialize Redis
        redis_client = initialize_redis()
        
        # Initialize metrics collector
        print("📊 Initializing metrics collector...")
        metrics_collector = MetricsCollector(gpu_index=GPU_INDEX)
        print("✅ Metrics collector ready!\n")
        
        # Initialize face search engine
        print("🔍 Initializing face search engine...")
        face_engine = FaceSearchEngine(use_gpu=not USE_CPU)
        print("✅ Face search engine ready!\n")
        
        # Register worker
        register_worker()
        
        # Start heartbeat thread
        heartbeat_thread = threading.Thread(target=heartbeat_loop, daemon=True)
        heartbeat_thread.start()
        print("💓 Heartbeat started\n")
        
        # Create BullMQ worker
        print("⚙️  Starting BullMQ worker...\n")
        
        worker = Worker(
            name='face-search',
            processor=process_job, # pyright: ignore[reportArgumentType]
            opts={
                'connection': {
                    'host': REDIS_HOST,
                    'port': REDIS_PORT,
                    'password': REDIS_PASSWORD if REDIS_PASSWORD else None
                },
                'concurrency': WORKER_CONCURRENCY,
                'lockDuration': 300000,  # 5 minutes
                'maxStalledCount': 1
            }
        )
        
        print("✅ Worker is running! Waiting for jobs...\n")
        print("Press Ctrl+C to stop\n")
        
        # Run worker (blocking)
        while True:
            await asyncio.sleep(1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        cleanup_worker()
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        cleanup_worker()
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
