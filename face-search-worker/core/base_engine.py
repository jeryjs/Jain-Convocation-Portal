"""
Base Engine Interface
All face recognition engines must implement this abstract class
"""

from abc import ABC, abstractmethod
from typing import Any, List, Dict, Optional
import base64
import io
from PIL import Image
import numpy as np
import cv2
import hashlib
import gc
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)


class BaseEngine(ABC):
    """Abstract base class for face recognition engines"""
    
    def __init__(self, use_gpu: bool = True, max_workers: int = 8, max_image_size: int = 640):
        """
        Initialize the engine
        
        Args:
            use_gpu: Whether to use GPU acceleration
            max_workers: Number of parallel workers
            max_image_size: Maximum image dimension for preprocessing
        """
        self.use_gpu = use_gpu
        self.max_workers = max_workers
        self.max_image_size = max_image_size
        self.name = self.__class__.__name__
        
        # Initialize cache with separate sections
        self.cache = {
            'selfie_encodings': {},      # hash -> encoding/embedding
            'gallery_encodings': {},     # hash -> list of encodings/embeddings
            'exclude_encodings': {},     # hash -> list of encodings/embeddings
        }
        
        # Test for compatible environment
        if not self._is_environment_compatible():
            raise RuntimeError(f"Incompatible environment for {self.name}")

    def _is_environment_compatible(self) -> bool:
        """
        Check if the environment is compatible for the engine.
        Override this method in subclasses for specific checks.
        """
        return True
    
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
    
    def _load_and_preprocess_image(self, img_path_or_base64: str) -> np.ndarray:
        """Load image from path or base64 and preprocess"""
        # Load image from path or decode from base64
        if isinstance(img_path_or_base64, str) and (img_path_or_base64.strip().startswith('data:image') or len(img_path_or_base64.strip()) > 100):
            # It's base64
            img = self.decode_base64_image(img_path_or_base64)
        else:
            # It's a file path
            img = self.load_image_from_path(img_path_or_base64)
        
        return self._preprocess_image(img)
    
    def _process_batch_parallel(self, batch_items, selfie_encoding, exclude_encodings, show_progress=False):
        """Process a batch of images in parallel with memory-safe result collection"""
        results = []
        total = len(batch_items)
        processed = 0
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_item = {
                executor.submit(self._process_single_image, 
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
    
    def _process_in_chunks(self, gallery_images, selfie_encoding, exclude_encodings, chunk_size=500):
        """Process images with memory-safe chunking for large datasets"""
        results = []
        total = len(gallery_images)
        
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
            chunk_results = self._process_batch_parallel(chunk, selfie_encoding, exclude_encodings, show_progress=(num_chunks == 1))
            results.extend(chunk_results)
            
            # Memory cleanup between chunks
            if num_chunks > 1:
                logger.info(f"Chunk {chunk_idx + 1}/{num_chunks} complete: Found {len(chunk_results)} matches")
                gc.collect()
        
        return results
    
    @abstractmethod
    def _process_single_image(self, args) -> Optional[Dict[str, float]]:
        """
        Process a single image (engine-specific implementation)
        
        Args:
            args: Tuple of (img_id, img_data, selfie_encoding, exclude_encodings)
        
        Returns:
            Dict with 'id' and 'similarity' or None
        """
        pass
    
    @abstractmethod
    def _encode_selfie(self, selfie_img: np.ndarray) -> Optional[Any]:
        """
        Encode selfie image (engine-specific implementation)
        
        Args:
            selfie_img: Preprocessed selfie image
        
        Returns:
            Encoding/embedding for the selfie
        """
        pass
    
    @abstractmethod
    def _encode_exclude_image(self, img: np.ndarray) -> List[Any]:
        """
        Encode exclude image (engine-specific implementation)
        
        Args:
            img: Preprocessed image
        
        Returns:
            List of encodings/embeddings
        """
        pass
    
    def search_faces(
        self,
        selfie_base64: str,
        gallery_images: List[Dict[str, str]],
        exclude_images: Optional[List[str]] = None
    ) -> List[Dict[str, float]]:
        """
        Search for similar faces in gallery (template method pattern)
        
        Args:
            selfie_base64: Base64 encoded selfie image
            gallery_images: List of {'id': str, 'image': base64_str}
            exclude_images: List of file paths to exclude faces
        
        Returns:
            List of {'id': str, 'similarity': float} sorted by similarity (desc)
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
            
            # Encode selfie (engine-specific)
            selfie_encoding = self._encode_selfie(selfie_img)
            del selfie_img
            
            if selfie_encoding is None:
                raise ValueError("No face detected in the provided selfie")
            
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
                        encodings = self._encode_exclude_image(img)
                        del img
                        
                        if encodings:
                            # Cache the encodings
                            self._cache_encoding(img_path, encodings, 'exclude_encodings')
                            exclude_encodings.extend(encodings)
                except Exception as e:
                    logger.warning(f"Failed to load exclude image {img_path}: {e}")
            
            logger.info(f"✓ Loaded {len(exclude_encodings)} exclude face encodings")
        
        # Process images with chunking
        results = self._process_in_chunks(gallery_images, selfie_encoding, exclude_encodings, chunk_size=500)
        
        logger.info(f"✓ Processed all {len(gallery_images)} images - {len([r for r in results if r['similarity'] <= 0])} had errors or no faces")
        
        # Sort by similarity in descending order (best matches first)
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        # Final cleanup
        del selfie_encoding
        del exclude_encodings
        gc.collect()
        
        return results
    
    @staticmethod
    def decode_base64_image(base64_str: str) -> np.ndarray:
        """
        Decode base64 string to numpy array (RGB)
        
        Args:
            base64_str: Base64 encoded image (with or without data:image prefix)
        
        Returns:
            RGB numpy array
        """
        # Remove data:image prefix if present
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        
        # Add padding if needed (base64 strings must be padded to multiple of 4)
        padding_needed = len(base64_str) % 4
        if padding_needed:
            base64_str += '=' * (4 - padding_needed)
        
        # Decode base64
        image_data = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        return np.array(image)
    
    @staticmethod
    def load_image_from_path(path: str) -> np.ndarray:
        """
        Load image from file path
        
        Args:
            path: File path to image
        
        Returns:
            RGB numpy array
        """
        image = Image.open(path)
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        return np.array(image)
