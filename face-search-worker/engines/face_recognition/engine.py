"""
face_recognition Engine
Uses dlib-based face_recognition library with maximum performance optimizations
True parallelism via multiprocessing with persistent worker pool
"""

import os
import cv2
import gc
import face_recognition
import numpy as np
import hashlib
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from multiprocessing import Pool
import logging

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from core.base_engine import BaseEngine

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

logger = logging.getLogger(__name__)


class FaceRecognitionEngine(BaseEngine):
    """Face recognition engine using face_recognition library with maximum performance"""
    
    def __init__(self, use_gpu: bool = True, max_workers: int = 8, batch_size: int = 50, max_image_size: int = 640, use_multiprocessing: bool = True):
        super().__init__(use_gpu)
        self.name = "face_recognition"
        self.max_workers = max_workers
        self.batch_size = batch_size
        self.max_image_size = max_image_size

        # Initialize cache with separate sections
        self.cache = {
            'selfie_encodings': {},      # hash -> encoding
            'gallery_encodings': {},     # hash -> list of encodings
            'exclude_encodings': {},     # hash -> list of encodings
        }
        
        # Enable GPU if available
        if use_gpu:
            os.environ["CUDA_VISIBLE_DEVICES"] = "0"
        
        logger.info(f"✅ {self.name} engine initialized (GPU: {use_gpu}, Workers: {max_workers}, Batch: {batch_size})")

    def _cleanup_gpu_memory(self):
        """Aggressively cleanup GPU memory"""
        if TORCH_AVAILABLE:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        gc.collect()

    def _compute_image_hash(self, img_data: str) -> str:
        """Compute SHA256 hash of image data for caching"""
        if isinstance(img_data, str):
            # For base64 strings
            if ',' in img_data:
                img_data = img_data.split(',')[1]
            return hashlib.sha256(img_data.encode()).hexdigest()
        else:
            # For file paths
            return hashlib.sha256(str(img_data).encode()).hexdigest()

    def _get_cached_encoding(self, cache_key: str, img_data: str, cache_type: str = 'gallery'):
        """Get cached encoding or compute and cache it"""
        img_hash = self._compute_image_hash(img_data)
        
        # Check cache
        if img_hash in self.cache[cache_type]:
            logger.debug(f"Cache hit for {cache_type}: {img_hash[:8]}...")
            return self.cache[cache_type][img_hash]
        
        # Not in cache, compute it
        return None

    def _cache_encoding(self, img_data: str, encoding, cache_type: str = 'gallery'):
        """Cache an encoding"""
        img_hash = self._compute_image_hash(img_data)
        self.cache[cache_type][img_hash] = encoding
        logger.debug(f"Cached {cache_type}: {img_hash[:8]}...")

    def _preprocess_image(self, img_array: np.ndarray) -> np.ndarray:
        """Preprocess image for faster face recognition"""
        h, w = img_array.shape[:2]
        if h > self.max_image_size or w > self.max_image_size:
            scale = self.max_image_size / max(h, w)
            new_size = (int(w * scale), int(h * scale))
            img_array = cv2.resize(img_array, new_size, interpolation=cv2.INTER_AREA)
        return img_array

    def _process_single_gallery_image(self, args):
        """Process a single gallery image (for parallel execution)"""
        img_id, img_path_or_base64, selfie_encoding, exclude_encodings = args
        
        gallery_img = None
        img_encodings = None
        
        try:
            # Check cache first
            cached_encodings = self._get_cached_encoding(img_id, img_path_or_base64, 'gallery_encodings')
            
            if cached_encodings is not None:
                img_encodings = cached_encodings
            else:
                # Load image from path or decode from base64
                if isinstance(img_path_or_base64, str) and (img_path_or_base64.strip().startswith('data:image') or len(img_path_or_base64.strip()) > 100):
                    # It's base64
                    gallery_img = self.decode_base64_image(img_path_or_base64)
                else:
                    # It's a file path
                    gallery_img = self.load_image_from_path(img_path_or_base64)
                
                gallery_img = self._preprocess_image(gallery_img)
                
                # Get encodings
                img_encodings = face_recognition.face_encodings(gallery_img)
                del gallery_img  # Release memory immediately
                gallery_img = None
                
                # Cache the encodings
                if img_encodings:
                    self._cache_encoding(img_path_or_base64, img_encodings, 'gallery_encodings')
            
            if not img_encodings:
                return None
            
            # Check exclusion
            if exclude_encodings:
                for gallery_enc in img_encodings:
                    distances = face_recognition.face_distance(exclude_encodings, gallery_enc)
                    if np.any(distances < 0.5):
                        del img_encodings
                        return None
            
            # Calculate similarity
            distances = face_recognition.face_distance(img_encodings, selfie_encoding)
            min_distance = min(distances)
            similarity = 1 - min_distance
            
            del img_encodings
            
            return {
                'id': img_id,
                'similarity': round(float(similarity), 4)
            }
            
        except Exception as e:
            logger.warning(f"Error processing {img_id}: {e}")
            return None
        finally:
            # Explicit cleanup for memory safety
            gallery_img = None
            img_encodings = None

    def _process_batch(self, batch_items, selfie_encoding, exclude_encodings, show_progress=False):
        """Process a batch of images in parallel with memory-safe result collection"""
        results = []
        total = len(batch_items)
        processed = 0
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_item = {
                executor.submit(self._process_single_gallery_image, 
                              (item['id'], item['image'], selfie_encoding, exclude_encodings)): item
                for item in batch_items
            }
            
            # Collect results as they complete with progress tracking
            for future in as_completed(future_to_item):
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                    processed += 1
                    
                    # Show progress every 10% or every 25 images
                    if show_progress and (processed % max(25, total // 10) == 0 or processed == total):
                        logger.info(f"Progress: {processed}/{total} ({100*processed/total:.1f}%) - {len(results)} matches so far")
                except Exception as e:
                    logger.warning(f"Error processing image: {e}")
                    processed += 1
                finally:
                    # Cleanup reference to help GC
                    del future_to_item[future]
        
        return results

    def _is_environment_compatible(self) -> bool:
        """Check if face_recognition is available in the environment"""
        try:
            import face_recognition  # noqa: F401
            return True
        except ImportError:
            return False
    
    def search_faces(
        self,
        selfie_base64: str,
        gallery_images: List[Dict[str, str]],
        exclude_images: Optional[List[str]] = None
    ) -> List[Dict[str, float]]:
        """
        Search for similar faces using face_recognition with maximum performance
        
        Returns list sorted by similarity in descending order
        """
        # Check cache for selfie encoding
        cached_selfie_encoding = self._get_cached_encoding('selfie', selfie_base64, 'selfie_encodings')
        
        if cached_selfie_encoding is not None:
            selfie_encoding = cached_selfie_encoding
            logger.info("✓ Selfie encoding retrieved from cache")
        else:
            # Decode and preprocess selfie
            selfie_img = self.decode_base64_image(selfie_base64)
            selfie_img = self._preprocess_image(selfie_img)
            logger.info("✓ Selfie decoded and preprocessed")
            
            # Get selfie encoding
            selfie_encodings = face_recognition.face_encodings(selfie_img)
            del selfie_img  # Release memory
            
            if not selfie_encodings:
                raise ValueError("No face detected in the provided selfie")
            
            selfie_encoding = selfie_encodings[0]
            del selfie_encodings
            
            # Cache the selfie encoding
            self._cache_encoding(selfie_base64, selfie_encoding, 'selfie_encodings')
            logger.info("✓ Selfie face encoded and cached")
        
        # Load exclude encodings with caching
        exclude_encodings = []
        if exclude_images:
            for img_path in exclude_images:
                try:
                    # Check cache first
                    cached_encodings = self._get_cached_encoding(img_path, img_path, 'exclude_encodings')
                    
                    if cached_encodings is not None:
                        exclude_encodings.extend(cached_encodings)
                    else:
                        img = self.load_image_from_path(img_path)
                        img = self._preprocess_image(img)
                        encodings = face_recognition.face_encodings(img)
                        del img
                        
                        if encodings:
                            # Cache the encodings
                            self._cache_encoding(img_path, encodings, 'exclude_encodings')
                            exclude_encodings.extend(encodings)
                except Exception as e:
                    logger.warning(f"Failed to load exclude image {img_path}: {e}")
            
            logger.info(f"✓ Loaded {len(exclude_encodings)} exclude face encodings")
        
        # Process images with memory-safe chunking for large datasets
        results = []
        total = len(gallery_images)
        
        # Use chunked processing for datasets > 500 images to prevent memory issues
        chunk_size = 500 if total > 500 else total
        num_chunks = (total + chunk_size - 1) // chunk_size
        
        if num_chunks > 1:
            logger.info(f"Processing {total} images in {num_chunks} chunks of ~{chunk_size} with {self.max_workers} workers...")
        else:
            logger.info(f"Processing {total} images with {self.max_workers} workers in parallel...")
        
        for chunk_idx in range(num_chunks):
            chunk_start = chunk_idx * chunk_size
            chunk_end = min(chunk_start + chunk_size, total)
            chunk = gallery_images[chunk_start:chunk_end]
            
            if num_chunks > 1:
                logger.info(f"Chunk {chunk_idx + 1}/{num_chunks}: Processing images {chunk_start + 1}-{chunk_end}...")
            
            # Process chunk with progress tracking
            chunk_results = self._process_batch(chunk, selfie_encoding, exclude_encodings, show_progress=(num_chunks == 1))
            results.extend(chunk_results)
            
            # Memory cleanup between chunks
            if num_chunks > 1:
                logger.info(f"Chunk {chunk_idx + 1}/{num_chunks} complete: Found {len(chunk_results)} matches")
                gc.collect()
        
        logger.info(f"✓ Processed all {total} images - Found {len(results)} total matches")
        
        # Sort by similarity in descending order (best matches first)
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        logger.info(f"✓ Found {len(results)} matches")
        
        # Final cleanup
        del selfie_encoding
        del exclude_encodings
        self._cleanup_gpu_memory()
        
        return results
    
    def __del__(self):
        self._cleanup_gpu_memory()