import { useState, useEffect, useRef } from 'react';
import { 
  getFaceSearchJob, 
  connectToFaceSearchStream 
} from '../services/faceSearch';

/**
 * Custom hook to monitor face search job status
 * @param {string} path - Gallery path (day/time/batch)
 * @returns {Object} Face search state and controls
 */
export function useFaceSearch(path) {
  const [jobStatus, setJobStatus] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const cleanupRef = useRef(null);
  const pathRef = useRef(path);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    if (!path) return;

    // Check if there's an existing job for this path
    const job = getFaceSearchJob(path);
    
    if (!job) {
      setIsActive(false);
      setJobStatus(null);
      setQueuePosition(null);
      setResults(null);
      setError(null);
      return;
    }

    // If job is already completed, load results
    if (job.status === 'completed' && job.results) {
      setResults(job.results);
      setJobStatus('completed');
      setIsActive(false);
      return;
    }

    // If job is pending, connect to stream
    if (job.status === 'pending') {
      setIsActive(true);
      setJobStatus('processing');
      
      const cleanup = connectToFaceSearchStream(
        job.jobId,
        path,
        // onStatus callback
        (status) => {
          setQueuePosition(status);
          setJobStatus('processing');
        },
        // onResult callback
        (resultIds) => {
          setResults(resultIds);
          setJobStatus('completed');
          setIsActive(false);
          setQueuePosition(null);
        },
        // onError callback
        (err) => {
          setError(err.message || 'Failed to process face search');
          setJobStatus('error');
          setIsActive(false);
          setQueuePosition(null);
        }
      );

      cleanupRef.current = cleanup;

      return () => {
        if (cleanupRef.current) {
          cleanupRef.current();
        }
      };
    }
  }, [path]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const clearSearch = () => {
    setResults(null);
    setJobStatus(null);
    setQueuePosition(null);
    setError(null);
    setIsActive(false);
  };

  return {
    isActive,
    jobStatus,
    queuePosition,
    results,
    error,
    clearSearch,
  };
}
