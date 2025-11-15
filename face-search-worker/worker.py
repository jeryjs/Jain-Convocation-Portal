#!/usr/bin/env python3
"""
Face Search Worker
GPU-powered face recognition worker for BullMQ queue processing
"""

import os
import sys
import asyncio
import logging
import argparse
from dotenv import load_dotenv
from bullmq import Worker

# Add project root to path
sys.path.append(os.path.dirname(__file__))

from core.worker_manager import WorkerManager
from core.job_processor import process_job
from metrics import MetricsCollector

# Load environment variables
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname).1s-%(asctime)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')
GPU_INDEX = int(os.getenv('GPU_INDEX', 0))
WORKER_CONCURRENCY = int(os.getenv('WORKER_CONCURRENCY', 1))
USE_CPU = os.getenv('USE_CPU', '0') == '1'
EXCLUDE_FACES_DIR = os.path.join(os.path.dirname(__file__), 'exclude_faces')
CONVOCATION_PHOTOS_DIR = "Z:/Downloads/jain 14th convo"


def select_engine():
    """Interactive engine selection"""
    print("\n" + "="*60)
    print("🤖 Face Search Worker - Engine Selection")
    print("="*60)
    print("\nAvailable Engines:")
    print("  1. DeepFace (TensorFlow) - VGG-Face, Facenet, etc.")
    print("  2. face_recognition (dlib) - Fast and accurate")
    print()
    
    while True:
        try:
            choice = input("Select engine (1/2): ").strip()
            if choice == '1':
                return 'deepface'
            elif choice == '2':
                return 'face_recognition'
            else:
                print("❌ Invalid choice. Please enter 1 or 2.")
        except (KeyboardInterrupt, EOFError):
            print("\n\n❌ Selection cancelled")
            sys.exit(0)


def load_engine(engine_name: str, use_gpu: bool):
    """Dynamically load the selected engine"""
    logger.info(f"🔧 Loading {engine_name} engine...")
    
    try:
        if engine_name == 'deepface':
            from engines.deepface.engine import DeepFaceEngine as Engine
        elif engine_name == 'face_recognition':
            from engines.face_recognition.engine import FaceRecognitionEngine as Engine
        else:
            raise ValueError(f"Unknown engine: {engine_name}")
        
        return Engine(use_gpu=use_gpu)
    except ImportError as e:
        logger.error(f"\n❌ Failed to import {engine_name} engine!")
        logger.error(f"Error: {e}")
        logger.error(f"\nMake sure you've installed the dependencies:")
        logger.error(f"  cd engines/{engine_name}")
        logger.error(f"  pip install -r requirements.txt\n")
        sys.exit(1)


async def main():
    """Main worker function"""
    parser = argparse.ArgumentParser(description='Face Search Worker')
    parser.add_argument('--engine', choices=['deepface', 'face_recognition'], 
                       help='Engine to use (skip interactive selection)')
    args = parser.parse_args()
    
    # Select engine
    if args.engine:
        engine_name = args.engine
        logger.info(f"🎯 Using engine: {engine_name}")
    else:
        engine_name = select_engine()
    
    print()  # Blank line for spacing
    
    manager = None
    try:
        # Initialize metrics collector
        logger.info("📊 Initializing metrics collector...")
        metrics_collector = MetricsCollector(gpu_index=GPU_INDEX)
        logger.info("✅ Metrics collector ready!\n")
        
        # Initialize worker manager
        manager = WorkerManager(
            redis_host=REDIS_HOST,
            redis_port=REDIS_PORT,
            redis_password=REDIS_PASSWORD,
            gpu_index=GPU_INDEX,
            use_cpu=USE_CPU,
            concurrency=WORKER_CONCURRENCY,
            engine_name=engine_name,
            metrics_collector=metrics_collector,
            logger=logger
        )
        
        # Setup signal handlers for graceful shutdown
        manager.setup_signal_handlers()
        
        # Initialize Redis and get worker ID
        redis_client = manager.initialize_redis()
        
        # Load face recognition engine
        engine = load_engine(engine_name, use_gpu=not USE_CPU)
        
        # Register worker
        manager.register_worker()
        
        # Start heartbeat
        manager.start_heartbeat()
        
        # Create job processor wrapper
        async def job_processor(job, token):
            return await process_job(
                job=job,
                token=token,
                engine=engine,
                redis_client=redis_client,
                worker_id=manager.worker_id or 'unknown',
                worker_stats=manager.worker_stats,
                exclude_faces_dir=EXCLUDE_FACES_DIR,
                convocation_photos_dir=CONVOCATION_PHOTOS_DIR,
                logger=logger
            )

        # Synchronous wrapper for the async job processor
        def job_processor_sync(job, token):
            return asyncio.get_event_loop().create_task(job_processor(job, token))
        
        # Create BullMQ worker
        logger.info("⚙️  Starting BullMQ worker...\n")
        
        worker = Worker(
            name='face-search',
            processor=job_processor_sync,
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
        
        logger.info("✅ Worker is running! Waiting for jobs...\n")
        logger.info("Press Ctrl+C to stop\n")
        
        # Keep worker running
        while manager.running:
            await asyncio.sleep(1)
        
    except KeyboardInterrupt:
        logger.info("\n\n⚠️  Interrupted by user")
    except Exception as e:
        logger.error(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if manager is not None:
            manager.cleanup()
        sys.exit(0)


if __name__ == '__main__':
    asyncio.run(main())
