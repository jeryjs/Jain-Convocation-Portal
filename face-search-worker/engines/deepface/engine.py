"""
DeepFace Engine
Uses TensorFlow-based DeepFace library with maximum performance optimizations
"""

import os
import cv2
import gc
import numpy as np
import hashlib
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from core.base_engine import BaseEngine

from deepface import DeepFace

try:
    import tensorflow as tf
    # Configure TensorFlow for maximum performance
    # Disable XLA JIT compilation to avoid libdevice issues
    # tf.config.optimizer.set_jit(True)  # Disabled - causes CUDA libdevice errors
    
    physical_devices = tf.config.list_physical_devices('GPU')
    if physical_devices:
        for device in physical_devices:
            tf.config.experimental.set_memory_growth(device, True)  # Dynamic memory allocation
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

logger = logging.getLogger(__name__)


class DeepFaceEngine(BaseEngine):
    """Face recognition engine using DeepFace library with maximum performance"""
    
    def __init__(self, use_gpu: bool = True, max_workers: int = 6, batch_size: int = 25, max_image_size: int = 640):
        super().__init__(use_gpu)
        self.name = "DeepFace"
        self.model_name = "Facenet"  # or VGG-Face, OpenFace, ArcFace, etc.
        self.max_workers = max_workers  # Optimized for TensorFlow GPU batching
        self.batch_size = batch_size  # Smaller batches for TF
        self.max_image_size = max_image_size

        # Initialize cache with separate sections
        self.cache = {
            'selfie_embeddings': {},     # hash -> embedding
            'gallery_embeddings': {},    # hash -> list of embeddings
            'exclude_embeddings': {},    # hash -> list of embeddings
        }
        
        # Configure GPU
        if not use_gpu:
            os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
        
        logger.info(f"✅ {self.name} engine initialized (Model: {self.model_name}, GPU: {use_gpu}, Workers: {max_workers}, Batch: {batch_size})")

    def _cleanup_memory(self):
        """Aggressively cleanup memory"""
        if TF_AVAILABLE:
            import tensorflow as tf
            tf.keras.backend.clear_session()
            if tf.config.list_physical_devices('GPU'):
                # No need to reset default graph in TF 2.x; just clear session
                pass
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

    def _get_cached_embedding(self, cache_key: str, img_data: str, cache_type: str = 'gallery'):
        """Get cached embedding or compute and cache it"""
        img_hash = self._compute_image_hash(img_data)
        
        # Check cache
        if img_hash in self.cache[cache_type]:
            logger.debug(f"Cache hit for {cache_type}: {img_hash[:8]}...")
            return self.cache[cache_type][img_hash]
        
        # Not in cache, compute it
        return None

    def _cache_embedding(self, img_data: str, embedding, cache_type: str = 'gallery'):
        """Cache an embedding"""
        img_hash = self._compute_image_hash(img_data)
        self.cache[cache_type][img_hash] = embedding
        logger.debug(f"Cached {cache_type}: {img_hash[:8]}...")

    def _preprocess_image(self, img_array: np.ndarray) -> np.ndarray:
        """Preprocess image for faster face recognition"""
        h, w = img_array.shape[:2]
        
        # Validate image dimensions
        if h < 10 or w < 10:
            raise ValueError(f"Image too small: {w}x{h}")
        
        if h > self.max_image_size or w > self.max_image_size:
            scale = self.max_image_size / max(h, w)
            new_size = (int(w * scale), int(h * scale))
            
            # Ensure minimum size after resize
            if new_size[0] < 10 or new_size[1] < 10:
                raise ValueError(f"Resized image too small: {new_size}")
            
            img_array = cv2.resize(img_array, new_size, interpolation=cv2.INTER_AREA)
        
        return img_array

    def _extract_embedding(self, img_array: np.ndarray, enforce_detection: bool = True):
        """Extract embedding from image with error handling"""
        embeddings = DeepFace.represent(
            img_path=img_array,
            model_name=self.model_name,
            enforce_detection=enforce_detection,
            detector_backend='skip'  # Skip detection for preprocessed images (faster)
        )
        
        if not embeddings or not isinstance(embeddings, list):
            return None
        
        # Extract embedding from result
        if isinstance(embeddings[0], dict) and "embedding" in embeddings[0]:
            return embeddings[0]["embedding"]
        return embeddings[0]

    def _process_single_gallery_image(self, args):
        """Process a single gallery image (for parallel execution)"""
        img_id, img_path_or_base64, selfie_embedding, exclude_embeddings = args
        
        gallery_img = None
        processed_embeddings = None
        
        try:
            # Check cache first
            cached_embeddings = self._get_cached_embedding(img_id, img_path_or_base64, 'gallery_embeddings')
            
            if cached_embeddings is not None:
                processed_embeddings = cached_embeddings
            else:
                # Load image from path or decode from base64
                if isinstance(img_path_or_base64, str) and (img_path_or_base64.strip().startswith('data:image') or len(img_path_or_base64.strip()) > 100):
                    # It's base64
                    gallery_img = self.decode_base64_image(img_path_or_base64)
                else:
                    # It's a file path
                    gallery_img = self.load_image_from_path(img_path_or_base64)
                gallery_img = self._preprocess_image(gallery_img)
                
                # Get embeddings
                gallery_embeddings = DeepFace.represent(
                    img_path=gallery_img,
                    model_name=self.model_name,
                    enforce_detection=False
                )
                del gallery_img  # Release memory immediately
                gallery_img = None
                if not gallery_embeddings:
                    return {
                        'id': img_id,
                        'similarity': 0.0  # No face detected
                    }
                
                # Extract embeddings from results
                processed_embeddings = []
                for emb_data in gallery_embeddings:
                    if isinstance(emb_data, dict) and "embedding" in emb_data:
                        processed_embeddings.append(emb_data["embedding"])
                    else:
                        processed_embeddings.append(emb_data)
                
                # Cache the embeddings
                if processed_embeddings:
                    self._cache_embedding(img_path_or_base64, processed_embeddings, 'gallery_embeddings')
            
            # Filter out excluded faces (guests) from comparison
            faces_to_compare = []
            if exclude_embeddings:
                for gallery_emb in processed_embeddings:
                    # Check if this face matches any excluded face
                    is_excluded = False
                    for exclude_emb in exclude_embeddings:
                        distance = self._cosine_distance(gallery_emb, exclude_emb)
                        if distance < 0.4:  # This face matches exclude list
                            is_excluded = True
                            break
                    
                    # Only add non-excluded faces for comparison
                    if not is_excluded:
                        faces_to_compare.append(gallery_emb)
            else:
                # No exclusion list, use all faces
                faces_to_compare = processed_embeddings
            
            # No faces left after filtering excludes
            if not faces_to_compare:
                return {
                    'id': img_id,
                    'similarity': 0.0  # All faces were excluded (only guests in image)
                }
            
            # Calculate similarity with non-excluded faces only
            min_distance = float('inf')
            for gallery_emb in faces_to_compare:
                distance = self._cosine_distance(selfie_embedding, gallery_emb)
                min_distance = min(min_distance, distance)
            
            del processed_embeddings
            del faces_to_compare
            
            # Convert distance to similarity
            similarity = 1 - min_distance
            
            return {
                'id': img_id,
                'similarity': round(float(similarity), 4)
            }
            
        except Exception as e:
            logger.warning(f"Error processing {img_id}: {e}")
            return {
                'id': img_id,
                'similarity': 0.0  # Error in processing
            }
        finally:
            # Explicit cleanup for memory safety
            gallery_img = None
            processed_embeddings = None

    def _process_batch(self, batch_items, selfie_embedding, exclude_embeddings, show_progress=False):
        """Process a batch of images in parallel with memory-safe result collection"""
        results = []
        total = len(batch_items)
        processed = 0
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_item = {
                executor.submit(self._process_single_gallery_image, 
                              (item['id'], item['image'], selfie_embedding, exclude_embeddings)): item
                for item in batch_items
            }
            
            # Collect results as they complete with progress tracking
            for future in as_completed(future_to_item):
                try:
                    result = future.result()
                    if result:  # Should always be truthy now
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

    def search_faces(
        self,
        selfie_base64: str,
        gallery_images: List[Dict[str, str]],
        exclude_images: Optional[List[str]] = None
    ) -> List[Dict[str, float]]:
        """
        Search for similar faces using DeepFace with maximum performance
        
        Returns list sorted by similarity in descending order
        """
        # Check cache for selfie embedding
        cached_selfie_embedding = self._get_cached_embedding('selfie', selfie_base64, 'selfie_embeddings')
        
        if cached_selfie_embedding is not None:
            selfie_embedding = cached_selfie_embedding
            logger.info("✓ Selfie embedding retrieved from cache")
        else:
            # Decode and preprocess selfie
            selfie_img = self.decode_base64_image(selfie_base64)
            selfie_img = self._preprocess_image(selfie_img)
            logger.info("✓ Selfie decoded and preprocessed")
            
            # Extract selfie embedding
            try:
                selfie_embeddings = DeepFace.represent(
                    img_path=selfie_img,
                    model_name=self.model_name,
                    enforce_detection=True
                )
                del selfie_img  # Release memory
                
                if not selfie_embeddings or not isinstance(selfie_embeddings, list):
                    raise ValueError("No face embedding found in the provided selfie.")
                
                # Extract embedding
                if isinstance(selfie_embeddings[0], dict) and "embedding" in selfie_embeddings[0]:
                    selfie_embedding = selfie_embeddings[0]["embedding"]
                else:
                    selfie_embedding = selfie_embeddings[0]
                
                del selfie_embeddings
                
                # Cache the selfie embedding
                self._cache_embedding(selfie_base64, selfie_embedding, 'selfie_embeddings')
                logger.info("✓ Selfie face encoded and cached")
            except Exception as e:
                raise ValueError(f"No face detected in the provided selfie: {e}")
        
        # Load exclude embeddings with caching
        exclude_embeddings = []
        if exclude_images:
            for img_path in exclude_images:
                try:
                    # Check cache first
                    cached_embeddings = self._get_cached_embedding(img_path, img_path, 'exclude_embeddings')
                    
                    if cached_embeddings is not None:
                        exclude_embeddings.extend(cached_embeddings)
                    else:
                        img = self.load_image_from_path(img_path)
                        img = self._preprocess_image(img)
                        embeddings = DeepFace.represent(
                            img_path=img,
                            model_name=self.model_name,
                            enforce_detection=False
                        )
                        del img
                        
                        processed_embeddings = []
                        for emb_data in embeddings:
                            if isinstance(emb_data, dict) and "embedding" in emb_data:
                                processed_embeddings.append(emb_data["embedding"])
                            else:
                                processed_embeddings.append(emb_data)
                        
                        if processed_embeddings:
                            # Cache the embeddings
                            self._cache_embedding(img_path, processed_embeddings, 'exclude_embeddings')
                            exclude_embeddings.extend(processed_embeddings)
                except Exception as e:
                    logger.warning(f"Failed to load exclude image {img_path}: {e}")
            
            logger.info(f"✓ Loaded {len(exclude_embeddings)} exclude face embeddings")
        
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
            chunk_results = self._process_batch(chunk, selfie_embedding, exclude_embeddings, show_progress=(num_chunks == 1))
            results.extend(chunk_results)
            
            # Memory cleanup between chunks
            if num_chunks > 1:
                logger.info(f"Chunk {chunk_idx + 1}/{num_chunks} complete: Found {len(chunk_results)} matches")
                self._cleanup_memory()
        
        logger.info(f"✓ Processed all {total} images - {len([r for r in results if r['similarity'] <= 0])} had errors or no faces")
        
        # Sort by similarity in descending order (best matches first)
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        # Final cleanup
        del selfie_embedding
        del exclude_embeddings
        self._cleanup_memory()
        
        return results
    
    @staticmethod
    def _cosine_distance(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine distance between two embeddings (optimized)"""
        embedding1 = np.array(embedding1, dtype=np.float32)
        embedding2 = np.array(embedding2, dtype=np.float32)
        
        # Optimized cosine distance calculation
        dot_product = np.dot(embedding1, embedding2)
        norm_product = np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
        
        # Avoid division by zero
        if norm_product == 0:
            return 1.0
        
        cosine_similarity = dot_product / norm_product
        return 1.0 - cosine_similarity
