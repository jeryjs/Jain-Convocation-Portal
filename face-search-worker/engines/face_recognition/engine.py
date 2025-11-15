"""
face_recognition Engine
Uses dlib-based face_recognition library
"""

import os
import face_recognition
import numpy as np
from typing import List, Dict, Optional
import logging

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from core.base_engine import BaseEngine


logger = logging.getLogger(__name__)


class FaceRecognitionEngine(BaseEngine):
    """Face recognition engine using face_recognition library"""
    
    def __init__(self, use_gpu: bool = True):
        super().__init__(use_gpu)
        self.name = "face_recognition"
        
        # Enable GPU if available
        if use_gpu:
            os.environ["CUDA_VISIBLE_DEVICES"] = "0"
        
        logger.info(f"✅ {self.name} engine initialized (GPU: {use_gpu})")
    
    def search_faces(
        self,
        selfie_base64: str,
        gallery_images: List[Dict[str, str]],
        exclude_images: Optional[List[str]] = None
    ) -> List[Dict[str, float]]:
        """
        Search for similar faces using face_recognition
        
        Returns list sorted by similarity in descending order
        """
        # Decode selfie
        selfie_img = self.decode_base64_image(selfie_base64)
        logger.info("✓ Selfie decoded")
        
        # Get selfie encoding
        selfie_encodings = face_recognition.face_encodings(selfie_img)
        if not selfie_encodings:
            raise ValueError("No face detected in the provided selfie")
        
        selfie_encoding = selfie_encodings[0]
        logger.info("✓ Selfie face encoded")
        
        # Load exclude encodings
        exclude_encodings = []
        if exclude_images:
            for img_path in exclude_images:
                try:
                    img = self.load_image_from_path(img_path)
                    encodings = face_recognition.face_encodings(img)
                    exclude_encodings.extend(encodings)
                except Exception as e:
                    logger.warning(f"Failed to load exclude image {img_path}: {e}")
            
            logger.info(f"✓ Loaded {len(exclude_encodings)} exclude face encodings")
        
        # Process gallery images
        results = []
        total = len(gallery_images)
        
        for idx, gallery_item in enumerate(gallery_images):
            try:
                img_id = gallery_item['id']
                img_base64 = gallery_item['image']
                
                # Decode gallery image
                gallery_img = self.decode_base64_image(img_base64)
                
                # Get all face encodings in the image
                gallery_encodings = face_recognition.face_encodings(gallery_img)
                
                if not gallery_encodings:
                    continue
                
                # Check against exclude list
                is_excluded = False
                if exclude_encodings:
                    for gallery_enc in gallery_encodings:
                        distances = face_recognition.face_distance(exclude_encodings, gallery_enc)
                        if np.any(distances < 0.5):  # Threshold for exclusion
                            is_excluded = True
                            break
                
                if is_excluded:
                    continue
                
                # Calculate similarity with selfie
                distances = face_recognition.face_distance(gallery_encodings, selfie_encoding)
                min_distance = min(distances)
                similarity = 1 - min_distance  # Convert distance to similarity
                
                if similarity > 0:
                    results.append({
                        'id': img_id,
                        'similarity': round(float(similarity), 4)
                    })
                
                # Progress logging
                if (idx + 1) % 10 == 0 or (idx + 1) == total:
                    logger.info(f"Progress: {idx + 1}/{total} ({(idx + 1)/total*100:.1f}%)")
                    
            except Exception as e:
                logger.warning(f"Error processing gallery image {gallery_item.get('id', 'unknown')}: {e}")
                continue
        
        # Sort by similarity in descending order (best matches first)
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        logger.info(f"✓ Found {len(results)} matches")
        
        return results
