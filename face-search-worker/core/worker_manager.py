"""
Worker Manager
Handles worker lifecycle, registration, and cleanup
"""

import os
import time
import json
import socket
import signal
import threading
import redis as redis_lib
from typing import Optional, Dict, Any


class WorkerManager:
    """Manages worker lifecycle and Redis registration"""
    
    def __init__(
        self,
        redis_host: str,
        redis_port: int,
        redis_password: str,
        gpu_index: int,
        use_cpu: bool,
        concurrency: int,
        engine_name: str,
        metrics_collector,
        logger
    ):
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.redis_password = redis_password
        self.gpu_index = gpu_index
        self.use_cpu = use_cpu
        self.concurrency = concurrency
        self.engine_name = engine_name
        self.metrics_collector = metrics_collector
        self.logger = logger
        
        self.redis_client: Optional[redis_lib.Redis] = None
        self.worker_id: Optional[str] = None
        self.hostname = socket.gethostname()
        
        self.worker_stats = {
            'jobs_processed': 0,
            'jobs_failed': 0,
            'current_job': None,
            'start_time': time.time()
        }
        
        self.heartbeat_thread: Optional[threading.Thread] = None
        self.running = True
    
    def initialize_redis(self) -> redis_lib.Redis:
        """Initialize Redis connection and generate worker ID"""
        self.logger.info(f"🔌 Connecting to Redis at {self.redis_host}:{self.redis_port}...")
        
        client = redis_lib.Redis(
            host=self.redis_host,
            port=self.redis_port,
            password=self.redis_password if self.redis_password else None,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True
        )
        
        # Test connection
        client.ping()
        self.logger.info("✅ Redis connected!")
        
        # Generate unique worker ID using active worker count
        worker_type = 'cpu' if self.use_cpu else f'gpu{self.gpu_index}'
        engine_suffix = f'_{self.engine_name.lower().replace("engine", "")}'
        
        # Get current active workers to determine next available number
        workers_data = client.hgetall('workers')
        existing_workers = [
            k for k in workers_data.keys() # type: ignore
            if k.startswith(f"{self.hostname}_{worker_type}{engine_suffix}_")
        ]
        
        # Find the next available number (fills gaps)
        worker_num = 1
        while f"{self.hostname}_{worker_type}{engine_suffix}_{worker_num}" in existing_workers:
            worker_num += 1
        
        self.worker_id = f"{self.hostname}_{worker_type}{engine_suffix}_{worker_num}"
        self.redis_client = client
        
        self.logger.info(f"🆔 Worker ID: {self.worker_id}\n")
        
        return client
    
    def register_worker(self):
        """Register worker with Redis"""
        if not self.metrics_collector or not self.redis_client:
            return
        
        gpu_info = self.metrics_collector.get_gpu_metrics()
        
        worker_info = {
            'id': self.worker_id,
            'hostname': self.hostname,
            'status': 'online',
            'gpu_index': self.gpu_index if not self.use_cpu else None,
            'gpu_name': gpu_info['name'] if gpu_info else 'CPU',
            'use_cpu': self.use_cpu,
            'concurrency': self.concurrency,
            'engine': self.engine_name,
            'start_time': self.worker_stats['start_time'],
            'last_heartbeat': time.time(),
            'jobs_processed': 0,
            'jobs_failed': 0,
            'current_job': None
        }
        
        self.redis_client.hset('workers', self.worker_id, json.dumps(worker_info))
        self.logger.info(f"✅ Worker registered: {self.worker_id}\n")
    
    def heartbeat_loop(self):
        """Send heartbeat to Redis every 5 seconds"""
        while self.running:
            try:
                if not self.metrics_collector or not self.redis_client:
                    time.sleep(5)
                    continue
                
                metrics = self.metrics_collector.get_all_metrics()
                
                worker_info = {
                    'id': self.worker_id,
                    'hostname': self.hostname,
                    'status': 'online',
                    'gpu_index': self.gpu_index if not self.use_cpu else None,
                    'gpu_name': metrics['gpu']['name'] if metrics['gpu'] else 'CPU',
                    'use_cpu': self.use_cpu,
                    'concurrency': self.concurrency,
                    'engine': self.engine_name,
                    'start_time': self.worker_stats['start_time'],
                    'uptime': time.time() - self.worker_stats['start_time'],
                    'last_heartbeat': time.time(),
                    'jobs_processed': self.worker_stats['jobs_processed'],
                    'jobs_failed': self.worker_stats['jobs_failed'],
                    'current_job': self.worker_stats['current_job'],
                    'cpu_percent': metrics['cpu_percent'],
                    'ram_percent': metrics['ram']['percent'],
                    'ram_available_gb': metrics['ram']['available_gb'],
                    'gpu_utilization': metrics['gpu']['utilization'] if metrics['gpu'] else None,
                    'gpu_memory_used_mb': metrics['gpu']['memory_used_mb'] if metrics['gpu'] else None,
                    'gpu_temperature': metrics['gpu']['temperature'] if metrics['gpu'] else None
                }
                
                self.redis_client.hset('workers', self.worker_id, json.dumps(worker_info))
                
            except Exception as e:
                self.logger.warning(f"⚠️  Heartbeat error: {e}")
            
            time.sleep(5)
    
    def start_heartbeat(self):
        """Start heartbeat thread"""
        self.heartbeat_thread = threading.Thread(target=self.heartbeat_loop, daemon=True)
        self.heartbeat_thread.start()
        self.logger.info("💓 Heartbeat started\n")
    
    def cleanup(self):
        """Cleanup worker on shutdown"""
        self.logger.info("\n\n🧹 Cleaning up...")
        self.running = False
        
        if self.redis_client and self.worker_id:
            try:
                # Remove worker from Redis
                self.redis_client.hdel('workers', self.worker_id)
                # Remove pause flag if exists
                self.redis_client.delete(f'worker:{self.worker_id}:paused')
                self.logger.info(f"✅ Worker {self.worker_id} removed from Redis")
            except Exception as e:
                self.logger.error(f"Error during cleanup: {e}")
        
        if self.metrics_collector:
            self.metrics_collector.cleanup()
        
        self.logger.info("👋 Shutdown complete\n")
    
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            self.logger.info(f"\n\n⚠️  Received signal {signum}")
            self.cleanup()
            os._exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
