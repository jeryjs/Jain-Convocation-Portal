"""
Job Processor
Handles BullMQ job processing logic
"""

import os
import time
from typing import Dict, Any, List
from bullmq import Job, custom_errors


class WorkerPausedError(Exception):
    """Exception raised when worker is paused - prevents job completion"""
    pass


async def process_job(
    job: Job,
    token: str,
    engine,
    redis_client,
    worker_id: str,
    worker_stats: Dict[str, Any],
    exclude_faces_dir: str,
    convocation_photos_dir: str,
    logger
) -> List[Dict[str, float]] | None:
    """
    Process a face search job
    
    Args:
        job: BullMQ job object
        token: Job token
        engine: Face recognition engine instance
        redis_client: Redis client
        worker_id: Unique worker ID
        worker_stats: Worker statistics dict
        exclude_faces_dir: Path to exclude faces directory
        logger: Logger instance
    
    Returns:
        List of {'id': str, 'similarity': float} sorted by similarity
    """
    # Check if worker is paused - delay and retry
    if redis_client and redis_client.get(f'worker:{worker_id}:paused') == '1':
        logger.info(f"⏸️  Worker is paused, re-queueing job {job.id}")
        # Move job to delayed state - it will be picked up again after the delay
        delay = 5000  # 5 seconds
        delay_until_ms = int(time.time() * 1000) + delay  # 5 seconds from now
        await job.scripts.moveToDelayed(job.id, delay_until_ms, delay, token)
        # Raise custom exception to prevent job from completing
        # BullMQ will not mark the job as completed when this exception is raised
        raise WorkerPausedError("Worker is paused - job delayed for retry")
    
    worker_stats['current_job'] = job.id
    
    try:
        data = job.data
        selfie_image = data.get('image')
        uid = data.get('uid')
        stage = data.get('stage')
        
        logger.info(f"\n{'='*60}")
        logger.info(f"📋 Processing Job: {job.id}")
        logger.info(f"👤 User: {uid}")
        logger.info(f"📍 Stage: {stage}")
        logger.info(f"🔧 Engine: {engine.name}")
        logger.info(f"{'='*60}\n")
        
        if not selfie_image:
            raise ValueError("No image provided")
        
        # Get excluded face images from exclude_faces directory
        exclude_images = []
        if os.path.exists(exclude_faces_dir):
            valid_extensions = ('.png', '.jpg', '.jpeg')
            for root, dirs, files in os.walk(exclude_faces_dir):
                for f in files:
                    if f.lower().endswith(valid_extensions):
                        exclude_images.append(os.path.join(root, f))
        
        logger.info(f"📂 Found {len(exclude_images)} exclude faces")
        
        # Fetch gallery images from convocation_photos_dir/stage
        # gallery_dir = os.path.join(convocation_photos_dir, "").replace('\\', '/')   # testing: use all images in gallery
        gallery_dir = os.path.join(convocation_photos_dir, stage).replace('\\', '/')
        gallery_images = []
        valid_extensions = ('.png', '.jpg', '.jpeg')
        if os.path.exists(gallery_dir):
            for root, dirs, files in os.walk(gallery_dir):
                for f in files:
                    if f.lower().endswith(valid_extensions):
                        image_path = os.path.join(root, f)
                        gallery_images.append({'id': os.path.relpath(image_path, convocation_photos_dir), 'image': image_path})
        else:
            logger.warning(f"Gallery directory does not exist: {gallery_dir}")
        
        logger.info(f"🖼️  Processing {len(gallery_images)} gallery images")
        
        # Perform face search
        results = engine.search_faces(
            selfie_base64=selfie_image,
            gallery_images=gallery_images,
            exclude_images=exclude_images
        )
        
        logger.info(f"\n✅ Job completed: {len(results)} matches found\n")
        
        worker_stats['jobs_processed'] += 1
        worker_stats['current_job'] = None
        
        return results
        
    except Exception as e:
        worker_stats['jobs_failed'] += 1
        worker_stats['current_job'] = None
        error_message = str(e)
        logger.error(f"\n❌ Job failed: {error_message}\n")
        # Re-raise with the error message so BullMQ can capture it as failedReason
        raise custom_errors.UnrecoverableError(error_message)
