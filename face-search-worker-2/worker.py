# pyright: reportAttributeAccessIssue=false
"""
Face Search Worker (face_recognition version)
GPU-powered Python worker using face_recognition library
"""

import os
import sys
import time
import json
import socket
import signal
import threading
import asyncio
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
import redis
from bullmq import Worker, Job
import logging

from face_search import FaceSearchEngine
from metrics import MetricsCollector

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
WORKER_ID = f"{HOSTNAME}_{'cpu' if USE_CPU else 'gpu'}{GPU_INDEX}_fr_{PROCESS_ID}"  # _fr for face_recognition

# Global instances
redis_client: Optional[redis.Redis] = None
face_engine: Optional[FaceSearchEngine] = None
metrics_collector: Optional[MetricsCollector] = None
worker_stats = {
    'jobs_processed': 0,
    'jobs_failed': 0,
    'current_job': None,
    'start_time': time.time()
}


def initialize_redis() -> redis.Redis:
    """Initialize Redis connection"""
    logger.info(f"🔌 Connecting to Redis at {REDIS_HOST}:{REDIS_PORT}...")
    
    client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD if REDIS_PASSWORD else None,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5
    )
    
    # Test connection
    client.ping()
    logger.info("✅ Redis connected!")
    
    return client


def register_worker():
    """Register worker with Redis"""
    if not metrics_collector or not redis_client:
        return
        
    gpu_info = metrics_collector.get_gpu_metrics()
    
    worker_info = {
        'id': WORKER_ID,
        'hostname': HOSTNAME,
        'status': 'online',
        'gpu_index': GPU_INDEX if not USE_CPU else None,
        'gpu_name': gpu_info['name'] if gpu_info else 'CPU',
        'use_cpu': USE_CPU,
        'concurrency': WORKER_CONCURRENCY,
        'engine': 'face_recognition',  # Identify this worker type
        'start_time': worker_stats['start_time'],
        'last_heartbeat': time.time(),
        'jobs_processed': 0,
        'jobs_failed': 0,
        'current_job': None
    }
    
    redis_client.hset('workers', WORKER_ID, json.dumps(worker_info))
def heartbeat_loop():
    """Send heartbeat to Redis every 5 seconds"""
    while True:
        try:
            if not metrics_collector or not redis_client:
                time.sleep(5)
                continue
                
            metrics = metrics_collector.get_all_metrics()
            
            worker_info = {
                'id': WORKER_ID,
                'hostname': HOSTNAME,
                'status': 'online',
                'gpu_index': GPU_INDEX if not USE_CPU else None,
                'gpu_name': metrics['gpu']['name'] if metrics['gpu'] else 'CPU',
                'use_cpu': USE_CPU,
                'concurrency': WORKER_CONCURRENCY,
                'engine': 'face_recognition',
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
            logger.warning(f"⚠️  Heartbeat error: {e}")

def process_job(job: Job, token: str):
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
        if not face_engine:
            raise RuntimeError("Face engine not initialized")
            
        data = job.data
        selfie_image = data.get('image')
        uid = data.get('uid')
        stage = data.get('stage')
        
        logger.info(f"\n{'='*60}")
        logger.info(f"📋 Processing Job: {job.id}")
        logger.info(f"👤 User: {uid}")
        logger.info(f"📍 Stage: {stage}")
        logger.info(f"🔧 Engine: face_recognition")
        logger.info(f"{'='*60}\n")
        
        if not selfie_image:
            raise ValueError("No image provided")
        
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
                pass
            except Exception:
                pass
        
        results = face_engine.search_faces(
            selfie_base64=selfie_image,
            gallery_images=gallery_images,
            progress_callback=progress_callback
        )
        
        logger.info(f"\n✅ Job completed: {len(results)} matches found\n")
        
        worker_stats['jobs_processed'] += 1
        worker_stats['current_job'] = None
        
        return results
        
    except Exception as e:
        worker_stats['jobs_failed'] += 1
        worker_stats['current_job'] = None
        logger.error(f"\n❌ Job failed: {e}\n")
        raise
        
def signal_handler(signum, frame):
    """Handle shutdown signals"""
    raise KeyboardInterrupt()

def cleanup_worker():
    """Cleanup worker on shutdown"""
    logger.info("\n🛑 Shutting down worker...")
    
    # Mark worker as offline
    try:
        if redis_client:
            worker_info_str = redis_client.hget('workers', WORKER_ID)
            if isinstance(worker_info_str, str):
                worker_info = json.loads(worker_info_str)
                worker_info['status'] = 'offline'
                worker_info['last_heartbeat'] = time.time()
                redis_client.hset('workers', WORKER_ID, json.dumps(worker_info))
    except Exception:
        pass
    
    # Cleanup metrics
    if metrics_collector:
        metrics_collector.cleanup()
    
    logger.info("✅ Cleanup complete")

async def main():
    """Main worker entry point"""
    global redis_client, face_engine, metrics_collector
    
    # Print banner
    print("\n" + "="*60)
    print("🚀 Face Search Worker (face_recognition)")
    print("="*60)
    print(f"Worker ID: {WORKER_ID}")
    print(f"Hostname: {HOSTNAME}")
    print(f"GPU Index: {GPU_INDEX if not USE_CPU else 'N/A (CPU)'}")
    print(f"Concurrency: {WORKER_CONCURRENCY}")
    print(f"Redis: {REDIS_HOST}:{REDIS_PORT}")
    print(f"Engine: face_recognition")
    print("="*60 + "\n")
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Initialize Redis
        redis_client = initialize_redis()
        
        # Initialize metrics collector
        logger.info("📊 Initializing metrics collector...")
        metrics_collector = MetricsCollector(gpu_index=GPU_INDEX)
        logger.info("✅ Metrics collector ready!\n")
        
        # Initialize face search engine
        logger.info("🔍 Initializing face search engine (face_recognition)...")
        face_engine = FaceSearchEngine(use_gpu=not USE_CPU)
        logger.info("✅ Face search engine ready!\n")
        
        # Register worker
        register_worker()
        
        # Start heartbeat thread
        heartbeat_thread = threading.Thread(target=heartbeat_loop, daemon=True)
        heartbeat_thread.start()
        logger.info("💓 Heartbeat started\n")
        
        # Create BullMQ worker
        logger.info("⚙️  Starting BullMQ worker...\n")
        
        worker = Worker(
            'face-search',
            process_job,    # type: ignore
            {
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
        
        logger.info("✅ Worker is running! Waiting for jobs...\n")
        logger.info("Press Ctrl+C to stop\n")
        
        # Keep the main loop running
        while True:
            await asyncio.sleep(1)
        
    except KeyboardInterrupt:
        logger.info("\n\n⚠️  Interrupted by user")
        cleanup_worker()
    except Exception as e:
        logger.error(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        cleanup_worker()
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())
