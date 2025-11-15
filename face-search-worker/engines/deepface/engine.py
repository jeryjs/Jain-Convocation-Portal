"""
DeepFace Engine
Uses TensorFlow-based DeepFace library
"""

import os
import numpy as np
from typing import List, Dict, Optional
import logging

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from core.base_engine import BaseEngine

from deepface import DeepFace


logger = logging.getLogger(__name__)


class DeepFaceEngine(BaseEngine):
    """Face recognition engine using DeepFace library"""
    
    def __init__(self, use_gpu: bool = True):
        super().__init__(use_gpu)
        self.name = "DeepFace"
        self.model_name = "VGG-Face"  # or Facenet, OpenFace, etc.
        
        # Configure GPU
        if not use_gpu:
            os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
        
        logger.info(f"✅ {self.name} engine initialized (Model: {self.model_name}, GPU: {use_gpu})")
    
    def search_faces(
        self,
        selfie_base64: str,
        gallery_images: List[Dict[str, str]],
        exclude_images: Optional[List[str]] = None
    ) -> List[Dict[str, float]]:
        """
        Search for similar faces using DeepFace
        
        Returns list sorted by similarity in descending order
        """
        # Decode selfie
        selfie_img = self.decode_base64_image(selfie_base64)
        logger.info("✓ Selfie decoded")
        
        # Extract selfie embedding
        try:
            selfie_embeddings = DeepFace.represent(
                img_path=selfie_img,
                model_name=self.model_name,
                enforce_detection=True
            )
            if not selfie_embeddings or not isinstance(selfie_embeddings, list):
                raise ValueError("No face embedding found in the provided selfie.")
            # DeepFace.represent returns a list of embeddings (dicts) or a single embedding (np.ndarray)
            if isinstance(selfie_embeddings[0], dict) and "embedding" in selfie_embeddings[0]:
                selfie_embedding = selfie_embeddings[0]["embedding"]
            else:
                selfie_embedding = selfie_embeddings[0]
            logger.info("✓ Selfie face encoded")
        except Exception as e:
            raise ValueError(f"No face detected in the provided selfie: {e}")
        
        # Load exclude embeddings
        exclude_embeddings = []
        if exclude_images:
            for img_path in exclude_images:
                try:
                    img = self.load_image_from_path(img_path)
                    embeddings = DeepFace.represent(
                        img_path=img,
                        model_name=self.model_name,
                        enforce_detection=False
                    )
                    for emb_data in embeddings:
                        exclude_embeddings.append(emb_data)
                except Exception as e:
                    logger.warning(f"Failed to load exclude image {img_path}: {e}")
            
            logger.info(f"✓ Loaded {len(exclude_embeddings)} exclude face embeddings")
        
        # Process gallery images
        results = []
        total = len(gallery_images)
        
        for idx, gallery_item in enumerate(gallery_images):
            try:
                img_id = gallery_item['id']
                img_base64 = gallery_item['image']
                
                # Decode gallery image
                gallery_img = self.decode_base64_image(img_base64)
                
                # Get all face embeddings in the image
                gallery_embeddings = DeepFace.represent(
                    img_path=gallery_img,
                    model_name=self.model_name,
                    enforce_detection=False
                )
                
                if not gallery_embeddings:
                    continue
                
                # Check against exclude list
                is_excluded = False
                if exclude_embeddings:
                    for gallery_emb_data in gallery_embeddings:
                        if isinstance(gallery_emb_data, dict) and "embedding" in gallery_emb_data:
                            gallery_emb = gallery_emb_data["embedding"]
                        else:
                            gallery_emb = gallery_emb_data
                        for exclude_emb_data in exclude_embeddings:
                            if isinstance(exclude_emb_data, dict) and "embedding" in exclude_emb_data:
                                exclude_emb = exclude_emb_data["embedding"]
                            else:
                                exclude_emb = exclude_emb_data
                            distance = self._cosine_distance(gallery_emb, exclude_emb) # type: ignore
                            if distance < 0.4:  # Threshold for exclusion
                                is_excluded = True
                                break
                        if is_excluded:
                            break
                
                if is_excluded:
                    continue
                
                # Calculate similarity with selfie
                min_distance = float('inf')
                for gallery_emb_data in gallery_embeddings:
                    if isinstance(gallery_emb_data, dict) and "embedding" in gallery_emb_data:
                        gallery_emb = gallery_emb_data["embedding"]
                    else:
                        gallery_emb = gallery_emb_data
                    distance = self._cosine_distance(selfie_embedding, gallery_emb) # type: ignore
                    min_distance = min(min_distance, distance)
                
                # Convert distance to similarity (0 = identical, 1 = completely different)
                similarity = 1 - min_distance
                
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
    
    @staticmethod
    def _cosine_distance(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine distance between two embeddings"""
        embedding1 = np.array(embedding1)
        embedding2 = np.array(embedding2)
        
        dot_product = np.dot(embedding1, embedding2)
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        
        cosine_similarity = dot_product / (norm1 * norm2)
        cosine_distance = 1 - cosine_similarity
        
        return cosine_distance
