"""
Test suite for face search worker components
"""

import contextlib
import os
import sys
import base64
import io
import time
from PIL import Image
from dotenv import load_dotenv
import numpy as np
import traceback
import random

# Add project root to path
sys.path.append(os.path.dirname(__file__))

print("=" * 60)
print("Face Search Worker - Test Suite")
print("=" * 60)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')

CONVOCATION_PHOTOS_DIR = r"Z:\Downloads\jain 14th convo"
TEST_SELFIE = os.path.dirname(__file__) + r".\selfie_images\selfie.jpg"


# ============================================================
# Test 1: Metrics Collection
# ============================================================
def test_metrics():
    print("\n📊 Test 1: Metrics Collection")
    print("-" * 60)
    
    from metrics import MetricsCollector
    
    collector = MetricsCollector(gpu_index=0)
    metrics = collector.get_all_metrics()
    
    print(f"✓ CPU Usage: {metrics['cpu_percent']:.1f}%")
    print(f"✓ RAM Usage: {metrics['ram']['percent']:.1f}% ({metrics['ram']['used_gb']:.1f}/{metrics['ram']['total_gb']:.1f}GB)")
    
    gpu = metrics['gpu']
    print(f"✓ GPU: {gpu['name']}")
    print(f"✓ GPU Utilization: {gpu['utilization']}%")
    print(f"✓ GPU Temperature: {gpu['temperature']}°C")
    print(f"✓ GPU Memory: {gpu['memory_used_mb']:.0f}/{gpu['memory_total_mb']:.0f}MB")
    
    collector.cleanup()
    print("✅ Metrics test passed!")


# ============================================================
# Test 2: Worker ID Generation
# ============================================================
def test_worker_id_generation():
    print("\n🆔 Test 2: Worker ID Generation")
    print("-" * 60)
    
    import redis
    
    # Connect to Redis
    client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        decode_responses=True
    )
    
    # Clear test workers
    test_prefix = "TEST_LAPTOP_gpu0_test_"
    workers_data = client.hgetall('workers')
    for worker_id in workers_data.keys():  # type: ignore
        if worker_id.startswith(test_prefix):
            client.hdel('workers', worker_id)
    
    print("✓ Cleared existing test workers")
    
    # Simulate worker ID generation
    hostname = "TEST_LAPTOP"
    worker_type = "gpu0"
    engine_suffix = "_test"
    
    # Register 3 workers
    worker_ids = []
    for i in range(3):
        workers_data = client.hgetall('workers')
        existing_workers = [
            k for k in workers_data.keys()  # type: ignore
            if k.startswith(f"{hostname}_{worker_type}{engine_suffix}_")
        ]
        
        worker_num = 1
        while f"{hostname}_{worker_type}{engine_suffix}_{worker_num}" in existing_workers:
            worker_num += 1
        
        worker_id = f"{hostname}_{worker_type}{engine_suffix}_{worker_num}"
        worker_ids.append(worker_id)
        
        # Register in Redis
        client.hset('workers', worker_id, '{"test": true}')
        print(f"✓ Registered worker: {worker_id}")
    
    assert worker_ids == [
        f"{test_prefix}1",
        f"{test_prefix}2",
        f"{test_prefix}3"
    ], "Worker IDs not sequential!"
    
    # Remove worker 2
    client.hdel('workers', worker_ids[1])
    print(f"✓ Removed worker: {worker_ids[1]}")
    
    # Add new worker - should fill the gap
    workers_data = client.hgetall('workers')
    existing_workers = [
        k for k in workers_data.keys()  # type: ignore
        if k.startswith(f"{hostname}_{worker_type}{engine_suffix}_")
    ]
    
    worker_num = 1
    while f"{hostname}_{worker_type}{engine_suffix}_{worker_num}" in existing_workers:
        worker_num += 1
    
    new_worker_id = f"{hostname}_{worker_type}{engine_suffix}_{worker_num}"
    print(f"✓ New worker fills gap: {new_worker_id}")
    
    assert new_worker_id == f"{test_prefix}2", "Worker ID didn't fill gap!"
    
    # Cleanup
    for worker_id in worker_ids:
        client.hdel('workers', worker_id)
    client.hdel('workers', new_worker_id)
    
    print("✅ Worker ID generation test passed!")


