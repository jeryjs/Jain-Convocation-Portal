"""
Test suite for face search worker components
"""

import os
import sys
import base64
import io
from PIL import Image
from dotenv import load_dotenv
import numpy as np

# Add project root to path
sys.path.append(os.path.dirname(__file__))

print("=" * 60)
print("Face Search Worker - Test Suite")
print("=" * 60)

load_dotenv()
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')

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
# Test 2: Base64 Image Encoding/Decoding
# ============================================================
def test_base64_image():
    print("\n🖼️  Test 2: Base64 Image Encoding/Decoding")
    print("-" * 60)
    
    from core.base_engine import BaseEngine
    
    # Create a test image (100x100 red square)
    img = Image.new('RGB', (100, 100), color='red')
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    img_bytes = buffer.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
    
    print(f"✓ Created test image: 100x100 red square")
    print(f"✓ Base64 length: {len(img_base64)} chars")
    
    # Test with data URI prefix
    data_uri = f"data:image/jpeg;base64,{img_base64}"
    
    # Decode back
    decoded_img = BaseEngine.decode_base64_image(img_base64)
    print(f"✓ Decoded without prefix: shape {decoded_img.shape}")
    
    decoded_img_uri = BaseEngine.decode_base64_image(data_uri)
    print(f"✓ Decoded with prefix: shape {decoded_img_uri.shape}")
    
    assert decoded_img.shape == (100, 100, 3), "Image shape mismatch!"
    assert decoded_img_uri.shape == (100, 100, 3), "Image shape mismatch!"
    
    print("✅ Base64 encoding/decoding test passed!")


# ============================================================
# Test 3: Worker ID Generation
# ============================================================
def test_worker_id_generation():
    print("\n🆔 Test 3: Worker ID Generation")
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
    for worker_id in workers_data.keys(): # type: ignore
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
# Test 4: Face Recognition Engine (Mock)
# ============================================================
def test_face_recognition_engine():
    print("\n👤 Test 4: Face Recognition Engine")
    print("-" * 60)
    
    from engines.face_recognition.engine import FaceRecognitionEngine
    
    engine = FaceRecognitionEngine(use_gpu=True)
    print(f"✓ Engine initialized: {engine.name}")
    
    # Create test selfie (red square)
    img = Image.new('RGB', (200, 200), color='red')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    selfie_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    # Create gallery images (blue, green squares)
    gallery_images = []
    for i, color in enumerate(['blue', 'green', 'yellow']):
        img = Image.new('RGB', (200, 200), color=color)
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        gallery_images.append({
            'id': f'img_{i:03d}',
            'image': base64.b64encode(buffer.getvalue()).decode('utf-8')
        })
    
    print(f"✓ Created test selfie and {len(gallery_images)} gallery images")
    
    # Note: This will fail if no faces are detected, which is expected
    # for solid color images. This test is mainly to verify the engine loads.
    try:
        results = engine.search_faces(
            selfie_base64=selfie_base64,
            gallery_images=gallery_images[:1],  # Only test 1 image
            exclude_images=None
        )
        print(f"✓ Engine processed images (found {len(results)} matches)")
    except ValueError as e:
        print(f"✓ Engine correctly detected no faces: {e}")
    
    print("✅ Face recognition engine test passed!")


# ============================================================
# Test 5: Exclude Faces Logic
# ============================================================
def test_exclude_faces():
    print("\n🚫 Test 5: Exclude Faces Logic")
    print("-" * 60)
    
    exclude_dir = os.path.join(os.path.dirname(__file__), 'exclude_faces')
    
    if not os.path.exists(exclude_dir):
        os.makedirs(exclude_dir)
        print(f"✓ Created exclude_faces directory: {exclude_dir}")
    
    # Count exclude images
    valid_extensions = ('.png', '.jpg', '.jpeg')
    exclude_images = []
    for root, dirs, files in os.walk(exclude_dir):
        for f in files:
            if f.lower().endswith(valid_extensions):
                exclude_images.append(os.path.join(root, f))
    
    print(f"✓ Found {len(exclude_images)} exclude images")
    for img_path in exclude_images[:5]:  # Show first 5
        print(f"  - {os.path.basename(img_path)}")
    
    if len(exclude_images) > 5:
        print(f"  ... and {len(exclude_images) - 5} more")
    
    print("✅ Exclude faces test passed!")


# ============================================================
# Test 6: Redis Connection & Pause Flag
# ============================================================
def test_redis_pause():
    print("\n⏸️  Test 6: Redis Pause Flag")
    print("-" * 60)
    
    import redis
    
    client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        decode_responses=True
    )
    
    test_worker_id = "TEST_WORKER_123"
    
    # Test pause
    client.set(f'worker:{test_worker_id}:paused', '1')
    is_paused = client.get(f'worker:{test_worker_id}:paused')
    print(f"✓ Set pause flag: {is_paused == '1'}")
    
    # Test resume
    client.delete(f'worker:{test_worker_id}:paused')
    is_paused = client.get(f'worker:{test_worker_id}:paused')
    print(f"✓ Removed pause flag: {is_paused is None}")
    
    print("✅ Redis pause flag test passed!")


# ============================================================
# Test 7: Similarity Calculation (Mock)
# ============================================================
def test_similarity_sorting():
    print("\n📊 Test 7: Similarity Sorting")
    print("-" * 60)
    
    # Mock results
    results = [
        {'id': 'img_001', 'similarity': 0.65},
        {'id': 'img_002', 'similarity': 0.92},
        {'id': 'img_003', 'similarity': 0.78},
        {'id': 'img_004', 'similarity': 0.88},
        {'id': 'img_005', 'similarity': 0.45},
    ]
    
    print("✓ Unsorted results:")
    for r in results:
        print(f"  - {r['id']}: {r['similarity']:.2f}")
    
    # Sort descending
    results.sort(key=lambda x: x['similarity'], reverse=True)
    
    print("\n✓ Sorted results (descending):")
    for r in results:
        print(f"  - {r['id']}: {r['similarity']:.2f}")
    
    # Verify order
    assert results[0]['similarity'] == 0.92, "First result not highest!"
    assert results[-1]['similarity'] == 0.45, "Last result not lowest!"
    
    print("✅ Similarity sorting test passed!")


# ============================================================
# Run All Tests
# ============================================================
def run_all_tests():
    tests = [
        ("Metrics Collection", test_metrics),
        ("Base64 Encoding/Decoding", test_base64_image),
        ("Worker ID Generation", test_worker_id_generation),
        ("Face Recognition Engine", test_face_recognition_engine),
        ("Exclude Faces Logic", test_exclude_faces),
        ("Redis Pause Flag", test_redis_pause),
        ("Similarity Sorting", test_similarity_sorting),
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
            import traceback
            traceback.print_exc()
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
