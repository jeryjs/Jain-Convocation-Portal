"""Face search implementation using DeepFace"""

import base64
import io
import os
from typing import List, Dict, Optional
from PIL import Image
import numpy as np
from deepface import DeepFace
import cv2


class FaceSearchEngine:
    """Face recognition and search engine"""
    
    def __init__(self, use_gpu: bool = True):
        self.use_gpu = use_gpu
        self.model_name = "Facenet512"  # 512-dimensional embeddings
        self.detector_backend = "opencv"  # Fast detector
        self.similarity_threshold = 0.6  # Minimum similarity score
        
        # Warm up the model
        print("🔥 Warming up face recognition model...")
        try:
            # Create a dummy image to initialize the model
            dummy = np.zeros((224, 224, 3), dtype=np.uint8)
            DeepFace.represent(dummy, model_name=self.model_name, enforce_detection=False)
            print("✅ Model ready!")
        except Exception as e:
            print(f"⚠️  Model warmup warning: {e}")
    
    def decode_base64_image(self, base64_str: str) -> np.ndarray:
        """Decode base64 image to numpy array"""
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
    
    def detect_face(self, img_array: np.ndarray) -> bool:
        """Check if a face is present in the image"""
        try:
            faces = DeepFace.extract_faces(
                img_array,
                detector_backend=self.detector_backend,
                enforce_detection=True
            )
            return len(faces) > 0
        except Exception:
            return False
    
    def get_face_embedding(self, img_array: np.ndarray) -> Optional[np.ndarray]:
        """Extract face embedding from image"""
        try:
            embedding = DeepFace.represent(
                img_array,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True
            )
            
            if embedding and len(embedding) > 0:
                return np.array(embedding[0]['embedding'])
            return None
        except Exception as e:
            print(f"❌ Error extracting embedding: {e}")
            return None
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine similarity between two embeddings"""
        # Cosine similarity
        dot_product = np.dot(embedding1, embedding2)
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        
        # Convert to 0-1 range (cosine similarity is -1 to 1)
        return (similarity + 1) / 2
    
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
        # Decode selfie
        if progress_callback:
            progress_callback(5)
        
        try:
            selfie_array = self.decode_base64_image(selfie_base64)
        except Exception as e:
            raise ValueError(f"Invalid selfie image: {e}")
        
        # Check for face in selfie
        if progress_callback:
            progress_callback(10)
        
        if not self.detect_face(selfie_array):
            raise ValueError("No face detected in the provided selfie")
        
        # Get selfie embedding
        if progress_callback:
            progress_callback(20)
        
        selfie_embedding = self.get_face_embedding(selfie_array)
        if selfie_embedding is None:
            raise ValueError("Could not extract face features from selfie")
        
        # Compare with gallery images
        results = []
        total_images = len(gallery_images)
        
        for idx, gallery_item in enumerate(gallery_images):
            try:
                # Decode gallery image
                gallery_array = self.decode_base64_image(gallery_item['image'])
                
                # Get embedding
                gallery_embedding = self.get_face_embedding(gallery_array)
                
                if gallery_embedding is not None:
                    # Calculate similarity
                    similarity = self.calculate_similarity(selfie_embedding, gallery_embedding)
                    
                    # Add to results if above threshold
                    if similarity >= self.similarity_threshold:
                        results.append({
                            'id': gallery_item['id'],
                            'score': float(similarity)
                        })
                
                # Update progress
                if progress_callback:
                    progress = 20 + int((idx + 1) / total_images * 75)
                    progress_callback(progress)
                    
            except Exception as e:
                print(f"⚠️  Skipping image {gallery_item.get('id', 'unknown')}: {e}")
                continue
        
        # Sort by score (highest first)
        results.sort(key=lambda x: x['score'], reverse=True)
        
        if progress_callback:
            progress_callback(100)
        
        return results


if __name__ == '__main__':
    # Test the face search engine
    print("Testing Face Search Engine...")
    
    engine = FaceSearchEngine(use_gpu=False)  # Use CPU for testing
    
    # Create a dummy test
    test_image = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    
    # Test face detection
    has_face = engine.detect_face(test_image)
    print(f"Face detected: {has_face}")
    
    print("✅ Face search engine initialized successfully!")