# ============================================================
# Test 3: Face Recognition Engine
# ============================================================
def test_face_recognition_engine():
    print("\n👤 Test 3: face_recognition Engine")
    print("-" * 60)
    
    # Test stage
    stage = "18-11-2025 Day 1/09AM to 01PM/Stage 2 (Center)"
    gallery_dir = os.path.join(CONVOCATION_PHOTOS_DIR, stage)
    
    if not os.path.exists(gallery_dir):
        print(f"❌ Gallery directory not found: {gallery_dir}")
        print("⚠️  Skipping test - directory does not exist")
        return
    
    # Get all images from stage directory
    gallery_images = []
    valid_extensions = ('.png', '.jpg', '.jpeg')
    for root, dirs, files in os.walk(gallery_dir):
        for f in files:
            if f.lower().endswith(valid_extensions):
                image_path = os.path.join(root, f)
                gallery_images.append({
                    'id': os.path.relpath(image_path, CONVOCATION_PHOTOS_DIR),
                    'image_path': image_path
                })
    
    print(f"✓ Found {len(gallery_images)} images in stage directory")
    
    if len(gallery_images) == 0:
        print("❌ No images found in gallery directory")
        return
    
    # Use a random image as selfie
    # selfie_path = random.choice(gallery_images)['image_path']
    selfie_path = TEST_SELFIE
    print(f"✓ Using selfie: {os.path.basename(selfie_path)}")
    
    # Convert selfie to base64
    with Image.open(selfie_path) as img:
        if img.mode == "RGBA":
            img = img.convert("RGB")
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        selfie_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
    # Convert gallery images to format expected by engine
    gallery_for_engine = []
    for img_data in gallery_images[:50]:  # Limit to 50 for faster testing
        with Image.open(img_data['image_path']) as img:
            if img.mode == "RGBA":
                img = img.convert("RGB")
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG')
            gallery_for_engine.append({
                'id': img_data['id'],
                'image': base64.b64encode(buffer.getvalue()).decode('utf-8')
            })
    
    print(f"✓ Prepared {len(gallery_for_engine)} gallery images for search")
    
    # Initialize engine
    try:
        from engines.face_recognition.engine import FaceRecognitionEngine
        engine = FaceRecognitionEngine(use_gpu=True)
        print(f"✓ Engine initialized: {engine.name}")
    except Exception as e:
        if "No module named 'face_recognition'" in str(e):
            print("⚠️  To run this test, you need to be on the 'ml' environment")
            raise RuntimeError("face_recognition engine test skipped due to incorrect environment.")
        else:
            print(f"Error: {e}")
            raise
        
    # Perform search
    print("🔍 Searching for faces...")
    start_time = time.time()
    results = engine.search_faces(
        selfie_base64=selfie_base64,
        gallery_images=gallery_for_engine,
        exclude_images=None
    )
    
    # Show top 20 results
    top_results = results[:20]
    print(f"\n✅ Found {len(results)} matches in {(time.time() - start_time):.2f}s. Top 20 results:")
    print("-" * 60)
    for i, result in enumerate(top_results, 1):
        print(f"{i:2d}. {result['id']:<50} | Similarity: {result['similarity']:.4f}")
    
    print("\n✅ face_recognition engine test passed!")


# ============================================================
# Test 4: DeepFace Engine (Real Images)
# ============================================================
def test_deepface_engine():
    print("\n🤖 Test 4: DeepFace Engine (Real Images)")
    print("-" * 60)
    
    # Test stage
    stage = "18-11-2025 Day 1/09AM to 01PM/Stage 2 (Center)"
    gallery_dir = os.path.join(CONVOCATION_PHOTOS_DIR, stage)
    
    if not os.path.exists(gallery_dir):
        print(f"❌ Gallery directory not found: {gallery_dir}")
        print("⚠️  Skipping test - directory does not exist")
        return
    
    # Get all images from stage directory
    gallery_images = []
    valid_extensions = ('.png', '.jpg', '.jpeg')
    for root, dirs, files in os.walk(gallery_dir):
        for f in files:
            if f.lower().endswith(valid_extensions):
                image_path = os.path.join(root, f)
                gallery_images.append({
                    'id': os.path.relpath(image_path, CONVOCATION_PHOTOS_DIR),
                    'image_path': image_path
                })
    
    print(f"✓ Found {len(gallery_images)} images in stage directory")
    
    if len(gallery_images) == 0:
        print("❌ No images found in gallery directory")
        return
    
    # Use first image as selfie
    # selfie_path = gallery_images[0]['image_path']
    selfie_path = TEST_SELFIE
    print(f"✓ Using selfie: {os.path.basename(selfie_path)}")
    
    # Convert selfie to base64
    with Image.open(selfie_path) as img:
        if img.mode == "RGBA":
            img = img.convert("RGB")
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        selfie_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

    # Convert gallery images to format expected by engine
    gallery_for_engine = []
    for img_data in gallery_images[:50]:  # Limit to 50 for faster testing
        with Image.open(img_data['image_path']) as img:
            if img.mode == "RGBA":
                img = img.convert("RGB")
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG')
            gallery_for_engine.append({
                'id': img_data['id'],
                'image': base64.b64encode(buffer.getvalue()).decode('utf-8')
            })
    
    print(f"✓ Prepared {len(gallery_for_engine)} gallery images for search")
    
    # Initialize engine
    try:
        with contextlib.redirect_stderr(open(os.devnull, 'w')):
            from engines.deepface.engine import DeepFaceEngine
        engine = DeepFaceEngine(use_gpu=True)
        print(f"✓ Engine initialized: {engine.name}")
    except Exception:
        print("⚠️  To run this test, you need to be on the 'tf' environment")
        raise RuntimeError("DeepFace engine test skipped due to incorrect environment.")
        

    # Perform search
    print("🔍 Searching for faces...")
    start_time = time.time()
    results = engine.search_faces(
        selfie_base64=selfie_base64,
        gallery_images=gallery_for_engine,
        exclude_images=None
    )

    # Show top 20 results
    top_results = results[:20]
    print(f"\n✅ Found {len(results)} matches in {(time.time() - start_time):.2f}s. Top 20 results:")
    print("-" * 60)
    for i, result in enumerate(top_results, 1):
        print(f"{i:2d}. {result['id']:<50} | Similarity: {result['similarity']:.4f}")
    
    print("\n✅ DeepFace engine test passed!")


# ============================================================
# Run All Tests
# ============================================================
def run_all_tests():
    tests = [
        ("Metrics Collection", test_metrics),
        ("Worker ID Generation", test_worker_id_generation),
        ("face_recognition Engine", test_face_recognition_engine),
        ("DeepFace Engine", test_deepface_engine),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            test_func()
            passed += 1
        except Exception as e:
            print(f"\n❌ Test '{name}' FAILED!")
            print(f"Error: {e}")
            # traceback.print_exc()
            failed += 1
    
    print("\n" + "=" * 60)
    print("Test Results")
    print("=" * 60)
    print(f"✅ Passed: {passed}/{len(tests)}")
    print(f"❌ Failed: {failed}/{len(tests)}")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Review errors above.")


if __name__ == '__main__':
    run_all_tests()

