"""
Base Engine Interface
All face recognition engines must implement this abstract class
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional
import base64
import io
from PIL import Image
import numpy as np


class BaseEngine(ABC):
    """Abstract base class for face recognition engines"""
    
    def __init__(self, use_gpu: bool = True):
        """
        Initialize the engine
        
        Args:
            use_gpu: Whether to use GPU acceleration
        """
        self.use_gpu = use_gpu
        self.name = self.__class__.__name__
        # Test for compatible environment
        if not self._is_environment_compatible():
            raise RuntimeError(f"Incompatible environment for {self.name}")

    def _is_environment_compatible(self) -> bool:
        """
        Check if the environment is compatible for the engine.
        Override this method in subclasses for specific checks.
        """
        return True
    
    @abstractmethod
    def search_faces(
        self,
        selfie_base64: str,
        gallery_images: List[Dict[str, str]],
        exclude_images: Optional[List[str]] = None
    ) -> List[Dict[str, float]]:
        """
        Search for similar faces in gallery
        
        Args:
            selfie_base64: Base64 encoded selfie image
            gallery_images: List of {'id': str, 'image': base64_str}
            exclude_images: List of file paths to exclude faces
        
        Returns:
            List of {'id': str, 'similarity': float} sorted by similarity (desc)
            
        Example:
            [
                {'id': 'photo_001.jpg', 'similarity': 0.95},
                {'id': 'photo_042.jpg', 'similarity': 0.87},
            ]
        """
        pass
    
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
