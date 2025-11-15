# pyright: reportAttributeAccessIssue=false

"""System metrics collection for worker monitoring"""

import psutil
import platform
import time
from typing import Dict, Optional
import py3nvml.py3nvml as nvml


class MetricsCollector:
    """Collects system metrics (CPU, RAM, GPU)"""
    
    def __init__(self, gpu_index: int = 0):
        self.gpu_index = gpu_index
        nvml.nvmlInit()
        self.gpu_handle = nvml.nvmlDeviceGetHandleByIndex(gpu_index)
    
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
    
    def get_gpu_metrics(self) -> Dict:
        """Get GPU metrics (utilization, temp, memory)"""
        try:
            # Utilization
            util = nvml.nvmlDeviceGetUtilizationRates(self.gpu_handle)
            
            gpu_utilization = util.gpu
            
            # Temperature
            temp = nvml.nvmlDeviceGetTemperature(self.gpu_handle, nvml.NVML_TEMPERATURE_GPU)
            
            # Memory
            mem_info = nvml.nvmlDeviceGetMemoryInfo(self.gpu_handle)
            memory_used_mb = mem_info.used / (1024 ** 2)
            memory_free_mb = mem_info.free / (1024 ** 2)
            memory_total_mb = mem_info.total / (1024 ** 2)
            
            # Name
            gpu_name = nvml.nvmlDeviceGetName(self.gpu_handle)
            if isinstance(gpu_name, bytes):
                gpu_name = gpu_name.decode('utf-8')
            
            return {
                'name': gpu_name,
                'utilization': gpu_utilization,
                'temperature': temp,
                'memory_used_mb': memory_used_mb,
                'memory_free_mb': memory_free_mb,
                'memory_total_mb': memory_total_mb
            }
        except Exception as e:
            # print(f"❌ Failed to get GPU metrics: {e}")
            # Try to reinitialize NVML and reacquire handle once
            try:
                nvml.nvmlShutdown()
            except Exception:
                pass
            try:
                nvml.nvmlInit()
                self.gpu_handle = nvml.nvmlDeviceGetHandleByIndex(self.gpu_index)
                # Try again once
                util = nvml.nvmlDeviceGetUtilizationRates(self.gpu_handle)
                gpu_utilization = util.gpu
                temp = nvml.nvmlDeviceGetTemperature(self.gpu_handle, nvml.NVML_TEMPERATURE_GPU)
                mem_info = nvml.nvmlDeviceGetMemoryInfo(self.gpu_handle)
                memory_used_mb = mem_info.used / (1024 ** 2)
                memory_free_mb = mem_info.free / (1024 ** 2)
                memory_total_mb = mem_info.total / (1024 ** 2)
                gpu_name = nvml.nvmlDeviceGetName(self.gpu_handle)
                if isinstance(gpu_name, bytes):
                    gpu_name = gpu_name.decode('utf-8')
                return {
                    'name': gpu_name,
                    'utilization': gpu_utilization,
                    'temperature': temp,
                    'memory_used_mb': memory_used_mb,
                    'memory_free_mb': memory_free_mb,
                    'memory_total_mb': memory_total_mb
                }
            except Exception as e2:
                print(f"❌ Retried and failed to get GPU metrics: {e2}")
                return {
                    'name': None,
                    'utilization': None,
                    'temperature': None,
                    'memory_used_mb': None,
                    'memory_free_mb': None,
                    'memory_total_mb': None
                }
    
    def get_all_metrics(self) -> Dict:
        """Get all system metrics"""
        return {
            'cpu_percent': self.get_cpu_usage(),
            'ram': self.get_ram_usage(),
            'gpu': self.get_gpu_metrics(),
            'hostname': platform.node(),
            'platform': platform.system(),
            'timestamp': time.time()
        }
    
    def cleanup(self):
        """Cleanup NVML"""
        nvml.nvmlShutdown()


if __name__ == '__main__':
    # Test metrics collection
    collector = MetricsCollector()
    metrics = collector.get_all_metrics()
    
    print("=" * 50)
    print("System Metrics Test")
    print("=" * 50)
    print(f"CPU Usage: {metrics['cpu_percent']}%")
    print(f"RAM Usage: {metrics['ram']['percent']}% ({metrics['ram']['used_gb']:.1f}GB / {metrics['ram']['total_gb']:.1f}GB)")
    
    gpu = metrics['gpu']
    print(f"\nGPU: {gpu['name']}")
    print(f"GPU Utilization: {gpu['utilization']}%")
    print(f"GPU Temperature: {gpu['temperature']}°C")
    print(f"GPU Memory: {gpu['memory_used_mb']:.0f}MB / {gpu['memory_total_mb']:.0f}MB")
    
    collector.cleanup()
