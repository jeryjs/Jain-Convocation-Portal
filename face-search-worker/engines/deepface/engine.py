"""
DeepFace Engine
Unique implementation on top of BaseEngine template
"""

import os
import logging
from typing import List, Optional

import numpy as np
from deepface import DeepFace

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from core.base_engine import BaseEngine

try:
    import tensorflow as tf  # type: ignore
    TF_AVAILABLE = True
except ImportError:  # pragma: no cover
    tf = None  # type: ignore
    TF_AVAILABLE = False

logger = logging.getLogger(__name__)


class DeepFaceEngine(BaseEngine):
    """Face matching powered by DeepFace/TF"""

    def __init__(self, use_gpu: bool = True, max_workers: int = 6, max_image_size: int = 640):
        super().__init__(use_gpu=use_gpu, max_workers=max_workers, max_image_size=max_image_size)
        self.name = "DeepFace"
        self.model_name = "Facenet"

        if not use_gpu:
            os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

        self._configure_tensorflow()
        logger.info(f"✅ {self.name} engine initialized (Model: {self.model_name}, GPU: {use_gpu}, Workers: {max_workers})")

    def _configure_tensorflow(self) -> None:
        if not TF_AVAILABLE or tf is None:
            return
        devices = tf.config.list_physical_devices('GPU')
        for device in devices:
            tf.config.experimental.set_memory_growth(device, True)

    def _is_environment_compatible(self) -> bool:
        try:
            import deepface  # noqa: F401
            return True
        except ImportError:
            return False

    # --- Engine-specific encoders -------------------------------------------------

    def _encode_selfie(self, selfie_img: np.ndarray) -> Optional[np.ndarray]:
        data = DeepFace.represent(
            img_path=selfie_img,
            model_name=self.model_name,
            enforce_detection=True,
            detector_backend='skip'
        )
        if not data:
            return None
        return self._ensure_numpy_embedding(data[0])

    def _encode_exclude_image(self, img: np.ndarray) -> List[np.ndarray]:
        data = DeepFace.represent(
            img_path=img,
            model_name=self.model_name,
            enforce_detection=False,
            detector_backend='skip'
        )
        if not data:
            return []
        return [self._ensure_numpy_embedding(emb) for emb in data]

    # --- Per-image processing -----------------------------------------------------

    def _process_single_image(self, args):
        img_id, img_path_or_base64, selfie_embedding, exclude_embeddings = args

        try:
            cached = self._get_cached_encoding(img_id, img_path_or_base64, 'gallery_encodings')
            if cached is not None:
                processed_embeddings = cached
            else:
                gallery_img = self._load_and_preprocess_image(img_path_or_base64)
                raw_embeddings = DeepFace.represent(
                    img_path=gallery_img,
                    model_name=self.model_name,
                    enforce_detection=False,
                    detector_backend='skip'
                )
                del gallery_img

                if not raw_embeddings:
                    return {'id': img_id, 'similarity': 0.0}

                processed_embeddings = [
                    self._ensure_numpy_embedding(emb)
                    for emb in raw_embeddings
                ]
                self._cache_encoding(img_path_or_base64, processed_embeddings, 'gallery_encodings')

            faces_to_compare: List[np.ndarray] = []
            if exclude_embeddings:
                for gallery_emb in processed_embeddings:
                    is_excluded = any(
                        self._cosine_distance(gallery_emb, exclude_emb) < 0.1
                        for exclude_emb in exclude_embeddings
                    )
                    if not is_excluded:
                        faces_to_compare.append(gallery_emb)
            else:
                faces_to_compare = processed_embeddings

            if not faces_to_compare:
                return {'id': img_id, 'similarity': 0.0}

            min_distance = min(
                self._cosine_distance(selfie_embedding, gallery_emb)
                for gallery_emb in faces_to_compare
            )
            similarity = 1 - float(min_distance)

            return {'id': img_id, 'similarity': round(similarity, 4)}

        except Exception as err:
            logger.warning(f"Error processing {img_id}: {err}")
            return {'id': img_id, 'similarity': 0.0}

    # --- Helpers ------------------------------------------------------------------

    @staticmethod
    def _ensure_numpy_embedding(embedding) -> np.ndarray:
        arr = embedding.get("embedding") if isinstance(embedding, dict) else embedding
        return np.array(arr, dtype=np.float32)

    @staticmethod
    def _cosine_distance(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        emb1 = np.array(embedding1, dtype=np.float32)
        emb2 = np.array(embedding2, dtype=np.float32)
        dot_product = float(np.dot(emb1, emb2))
        denom = float(np.linalg.norm(emb1) * np.linalg.norm(emb2))
        if denom == 0:
            return 1.0
        cosine_similarity = dot_product / denom
        return 1.0 - cosine_similarity
