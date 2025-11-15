"""Face search implementation using face_recognition library"""

import os
import cv2
import numpy as np
import face_recognition
from typing import List, Dict, Optional
import base64
import io
from PIL import Image
import gc
import torch
import logging

logger = logging.getLogger(__name__)

# Enable GPU optimization
os.environ["CUDA_VISIBLE_DEVICES"] = "0"


class FaceSearchEngine:
    """Face recognition and search engine using face_recognition"""
    
    def __init__(self, use_gpu: bool = True):
        self.use_gpu = use_gpu
        self.similarity_threshold = 0.5  # Lower distance = higher similarity
        self.max_image_size = 640  # Resize large images for faster processing
        
        logger.info("🔥 Face recognition engine initialized")
        logger.info(f"GPU enabled: {use_gpu and torch.cuda.is_available()}")
    
    def cleanup_gpu_memory(self):
        """Clean up GPU memory"""
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()
    
    def decode_base64_image(self, base64_str: str) -> np.ndarray:
        """Decode base64 image to numpy array (RGB)"""
        try:
            # Remove data URL prefix if present
            if ',' in base64_str:
                base64_str = base64_str.split(',')[1]
            
            # Decode base64
            img_data = base64.b64decode(base64_str)
            img = Image.open(io.BytesIO(img_data))
            
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Convert to numpy array
            img_array = np.array(img)
            
            return img_array
        except Exception as e:
            raise ValueError(f"Failed to decode image: {e}")
    
    def preprocess_image(self, img: np.ndarray) -> np.ndarray:
        """Preprocess image for faster face recognition"""
        h, w = img.shape[:2]
        
        # Resize if too large
        if h > self.max_image_size or w > self.max_image_size:
            scale = self.max_image_size / max(h, w)
            new_size = (int(w * scale), int(h * scale))
            img = cv2.resize(img, new_size, interpolation=cv2.INTER_AREA)
            logger.debug(f"Resized image from {w}x{h} to {new_size[0]}x{new_size[1]}")
        
        return img
    
    def detect_face(self, img_array: np.ndarray) -> bool:
        """Check if a face is present in the image"""
        try:
            img = self.preprocess_image(img_array)
            face_locations = face_recognition.face_locations(img)
            return len(face_locations) > 0
        except Exception as e:
            logger.error(f"Error detecting face: {e}")
            return False
    
    def get_face_encoding(self, img_array: np.ndarray) -> Optional[np.ndarray]:
        """Extract face encoding from image"""
        try:
            img = self.preprocess_image(img_array)
            encodings = face_recognition.face_encodings(img)
            
            if encodings and len(encodings) > 0:
                return encodings[0]  # Return first face encoding
            
            return None
        except Exception as e:
            logger.error(f"Error extracting encoding: {e}")
            return None
    
    def calculate_similarity(self, encoding1: np.ndarray, encoding2: np.ndarray) -> float:
        """
        Calculate similarity between two face encodings
        Returns: 0.0 to 1.0 (1.0 = identical, 0.0 = completely different)
        """
        # face_recognition uses face_distance (lower = more similar)
        distance = face_recognition.face_distance([encoding1], encoding2)[0]
        
        # Convert distance to similarity score (0-1 range)
        # Distance typically ranges from 0 to 1, where 0 is identical
        similarity = 1 - distance
        
        # Clamp to 0-1 range
        return max(0.0, min(1.0, similarity))
    
    def search_faces(
        self,
        selfie_base64: str,
        gallery_images: List[Dict[str, str]],
        progress_callback=None
    ) -> List[Dict[str, float]]:
        """
        Search for matching faces in gallery
        
        Args:
            selfie_base64: Base64 encoded selfie image
            gallery_images: List of {id: str, image: str (base64)} dicts
            progress_callback: Optional callback(progress: int) for progress updates
        
        Returns:
            List of {id: str, score: float} sorted by score (highest first)
        """
        try:
            # Decode selfie
            if progress_callback:
                progress_callback(5)
            
            selfie_array = self.decode_base64_image(selfie_base64)
            logger.info("✓ Selfie decoded")
            
            # Check for face in selfie
            if progress_callback:
                progress_callback(10)
            
            if not self.detect_face(selfie_array):
                raise ValueError("No face detected in the provided selfie")
            logger.info("✓ Face detected in selfie")
            
            # Get selfie encoding
            if progress_callback:
                progress_callback(20)
            
            selfie_encoding = self.get_face_encoding(selfie_array)
            if selfie_encoding is None:
                raise ValueError("Could not extract face features from selfie")
            logger.info("✓ Face encoding extracted from selfie")
            
            # Clean up selfie from memory
            del selfie_array
            self.cleanup_gpu_memory()
            
            # Compare with gallery images
            results = []
            total_images = len(gallery_images)
            logger.info(f"Processing {total_images} gallery images...")
            
            for idx, gallery_item in enumerate(gallery_images):
                try:
                    # Decode gallery image
                    gallery_array = self.decode_base64_image(gallery_item['image'])
                    
                    # Get encoding
                    gallery_encoding = self.get_face_encoding(gallery_array)
                    
                    # Clean up gallery image
                    del gallery_array
                    
                    if gallery_encoding is not None:
                        # Calculate similarity
                        similarity = self.calculate_similarity(selfie_encoding, gallery_encoding)
                        
                        # Add to results if above threshold
                        if similarity >= self.similarity_threshold:
                            results.append({
                                'id': gallery_item['id'],
                                'score': float(similarity)
                            })
                        
                        # Clean up encoding
                        del gallery_encoding
                    
                    # Update progress (20% to 95%)
                    if progress_callback:
                        progress = 20 + int((idx + 1) / total_images * 75)
                        progress_callback(progress)
                    
                    # Periodic GPU cleanup
                    if idx % 10 == 0:
                        self.cleanup_gpu_memory()
                        
                except Exception as e:
                    logger.warning(f"Skipping image {gallery_item.get('id', 'unknown')}: {e}")
                    continue
            
            # Sort by score (highest first)
            results.sort(key=lambda x: x['score'], reverse=True)
            
            logger.info(f"✓ Found {len(results)} matches above threshold")
            
            if progress_callback:
                progress_callback(100)
            
            # Final cleanup
            del selfie_encoding
            self.cleanup_gpu_memory()
            
            return results
            
        except Exception as e:
            logger.error(f"Face search error: {e}")
            self.cleanup_gpu_memory()
            raise


if __name__ == '__main__':
    # Test the face search engine
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
    logger.addHandler(handler)
    
    print("Testing Face Search Engine (face_recognition)...")
    
    engine = FaceSearchEngine(use_gpu=True)
    
    # Create a dummy test image
    test_image = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    
    # Test face detection
    has_face = engine.detect_face(test_image)
    print(f"Face detected: {has_face}")
    
    print("✅ Face search engine initialized successfully!")
