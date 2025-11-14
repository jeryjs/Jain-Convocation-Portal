# pyright: reportPossiblyUnboundVariable=false

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
            except Exception as e:
                print(f"⚠️  GPU metrics unavailable: {e}")
    
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
            util = nvml.nvmlDeviceGetUtilizationRates(self.gpu_handle)
            if hasattr(util, 'gpu') and not isinstance(util, str):
                gpu_utilization = util.gpu
            else:
                gpu_utilization = 0  # fallback if util is not as expected
            
            # Temperature
            temp = nvml.nvmlDeviceGetTemperature(self.gpu_handle, nvml.NVML_TEMPERATURE_GPU)
            
            # Memory
            mem_info = nvml.nvmlDeviceGetMemoryInfo(self.gpu_handle)
            
            # Name
            gpu_name = nvml.nvmlDeviceGetName(self.gpu_handle)
            if isinstance(gpu_name, bytes):
                gpu_name = gpu_name.decode('utf-8')

            # Defensive: check mem_info type and ensure it's not a string
            if (
                mem_info is not None
                and not isinstance(mem_info, str)
                and hasattr(mem_info, 'used')
                and hasattr(mem_info, 'free')
                and hasattr(mem_info, 'total')
            ):
                memory_used_mb = mem_info.used / (1024 ** 2)
                memory_free_mb = mem_info.free / (1024 ** 2)
                memory_total_mb = mem_info.total / (1024 ** 2)
            else:
                memory_used_mb = 0
                memory_free_mb = 0
                memory_total_mb = 0
            
            return {
                'name': gpu_name,
                'utilization': gpu_utilization,
                'temperature': temp,
                'memory_used_mb': memory_used_mb,
                'memory_free_mb': memory_free_mb,
                'memory_total_mb': memory_total_mb
            }
        except nvml.NVMLError as e:
            if not self.gpu_error_logged:
                print(f"⚠️  NVML Error getting GPU metrics: {e}")
                self.gpu_error_logged = True
            return None
        except AttributeError as e:
            if not self.gpu_error_logged:
                print(f"⚠️  GPU attribute error (may not support this metric): {e}")
                self.gpu_error_logged = True
            # Return partial metrics
            try:
                gpu_name = nvml.nvmlDeviceGetName(self.gpu_handle)
                if isinstance(gpu_name, bytes):
                    gpu_name = gpu_name.decode('utf-8')
                return {
                    'name': gpu_name,
                    'utilization': 0,
                    'memory_utilization': 0,
                    'temperature': 0,
                    'memory_used_mb': 0,
                    'memory_free_mb': 0,
                    'memory_total_mb': 0
                }
            except:
                return None
        except Exception as e:
            if not self.gpu_error_logged:
                print(f"⚠️  Unexpected error getting GPU metrics: {type(e).__name__}: {e}")
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
