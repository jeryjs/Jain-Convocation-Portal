// Face Search Service - Simulated Backend
const FACE_SEARCH_STORAGE_KEY = 'face_search_jobs';

/**
 * Simulates a POST request to submit a face search job
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} path - Gallery path (day/time/batch)
 * @returns {Promise<{jobId: string}>}
 */
export async function submitFaceSearch(imageBase64, path) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Generate a unique job ID
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store job in localStorage
  const jobs = getFaceSearchJobs();
  jobs[path] = {
    jobId,
    path,
    timestamp: Date.now(),
    status: 'pending',
    image: imageBase64
  };
  localStorage.setItem(FACE_SEARCH_STORAGE_KEY, JSON.stringify(jobs));

  return { jobId };
}

/**
 * Simulates an EventSource connection for monitoring job status
 * @param {string} jobId - Job ID to monitor
 * @param {string} path - Gallery path
 * @param {function} onStatus - Callback for status updates
 * @param {function} onResult - Callback for final result
 * @param {function} onError - Callback for errors
 * @returns {function} - Cleanup function to stop monitoring
 */
export function connectToFaceSearchStream(jobId, path, onStatus, onResult, onError) {
  let isCancelled = false;
  let timeoutId = null;

  const simulateStream = async () => {
    try {
      // Simulate queue position updates
      const queueSteps = [
        { position: 5, total: 5, message: 'Job queued...' },
        { position: 4, total: 5, message: 'Processing...' },
        { position: 3, total: 5, message: 'Analyzing faces...' },
        { position: 2, total: 5, message: 'Comparing images...' },
        { position: 1, total: 5, message: 'Finalizing results...' },
      ];

      for (let i = 0; i < queueSteps.length; i++) {
        if (isCancelled) return;

        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, 2000); // 2 seconds between updates
        });

        if (isCancelled) return;
        
        onStatus(queueSteps[i]);
      }

      // Simulate final result
      if (!isCancelled) {
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, 1500);
        });

        if (!isCancelled) {
          // Generate random image IDs as results (simulated matches)
          const mockResults = generateMockResults();
          
          // Update job status in localStorage
          const jobs = getFaceSearchJobs();
          if (jobs[path]) {
            jobs[path].status = 'completed';
            jobs[path].results = mockResults;
            jobs[path].completedAt = Date.now();
            localStorage.setItem(FACE_SEARCH_STORAGE_KEY, JSON.stringify(jobs));
          }

          onResult(mockResults);
        }
      }
    } catch (error) {
      if (!isCancelled) {
        onError(error);
      }
    }
  };

  simulateStream();

  // Return cleanup function
  return () => {
    isCancelled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Get all face search jobs from localStorage
 * @returns {Object}
 */
export function getFaceSearchJobs() {
  try {
    const stored = localStorage.getItem(FACE_SEARCH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading face search jobs:', error);
    return {};
  }
}

/**
 * Get face search job for a specific path
 * @param {string} path - Gallery path
 * @returns {Object|null}
 */
export function getFaceSearchJob(path) {
  const jobs = getFaceSearchJobs();
  return jobs[path] || null;
}

/**
 * Clear face search job for a specific path
 * @param {string} path - Gallery path
 */
export function clearFaceSearchJob(path) {
  const jobs = getFaceSearchJobs();
  delete jobs[path];
  localStorage.setItem(FACE_SEARCH_STORAGE_KEY, JSON.stringify(jobs));
}

/**
 * Clear all face search jobs
 */
export function clearAllFaceSearchJobs() {
  localStorage.removeItem(FACE_SEARCH_STORAGE_KEY);
}

/**
 * Generate mock image IDs as search results
 * @returns {string[]} Array of image IDs
 */
function generateMockResults() {
  // Generate random number of results (5-15 images)
  const count = Math.floor(Math.random() * 11) + 5;
  const results = [];
  
  for (let i = 0; i < count; i++) {
    // Generate mock image paths/IDs
    results.push(`image_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`);
  }
  
  return results;
}
