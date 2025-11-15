import { useState, useEffect, useRef, useCallback } from 'react';
import config from '../config';

const STORAGE_KEY = 'face-filter-jobs';
const LOGS_KEY = 'face-filter-logs';

// Global registry to track active event sources per stage
const activeConnections = new Map();

/**
 * Log event for debugging
 */
function logEvent(stage, eventType, data) {
  try {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    logs.push({
      timestamp: new Date().toISOString(),
      stage,
      eventType,
      data,
    });
    // Keep only last 100 logs
    if (logs.length > 100) logs.shift();
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Error logging event:', err);
  }
}

/**
 * Custom hook for managing face filter job status via SSE
 * One EventSource per stage - ensures no duplicate connections
 * 
 * @param {string} stage - The stage identifier (e.g., decoded session ID)
 * @param {string} jobId - The job ID to monitor
 * @param {function} onComplete - Callback when job completes (result or error)
 * @returns {Object} { status, result, error, isComplete, isConnected }
 */
export function useFaceFilterJob(stage, jobId, onComplete) {
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const stageRef = useRef(stage);
  const jobIdRef = useRef(jobId);
  const isMountedRef = useRef(true);

  // Update refs when props change
  useEffect(() => {
    stageRef.current = stage;
    jobIdRef.current = jobId;
  }, [stage, jobId]);

  const cleanup = useCallback((currentStage = stageRef.current) => {
    if (eventSourceRef.current) {
      logEvent(currentStage, 'cleanup', { jobId: jobIdRef.current });
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Remove from global registry
    if (currentStage && activeConnections.get(currentStage) === eventSourceRef.current) {
      activeConnections.delete(currentStage);
    }

    if (isMountedRef.current) {
      setIsConnected(false);
    }
  }, []);

  const connect = useCallback(() => {
    const currentStage = stageRef.current;
    const currentJobId = jobIdRef.current;

    console.log('Connecting to EventSource for stage:', currentStage, 'jobId:', currentJobId);

    if (!currentStage || !currentJobId) {
      return;
    }

    // Don't reconnect if job already completed
    if (isComplete) {
      logEvent(currentStage, 'skip_connect_completed', { jobId: currentJobId });
      return;
    }

    // Check if there's already an active connection for this stage
    const existingConnection = activeConnections.get(currentStage);
    if (existingConnection && existingConnection.readyState !== EventSource.CLOSED) {
      console.warn(`EventSource already active for stage: ${currentStage}`);
      logEvent(currentStage, 'duplicate_prevented', { jobId: currentJobId });
      return;
    }

    // Clean up any existing connection
    cleanup(currentStage);

    logEvent(currentStage, 'connecting', { jobId: currentJobId });

    try {
      const eventSource = new EventSource(
        `${config.QUEUE_API_BASE_URL}/api/get-job?id=${currentJobId}`
      );

      eventSourceRef.current = eventSource;
      activeConnections.set(currentStage, eventSource);

      eventSource.onopen = () => {
        logEvent(currentStage, 'connected', { jobId: currentJobId });
        if (isMountedRef.current) {
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
        }
      };

      eventSource.addEventListener('status', (e) => {
        try {
          const data = JSON.parse(e.data);
          logEvent(currentStage, 'status', data);

          if (isMountedRef.current) {
            setStatus(data);
          }
        } catch (err) {
          console.error('Error parsing status event:', err);
          logEvent(currentStage, 'parse_error', { error: err.message, event: 'status' });
        }
      });

      eventSource.addEventListener('result', (e) => {
        try {
          const data = JSON.parse(e.data);
          logEvent(currentStage, 'result', { resultCount: data.result?.length });

          if (isMountedRef.current) {
            setResult(data.result);
            setIsComplete(true);
            setIsConnected(false);
          }

          if (onComplete) {
            onComplete({ result: data.result, finishTime: data.finish_time });
          }

          cleanup(currentStage);
        } catch (err) {
          console.error('Error parsing result event:', err);
          logEvent(currentStage, 'parse_error', { error: err.message, event: 'result' });
        }
      });

      eventSource.addEventListener('error', (e) => {
        try {
          const data = JSON.parse(e.data);
          const errorMessage = data.error || 'Unknown error';

          logEvent(currentStage, 'job_error', { error: errorMessage });

          if (isMountedRef.current) {
            setError(errorMessage);
            setIsComplete(true);
            setIsConnected(false);
          }

          // Check if job not found - clear from localStorage
          if (errorMessage.toLowerCase().includes('not found') ||
            errorMessage.toLowerCase().includes('does not exist')) {
            logEvent(currentStage, 'job_not_found', { jobId: currentJobId });
            clearJobForStage(currentStage);
          }

          if (onComplete) {
            onComplete({ error: errorMessage, finishTime: data.finish_time });
          }

          cleanup(currentStage);
        } catch (err) {
          console.error('Error parsing error event:', err);
          logEvent(currentStage, 'parse_error', { error: err.message, event: 'error' });
        }
      });

      eventSource.onerror = (e) => {
        logEvent(currentStage, 'connection_error', {
          readyState: eventSource.readyState,
          attempts: reconnectAttemptsRef.current
        });

        if (isMountedRef.current) {
          setIsConnected(false);
        }

        // Only attempt reconnection if not complete and under max attempts
        if (!isComplete && reconnectAttemptsRef.current < 3 && isMountedRef.current) {
          reconnectAttemptsRef.current++;
          const delay = 2000 * reconnectAttemptsRef.current; // Exponential backoff

          logEvent(currentStage, 'reconnecting', {
            attempt: reconnectAttemptsRef.current,
            delay
          });

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && !isComplete) {
              connect();
            }
          }, delay);
        } else {
          logEvent(currentStage, 'reconnect_abandoned', {
            attempts: reconnectAttemptsRef.current,
            isComplete,
            isMounted: isMountedRef.current
          });
          cleanup(currentStage);
        }
      };
    } catch (err) {
      console.error('Error creating EventSource:', err);
      logEvent(currentStage, 'connection_failed', {
        error: err.message,
        jobId: currentJobId
      });

      if (isMountedRef.current) {
        setError(`Failed to connect: ${err.message}`);
      }
    }
  }, [isComplete, cleanup, onComplete]);

  // Connect when jobId changes
  useEffect(() => {
    if (stage && jobId) {
      connect();
    }

    return () => {
      cleanup(stage);
    };
  }, [stage, jobId, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup(stage);
    };
  }, [stage, cleanup]);

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

/**
 * Get event logs for debugging
 * @param {string} stage - Optional stage to filter logs
 * @returns {Array} Array of log entries
 */
export function getEventLogs(stage = null) {
  try {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    if (stage) {
      return logs.filter(log => log.stage === stage);
    }
    return logs;
  } catch (err) {
    console.error('Error reading logs:', err);
    return [];
  }
}

/**
 * Clear event logs
 */
export function clearEventLogs() {
  try {
    localStorage.removeItem(LOGS_KEY);
  } catch (err) {
    console.error('Error clearing logs:', err);
  }
}

/**
 * Get active connections count (for debugging)
 * @returns {number} Number of active EventSource connections
 */
export function getActiveConnectionsCount() {
  return activeConnections.size;
}

/**
 * Get active connection stages (for debugging)
 * @returns {Array} Array of stage identifiers with active connections
 */
export function getActiveConnectionStages() {
  return Array.from(activeConnections.keys());
}
