"""
face_recognition Engine
Unique implementation that relies on BaseEngine for shared behavior
"""

import os
import logging
from typing import List, Dict, Optional

import face_recognition
import numpy as np

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from core.base_engine import BaseEngine

logger = logging.getLogger(__name__)


class FaceRecognitionEngine(BaseEngine):
    """Face recognition engine powered by dlib/face_recognition"""

    def __init__(self, use_gpu: bool = True, max_workers: int = 8, max_image_size: int = 640):
        super().__init__(use_gpu=use_gpu, max_workers=max_workers, max_image_size=max_image_size)
        self.name = "face_recognition"

        if use_gpu:
            os.environ["CUDA_VISIBLE_DEVICES"] = "0"

        logger.info(f"✅ {self.name} engine initialized (GPU: {use_gpu}, Workers: {max_workers})")

    def _is_environment_compatible(self) -> bool:
        try:
            import face_recognition  # noqa: F401
            return True
        except ImportError:
            return False

    # --- Engine-specific encoders -------------------------------------------------

    def _encode_selfie(self, selfie_img: np.ndarray):
        encodings = face_recognition.face_encodings(selfie_img, num_jitters=4, model='large')
        return encodings[0] if encodings else None

    def _encode_exclude_image(self, img: np.ndarray) -> List:
        return face_recognition.face_encodings(img)

    # --- Per-image processing -----------------------------------------------------

    def _process_single_image(self, args) -> Optional[Dict[str, float]]:
        img_id, img_path_or_base64, selfie_encoding, exclude_encodings = args

        try:
            cached_encodings = self._get_cached_encoding(img_id, img_path_or_base64, 'gallery_encodings')
            if cached_encodings is not None:
                img_encodings = cached_encodings
            else:
                gallery_img = self._load_and_preprocess_image(img_path_or_base64)
                img_encodings = face_recognition.face_encodings(gallery_img, num_jitters=4, model='large')
                del gallery_img

                if img_encodings:
                    self._cache_encoding(img_path_or_base64, img_encodings, 'gallery_encodings')

            if not img_encodings:
                return {'id': img_id, 'similarity': -1.0}

            faces_to_compare: List[np.ndarray] = []
            if exclude_encodings:
                for gallery_enc in img_encodings:
                    is_excluded = False
                    for exclude_enc in exclude_encodings:
                        if face_recognition.face_distance([exclude_enc], gallery_enc)[0] < 0.1:
                            is_excluded = True
                            break
                    if not is_excluded:
                        faces_to_compare.append(gallery_enc)
            else:
                faces_to_compare = img_encodings

            if not faces_to_compare:
                return {'id': img_id, 'similarity': 0.0}

            distances = face_recognition.face_distance(faces_to_compare, selfie_encoding)
            similarity = 1 - float(min(distances))

            return {'id': img_id, 'similarity': round(similarity, 4)}

        except Exception as err:
            logger.warning(f"Error processing {img_id}: {err}")
            return {'id': img_id, 'similarity': 0.0}