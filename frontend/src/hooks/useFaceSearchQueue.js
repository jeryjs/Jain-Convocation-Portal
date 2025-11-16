import { useCallback, useEffect, useRef, useState } from 'react';
import config from '../config';
import {
  getStageJob,
  removeStageJob,
  setStageJob,
} from './faceSearchStorage';

const TERMINAL_STATES = new Set(['result', 'error']);
const STORAGE_KEY = 'face-search-jobs';

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const useJobStorage = (stageKey) => {
  const [jobState, setJobState] = useState(() => getStageJob(stageKey));

  useEffect(() => {
    setJobState(getStageJob(stageKey));
  }, [stageKey]);

  const syncState = useCallback(
    (updater) => {
      setJobState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (next) {
          setStageJob(stageKey, next);
          return next;
        }
        removeStageJob(stageKey);
        return null;
      });
    },
    [stageKey]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event) => {
      if (event.key !== STORAGE_KEY) return;
      setJobState(getStageJob(stageKey));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [stageKey]);

  return [jobState, syncState];
};

const useJobStream = ({ stageKey, jobState, syncState, enabled = true }) => {
  const eventSourceRef = useRef(null);
  const activeJobIdRef = useRef(null);
  const [connectionState, setConnectionState] = useState('idle');

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionState('idle');
  }, []);

  useEffect(() => {
    const shouldStream =
      enabled &&
      jobState?.jobId &&
      !TERMINAL_STATES.has(jobState.lastEvent ?? '');

    if (!shouldStream) {
      activeJobIdRef.current = jobState?.jobId ?? null;
      stopStream();
      return undefined;
    }

    if (
      eventSourceRef.current &&
      activeJobIdRef.current === jobState.jobId
    ) {
      return undefined;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const url = `${config.QUEUE_API_BASE_URL}/api/get-job?id=${jobState.jobId}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    activeJobIdRef.current = jobState.jobId;
    setConnectionState('streaming');

    const handleStatus = (event) => {
      const data = safeParse(event.data);
      if (!data) return;
      syncState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lastEvent: 'status',
          status: data,
          error: null,
        };
      });
    };

    const handleResult = (event) => {
      const data = safeParse(event.data) || {};
      syncState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lastEvent: 'result',
          result: data.result || [],
          status: null,
          completedAt: Date.now(),
        };
      });
      stopStream();
    };

    const handleError = (event) => {
      const data = safeParse(event.data) || {};
      syncState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lastEvent: 'error',
          error: data.error || 'Job processing failed',
          status: null,
          completedAt: Date.now(),
        };
      });
      stopStream();
    };

    es.addEventListener('status', handleStatus);
    es.addEventListener('result', handleResult);
    es.addEventListener('error', handleError);
    es.addEventListener('ping', () => { });
    es.onerror = () => {
      setConnectionState('error');
    };

    return () => {
      es.removeEventListener('status', handleStatus);
      es.removeEventListener('result', handleResult);
      es.removeEventListener('error', handleError);
      stopStream();
    };
  }, [enabled, jobState?.jobId, jobState?.lastEvent, stageKey, stopStream, syncState]);

  return {
    connectionState,
    isStreaming: connectionState === 'streaming',
  };
};

const detectSingleFace = async (imageBitmap) => {
  if (typeof window === 'undefined') {
    throw new Error('Face detection only supported in browser');
  }
  if ('FaceDetector' in window) {
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
    const faces = await detector.detect(imageBitmap);
    if (!faces.length) {
      throw new Error('No face detected. Please retake the photo.');
    }
    if (faces.length > 1) {
      throw new Error('Multiple faces detected. Capture only yourself.');
    }
    const face = faces[0];
    const coverage =
      (face.boundingBox.width * face.boundingBox.height) /
      (imageBitmap.width * imageBitmap.height);
    if (coverage < 0.05) {
      throw new Error('Move closer to the camera for a clearer face.');
    }
    return faces[0];
  }
  throw new Error('Face detection not supported in this browser. Try Chrome latest.');
};

const compressBitmap = async (bitmap, quality = 0.85, maxSize = 720) => {
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
};

const useCreateJob = ({
  stageKey,
  stageLabel,
  imageCount,
  userId,
  syncState,
}) => {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const prepareImage = useCallback(async (imageSource) => {
    let bitmap;
    if (typeof ImageBitmap !== 'undefined' && imageSource instanceof ImageBitmap) {
      bitmap = imageSource;
    } else if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(imageSource);
    } else {
      bitmap = imageSource;
    }
    await detectSingleFace(bitmap);
    return compressBitmap(bitmap);
  }, []);

  const createJob = useCallback(async (preparedImage) => {
    if (!userId) {
      throw new Error('You must be logged in to start a face search.');
    }
    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch(`${config.QUEUE_API_BASE_URL}/api/create-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: preparedImage,
          uid: userId,
          stage: stageLabel,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.message || payload?.error || 'Failed to create job';
        throw new Error(message);
      }

      const jobState = {
        jobId: payload.jobId,
        stage: stageLabel,
        createdAt: payload.timestamp,
        imageCount,
        lastEvent: 'pending',
        status: null,
        result: null,
        error: null,
      };

      syncState(jobState);
      return jobState;
    } catch (err) {
      setCreateError(err.message || 'Failed to create job');
      throw err;
    } finally {
      setCreating(false);
    }
  }, [imageCount, stageKey, stageLabel, syncState, userId]);

  return {
    prepareImage,
    createJob,
    creating,
    createError,
    clearCreateError: () => setCreateError(null),
  };
};

export function useFaceSearchQueue({
  stageKey,
  stageLabel,
  imageCount,
  userId,
  enabled = true,
}) {
  const [jobState, syncState] = useJobStorage(stageKey);
  const streamState = useJobStream({ stageKey, jobState, syncState, enabled });
  const createState = useCreateJob({ stageKey, stageLabel, imageCount, userId, syncState });

  const clearJob = useCallback(() => {
    syncState(null);
  }, [syncState]);

  const dismissError = useCallback(() => {
    syncState(null);
  }, [syncState]);

  const jobStatus = jobState?.status ?? null;
  const jobResult = jobState?.result ?? null;
  const jobError = jobState?.error ?? null;

  const isFiltering = jobState?.lastEvent === 'result';
  const isStaleResult = Boolean(
    jobState?.lastEvent === 'result' &&
    typeof jobState.imageCount === 'number' &&
    typeof imageCount === 'number' &&
    imageCount > 0 &&
    jobState.imageCount !== imageCount
  );

  return {
    jobState,
    status: jobStatus,
    result: jobResult,
    error: jobError,
    isFiltering,
    isStaleResult,
    clearJob,
    dismissError,
    ...streamState,
    ...createState,
  };
}
