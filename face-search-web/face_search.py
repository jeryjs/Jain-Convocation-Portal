import face_recognition
import cv2
import os
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import logging
from threading import Event
from typing import Optional
import gc
import torch
# from tqdm import tqdm

logger = logging.getLogger(__name__)

# Enable GPU optimization for face_recognition
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

def cleanup_gpu_memory():
    # Clear CUDA cache
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    # Force garbage collection
    gc.collect()

def preprocess_image(image_path: str, max_size: int = 640):
    try:
        img = cv2.imread(image_path)
        if img is None:
            logger.error(f"Failed to load image: {image_path}")
            return None
        
        h, w = img.shape[:2]
        if h > max_size or w > max_size:
            scale = max_size / max(h, w)
            new_size = (int(w * scale), int(h * scale))
            img = cv2.resize(img, new_size, interpolation=cv2.INTER_AREA)
        
        # Convert to RGB and release memory
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        del img
        return rgb_img
    except Exception as e:
        logger.error(f"Error preprocessing {image_path}: {str(e)}")
        return None

def process_single_image(args):
    path, selfie_encoding, exclude_encodings = args
    try:
        img = preprocess_image(path)
        if img is not None:
            encodings = face_recognition.face_encodings(img)
            del img  # Release image memory immediately

            # Exclude images that match any face in exclude_encodings
            if encodings and exclude_encodings:
                for encoding in encodings:
                    distances = face_recognition.face_distance(exclude_encodings, encoding)
                    if np.any(distances < 0.5):  # threshold can be adjusted
                        return None

            if encodings:
                distances = face_recognition.face_distance(encodings, selfie_encoding)
                similarity = 1 - min(distances)
                del encodings  # Release encodings memory

                if similarity > 0:
                    return path, similarity

        return None
    except Exception as e:
        logger.error(f"Error processing {os.path.basename(path)}: {str(e)}")
        return None
    finally:
        cleanup_gpu_memory()

def process_image_batch(image_paths, selfie_encoding, exclude_encodings, max_workers=8, batch_size=50, cancelled=None):
    total = len(image_paths)
    results = []
    
    logger.info(f"Processing {total} images in batches of {batch_size}")
    
    # Process images in smaller batches
    for i in range(0, total, batch_size):
        if cancelled and cancelled.is_set():
            logger.info("Search cancelled")
            return results
            
        batch = image_paths[i:i + batch_size]
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [
                executor.submit(process_single_image, (path, selfie_encoding, exclude_encodings))
                for path in batch
            ]
            
            for future in as_completed(futures):
                if cancelled and cancelled.is_set():
                    executor.shutdown(wait=False)
                    return results
                    
                result = future.result()
                if result:
                    results.append(result)
            
        logger.info(f"Progress: {min(i + batch_size, total)}/{total} ({(min(i + batch_size, total)/total)*100:.1f}%)")
        cleanup_gpu_memory()
    
    return results
def find_similar_faces(selfie_path: str, photos_dir: str, exclude_dir: str, cancelled: Optional[Event] = None, top_k: int = 10):
    try:
        start_time = time.time()
        logger.info("Starting face search...")
        
        if cancelled and cancelled.is_set():
            raise ValueError("Search cancelled before starting")
        
        selfie = preprocess_image(selfie_path)
        if selfie is None:
            raise ValueError("Failed to load selfie image")
        
        selfie_faces = face_recognition.face_encodings(selfie)
        del selfie  # Release selfie image memory
        
        if not selfie_faces:
            raise ValueError("No face found in selfie")
        logger.info("✓ Found face in selfie")
        
        valid_extensions = ('.png', '.jpg', '.jpeg')
        photos = []
        for root, dirs, files in os.walk(photos_dir):
            for f in files:
                if f.lower().endswith(valid_extensions):
                    photos.append(os.path.join(root, f))
        logger.info(f"Found {len(photos)} photos to search")

        # Precompute encodings to exclude (selfie faces)
        exclude_encodings = []
        if exclude_dir:
            for root, dirs, files in os.walk(exclude_dir):
                for f in files:
                    if f.lower().endswith(valid_extensions):
                        img_path = os.path.join(root, f)
                        img = preprocess_image(img_path)
                        if img is not None:
                            encodings = face_recognition.face_encodings(img)
                            del img  # Release image memory
                            exclude_encodings.extend(encodings)
            logger.info(f"Loaded {len(exclude_encodings)} exclude encodings from {exclude_dir}")

        matches = process_image_batch(photos, selfie_faces[0], exclude_encodings, cancelled=cancelled)
        del selfie_faces  # Release selfie encodings memory
        
        if cancelled and cancelled.is_set():
            raise ValueError("Search cancelled during processing")
        
        matches = sorted(matches, key=lambda x: x[1], reverse=True)[:top_k]
        
        logger.info(f"✓ Search completed in {time.time() - start_time:.1f} seconds")
        return matches
    finally:
        cleanup_gpu_memory()
