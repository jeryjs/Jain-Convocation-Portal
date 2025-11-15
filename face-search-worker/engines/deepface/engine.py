"""
DeepFace Engine
Uses TensorFlow-based DeepFace library with maximum performance optimizations
"""

import os
import cv2
import gc
import numpy as np
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
    
    def __init__(self, use_gpu: bool = True, max_workers: int = 4, batch_size: int = 25, max_image_size: int = 640):
        super().__init__(use_gpu)
        self.name = "DeepFace"
        self.model_name = "Facenet"  # or VGG-Face, OpenFace, ArcFace, etc.
        self.max_workers = max_workers  # Lower than face_recognition due to TF overhead
        self.batch_size = batch_size  # Smaller batches for TF
        self.max_image_size = max_image_size
        
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

    def _preprocess_image(self, img_array: np.ndarray) -> np.ndarray:
        """Preprocess image for faster face recognition"""
        h, w = img_array.shape[:2]
        if h > self.max_image_size or w > self.max_image_size:
            scale = self.max_image_size / max(h, w)
            new_size = (int(w * scale), int(h * scale))
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
        img_id, img_base64, selfie_embedding, exclude_embeddings = args
        
        try:
            # Decode and preprocess
            gallery_img = self.decode_base64_image(img_base64)
            gallery_img = self._preprocess_image(gallery_img)
            
            # Get embeddings
            gallery_embeddings = DeepFace.represent(
                img_path=gallery_img,
                model_name=self.model_name,
                enforce_detection=False
            )
            del gallery_img  # Release memory immediately
            
            if not gallery_embeddings:
                return None
            
            # Extract embeddings from results
            processed_embeddings = []
            for emb_data in gallery_embeddings:
                if isinstance(emb_data, dict) and "embedding" in emb_data:
                    processed_embeddings.append(emb_data["embedding"])
                else:
                    processed_embeddings.append(emb_data)
            
            # Check exclusion
            if exclude_embeddings:
                for gallery_emb in processed_embeddings:
                    for exclude_emb in exclude_embeddings:
                        distance = self._cosine_distance(gallery_emb, exclude_emb)
                        if distance < 0.4:  # Threshold for exclusion
                            del processed_embeddings
                            return None
            
            # Calculate similarity with selfie
            min_distance = float('inf')
            for gallery_emb in processed_embeddings:
                distance = self._cosine_distance(selfie_embedding, gallery_emb)
                min_distance = min(min_distance, distance)
            
            del processed_embeddings
            
            # Convert distance to similarity
            similarity = 1 - min_distance
            
            if similarity > 0:
                return {
                    'id': img_id,
                    'similarity': round(float(similarity), 4)
                }
            
            return None
            
        except Exception as e:
            logger.warning(f"Error processing {img_id}: {e}")
            return None
        finally:
            gc.collect()  # Quick cleanup per image

    def _process_batch(self, batch_items, selfie_embedding, exclude_embeddings):
        """Process a batch of images in parallel"""
        results = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Prepare arguments
            tasks = [
                (item['id'], item['image'], selfie_embedding, exclude_embeddings)
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
            logger.info("✓ Selfie face encoded")
        except Exception as e:
            raise ValueError(f"No face detected in the provided selfie: {e}")
        
        # Load exclude embeddings
        exclude_embeddings = []
        if exclude_images:
            for img_path in exclude_images:
                try:
                    img = self.load_image_from_path(img_path)
                    img = self._preprocess_image(img)
                    embeddings = DeepFace.represent(
                        img_path=img,
                        model_name=self.model_name,
                        enforce_detection=False
                    )
                    del img
                    
                    for emb_data in embeddings:
                        if isinstance(emb_data, dict) and "embedding" in emb_data:
                            exclude_embeddings.append(emb_data["embedding"])
                        else:
                            exclude_embeddings.append(emb_data)
                except Exception as e:
                    logger.warning(f"Failed to load exclude image {img_path}: {e}")
            
            logger.info(f"✓ Loaded {len(exclude_embeddings)} exclude face embeddings")
        
        # Process gallery images in batches with parallel processing
        results = []
        total = len(gallery_images)
        logger.info(f"Processing {total} images in batches of {self.batch_size} with {self.max_workers} workers...")
        
        for batch_start in range(0, total, self.batch_size):
            batch_end = min(batch_start + self.batch_size, total)
            batch = gallery_images[batch_start:batch_end]
            
            # Process batch in parallel
            batch_results = self._process_batch(batch, selfie_embedding, exclude_embeddings)
            results.extend(batch_results)
            
            # Progress update
            progress_pct = (batch_end / total) * 100
            logger.info(f"Progress: {batch_end}/{total} ({progress_pct:.1f}%) - Found {len(batch_results)} matches in this batch")
            
            # Cleanup after each batch
            self._cleanup_memory()
        
        # Sort by similarity in descending order (best matches first)
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        logger.info(f"✓ Found {len(results)} total matches")
        
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
