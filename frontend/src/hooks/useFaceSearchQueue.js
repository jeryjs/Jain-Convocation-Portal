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

    const url = `${config.QUEUE_API_BASE_URL}/get-job?id=${jobState.jobId}`;
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
          result: (data.result || []).map(d => ({ ...d, id: d.id.replaceAll('\\', '/') })), // Normalize IDs
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

const detectSingleFace = async (canvas) => {
  if (typeof window === 'undefined') {
    throw new Error('Face detection only supported in browser');
  }
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  
  let skinPixels = 0;
  const totalPixels = width * height;
  const sampleStep = 3;
  
  for (let i = 0; i < data.length; i += sampleStep * 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Relaxed skin tone detection
    if (r > 60 && g > 40 && b > 20 && r > g && r > b) {
      skinPixels++;
    }
  }
  
  const coverage = (skinPixels * sampleStep) / totalPixels;
  if (coverage < 0.03) {
    throw new Error('No face detected. Make sure your face is clearly visible.');
  }
  if (coverage > 0.85) {
    throw new Error('Too close or multiple faces. Capture only yourself.');
  }
  return { coverage };
};

const compressCanvas = async (sourceCanvas, quality = 0.85, maxSize = 720) => {
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, maxSize / Math.max(sourceCanvas.width, sourceCanvas.height));
  canvas.width = Math.round(sourceCanvas.width * ratio);
  canvas.height = Math.round(sourceCanvas.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
};

const toCanvas = (source) => {
  if (source instanceof HTMLCanvasElement) return source;
  const canvas = document.createElement('canvas');
  const width = source.width || source.videoWidth || source.naturalWidth || source.displayWidth || 0;
  const height = source.height || source.videoHeight || source.naturalHeight || source.displayHeight || 0;
  if (!width || !height) {
    throw new Error('Unable to read captured image. Please try again.');
  }
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
};

const useCreateJob = ({
  stageKey,
  imageCount,
  userId,
  syncState,
}) => {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const prepareImage = useCallback(async (imageSource) => {
    const canvas = toCanvas(imageSource);
    await detectSingleFace(canvas);
    return compressCanvas(canvas);
  }, []);

  const createJob = useCallback(async (preparedImage) => {
    if (!userId) {
      throw new Error('You must be logged in to start a face search.');
    }
    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch(`${config.QUEUE_API_BASE_URL}/create-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: preparedImage,
          uid: userId,
          stage: stageKey,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.message || payload?.error || 'Failed to create job';
        throw new Error(message);
      }

      const jobState = {
        jobId: payload.jobId,
        stage: stageKey,
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
  }, [imageCount, stageKey, syncState, userId]);

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
  imageCount,
  userId,
  enabled = true,
}) {
  const isReady = Boolean(stageKey && imageCount > 0 && userId);
  const [jobState, syncState] = useJobStorage(stageKey);
  const streamState = useJobStream({ stageKey, jobState, syncState, enabled: enabled && isReady });
  const createState = useCreateJob({ stageKey, imageCount, userId, syncState });

  const clearJob = useCallback(() => {
    syncState(null);
  }, [syncState]);

  const toggleFilter = useCallback(() => {
    syncState((prev) => {
      if (!prev) return prev;
      return { ...prev, filterActive: !prev.filterActive };
    });
  }, [syncState]);

  const dismissError = useCallback(() => {
    syncState(null);
  }, [syncState]);

  const jobStatus = jobState?.status ?? null;
  const jobResult = jobState?.result ?? null;
  const jobError = jobState?.error ?? null;

  const isFiltering = jobState?.lastEvent === 'result' && jobState?.filterActive !== false;
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
    toggleFilter,
    dismissError,
    ...streamState,
    ...createState,
  };
}
