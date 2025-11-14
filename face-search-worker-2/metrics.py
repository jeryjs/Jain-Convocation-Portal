# pyright: reportPossiblyUnboundVariable=none
"""System metrics collection for worker monitoring"""

import psutil
import platform
import time
from typing import Dict, Optional

try:
    import py3nvml.py3nvml as nvml
    NVML_AVAILABLE = True
except ImportError:
    NVML_AVAILABLE = False


class MetricsCollector:
    """Collects system metrics (CPU, RAM, GPU)"""
    
    def __init__(self, gpu_index: int = 0):
        self.gpu_index = gpu_index
        self.has_gpu = False
        self.gpu_handle = None
        self.gpu_error_logged = False  # Track if we've logged GPU errors
        
        if NVML_AVAILABLE:
            try:
                nvml.nvmlInit()
                self.gpu_handle = nvml.nvmlDeviceGetHandleByIndex(gpu_index)
                self.has_gpu = True
                print(f"✅ GPU {gpu_index} initialized successfully")
            except Exception as e:
                print(f"⚠️  GPU metrics unavailable: {e}")
                self.gpu_error_logged = True
    
    def get_cpu_usage(self) -> float:
        """Get CPU usage percentage"""
        return psutil.cpu_percent(interval=0.1)
    
    def get_ram_usage(self) -> Dict[str, float]:
        """Get RAM usage details"""
        mem = psutil.virtual_memory()
        return {
            'percent': mem.percent,
            'used_gb': mem.used / (1024 ** 3),
            'available_gb': mem.available / (1024 ** 3),
            'total_gb': mem.total / (1024 ** 3)
        }
    
    def get_gpu_metrics(self) -> Optional[Dict]:
        """Get GPU metrics (utilization, temp, memory)"""
        if not self.has_gpu or not self.gpu_handle:
            return None
        
        try:
            # Utilization
            util = nvml.nvmlDeviceGetUtilizationRates(self.gpu_handle) # pyright: ignore[reportPossiblyUnboundVariable]
            
            # Ensure util is the expected object
            gpu_util = getattr(util, 'gpu', None)
            mem_util = getattr(util, 'memory', None)
            
            # Temperature
            temp = nvml.nvmlDeviceGetTemperature(self.gpu_handle, nvml.NVML_TEMPERATURE_GPU)
            
            # Memory
            mem_info = nvml.nvmlDeviceGetMemoryInfo(self.gpu_handle)
            
            # Ensure mem_info has the expected attributes
            memory_used = getattr(mem_info, 'used', None)
            memory_free = getattr(mem_info, 'free', None)
            memory_total = getattr(mem_info, 'total', None)
            
            # Name
            gpu_name = nvml.nvmlDeviceGetName(self.gpu_handle)
            if isinstance(gpu_name, bytes):
                gpu_name = gpu_name.decode('utf-8')
            
            return {
                'name': gpu_name,
                'utilization': gpu_util if gpu_util is not None else 0,
                'memory_utilization': mem_util if mem_util is not None else 0,
                'temperature': temp,
                'memory_used_mb': memory_used / (1024 ** 2) if memory_used is not None else 0,
                'memory_free_mb': memory_free / (1024 ** 2) if memory_free is not None else 0,
                'memory_total_mb': memory_total / (1024 ** 2) if memory_total is not None else 0
            }
        except Exception as e:
            # Only log the first error to avoid spam
            if not self.gpu_error_logged:
                print(f"⚠️  Error getting GPU metrics: {e}")
                self.gpu_error_logged = True
            return None
    
    def get_all_metrics(self) -> Dict:
        """Get all system metrics"""
        metrics = {
            'cpu_percent': self.get_cpu_usage(),
            'ram': self.get_ram_usage(),
            'gpu': self.get_gpu_metrics(),
            'hostname': platform.node(),
            'platform': platform.system(),
            'timestamp': time.time()
        }
        return metrics
    
    def cleanup(self):
        """Cleanup NVML"""
        if self.has_gpu:
            try:
                nvml.nvmlShutdown()
            except:
                pass


if __name__ == '__main__':
    # Test metrics collection
    collector = MetricsCollector()
    metrics = collector.get_all_metrics()
    
    print("=" * 50)
    print("System Metrics Test")
    print("=" * 50)
    print(f"CPU Usage: {metrics['cpu_percent']}%")
    print(f"RAM Usage: {metrics['ram']['percent']}% ({metrics['ram']['used_gb']:.1f}GB / {metrics['ram']['total_gb']:.1f}GB)")
    
    if metrics['gpu']:
        gpu = metrics['gpu']
        print(f"\nGPU: {gpu['name']}")
        print(f"GPU Utilization: {gpu['utilization']}%")
        print(f"GPU Temperature: {gpu['temperature']}°C")
        print(f"GPU Memory: {gpu['memory_used_mb']:.0f}MB / {gpu['memory_total_mb']:.0f}MB")
    else:
        print("\nNo GPU detected")
    
    collector.cleanup()
