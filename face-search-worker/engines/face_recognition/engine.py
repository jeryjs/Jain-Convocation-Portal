"""
face_recognition Engine
Uses dlib-based face_recognition library with maximum performance optimizations
"""

import os
import cv2
import gc
import face_recognition
import numpy as np
import hashlib
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
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
    
    def __init__(self, use_gpu: bool = True, max_workers: int = 38, batch_size: int = 8, max_image_size: int = 640):
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
            
            return None
            
        except Exception as e:
            logger.warning(f"Error processing {img_id}: {e}")
            return None
        finally:
            self._cleanup_gpu_memory()

    def _process_batch(self, batch_items, selfie_encoding, exclude_encodings):
        """Process a batch of images in parallel"""
        results = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Prepare arguments
            tasks = [
                (item['id'], item['image'], selfie_encoding, exclude_encodings)
                for item in batch_items
            ]
            
            # Submit all tasks
            futures = [
                executor.submit(self._process_single_gallery_image, task)
                for task in tasks
            ]
            
            # Collect results as they complete
            for future in as_completed(futures):
                result = future.result()
                if result:
                    results.append(result)
        
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
        
        # Process gallery images in batches with parallel processing
        results = []
        total = len(gallery_images)
        logger.info(f"Processing {total} images in batches of {self.batch_size} with {self.max_workers} workers...")
        
        for batch_start in range(0, total, self.batch_size):
            batch_end = min(batch_start + self.batch_size, total)
            batch = gallery_images[batch_start:batch_end]
            
            # Process batch in parallel
            batch_results = self._process_batch(batch, selfie_encoding, exclude_encodings)
            results.extend(batch_results)
            
            # Progress update
            progress_pct = (batch_end / total) * 100
            logger.info(f"Progress: {batch_end}/{total} ({progress_pct:.1f}%) - Found {len(batch_results)} matches in this batch")
            
            # Cleanup after each batch
            self._cleanup_gpu_memory()
        
        # Sort by similarity in descending order (best matches first)
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        logger.info(f"✓ Found {len(results)} matches")
        
        # Final cleanup
        del selfie_encoding
        del exclude_encodings
        self._cleanup_gpu_memory()
        
        return results
