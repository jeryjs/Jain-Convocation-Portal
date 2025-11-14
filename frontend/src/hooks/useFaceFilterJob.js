import { useState, useEffect, useRef, useCallback } from 'react';
import config from '../config';

const STORAGE_KEY = 'face-filter-jobs';

/**
 * Custom hook for managing face filter job status via SSE
 * @param {string} jobId - The job ID to monitor
 * @param {function} onComplete - Callback when job completes (result or error)
 * @returns {Object} { status, result, error, isComplete, isConnected }
 */
export function useFaceFilterJob(jobId, onComplete) {
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!jobId || isComplete) return;

    cleanup();

    const eventSource = new EventSource(
      `${config.QUEUE_API_BASE_URL}/api/get-job?id=${jobId}`
    );
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data);
        setStatus(data);
      } catch (err) {
        console.error('Error parsing status event:', err);
      }
    });

    eventSource.addEventListener('result', (e) => {
      try {
        const data = JSON.parse(e.data);
        setResult(data.result);
        setIsComplete(true);
        setIsConnected(false);
        
        if (onComplete) {
          onComplete({ result: data.result, finishTime: data.finish_time });
        }
        
        cleanup();
      } catch (err) {
        console.error('Error parsing result event:', err);
      }
    });

    eventSource.addEventListener('error', (e) => {
      try {
        const data = JSON.parse(e.data);
        setError(data.error);
        setIsComplete(true);
        setIsConnected(false);
        
        if (onComplete) {
          onComplete({ error: data.error, finishTime: data.finish_time });
        }
        
        cleanup();
      } catch (err) {
        console.error('Error parsing error event:', err);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      
      // Only attempt reconnection if not complete
      if (!isComplete && reconnectAttemptsRef.current < 3) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000 * reconnectAttemptsRef.current); // Exponential backoff
      } else {
        cleanup();
      }
    };
  }, [jobId, isComplete, cleanup, onComplete]);

  useEffect(() => {
    if (jobId) {
      connect();
    }

    return cleanup;
  }, [jobId, connect, cleanup]);

  return {
    status,
    result,
    error,
    isComplete,
    isConnected,
  };
}

/**
 * Get face filter jobs from localStorage
 * @returns {Object} Jobs object keyed by stage
 */
export function getFaceFilterJobs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error('Error reading face filter jobs:', err);
    return {};
  }
}

/**
 * Get job for a specific stage
 * @param {string} stage - The stage identifier
 * @returns {Object|null} Job data or null
 */
export function getJobForStage(stage) {
  const jobs = getFaceFilterJobs();
  return jobs[stage] || null;
}

/**
 * Save job data for a stage
 * @param {string} stage - The stage identifier
 * @param {Object} jobData - Job data to save
 */
export function saveJobForStage(stage, jobData) {
  try {
    const jobs = getFaceFilterJobs();
    jobs[stage] = { ...jobs[stage], ...jobData };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch (err) {
    console.error('Error saving job data:', err);
  }
}

/**
 * Clear job data for a stage
 * @param {string} stage - The stage identifier
 */
export function clearJobForStage(stage) {
  try {
    const jobs = getFaceFilterJobs();
    delete jobs[stage];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch (err) {
    console.error('Error clearing job data:', err);
  }
}

/**
 * Clear filter state (keeps job but removes active filter)
 * This is used when user clicks "Disable Filter"
 * @param {string} stage - The stage identifier
 */
export function clearFilterStateForStage(stage) {
  const job = getJobForStage(stage);
  if (job) {
    saveJobForStage(stage, { ...job, filterActive: false });
  }
}

/**
 * Enable filter for a stage
 * @param {string} stage - The stage identifier
 */
export function enableFilterForStage(stage) {
  const job = getJobForStage(stage);
  if (job && job.result) {
    saveJobForStage(stage, { ...job, filterActive: true });
  }
}
