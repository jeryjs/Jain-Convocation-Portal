import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import Webcam from 'react-webcam';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const BASE_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

const CAMERA_STORAGE_KEY = 'face-search-last-camera';

const getStoredCameraId = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CAMERA_STORAGE_KEY);
  } catch {
    return null;
  }
};

const setStoredCameraId = (deviceId) => {
  if (typeof window === 'undefined') return;
  try {
    if (deviceId) {
      localStorage.setItem(CAMERA_STORAGE_KEY, deviceId);
    } else {
      localStorage.removeItem(CAMERA_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
};

function FaceSearchDialog({
  open,
  onClose,
  prepareImage,
  createJob,
  creating,
  createError,
  clearCreateError,
}) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [permissionError, setPermissionError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(() => getStoredCameraId());
  const videoConstraints = useMemo(
    () => (
      deviceId
        ? { ...BASE_CONSTRAINTS, deviceId: { exact: deviceId } }
        : { ...BASE_CONSTRAINTS, facingMode: 'user' }
    ),
    [deviceId]
  );
  const isFrontCamera = useMemo(() => {
    if (!deviceId) return true;
    const match = devices.find((cam) => cam.deviceId === deviceId);
    if (!match || !match.label) return false;
    return /front|user|selfie/i.test(match.label);
  }, [deviceId, devices]);

  const selectDevice = useCallback((id) => {
    setDeviceId(id || null);
    setStoredCameraId(id || null);
  }, []);

  useEffect(() => {
    if (!open) {
      setValidationError(null);
      setPermissionError(null);
      return undefined;
    }

    let cancelled = false;

    const loadDevices = async () => {
      if (!navigator?.mediaDevices?.enumerateDevices) return;
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const cams = all.filter((d) => d.kind === 'videoinput');
        setDevices(cams);
        if (!cams.length) {
          setPermissionError('No camera detected.');
          return;
        }
        if (deviceId && cams.some((cam) => cam.deviceId === deviceId)) {
          return;
        }
        const fallback =
          cams.find((cam) => /front|user|selfie/i.test(cam.label)) || cams[0];
        selectDevice(fallback.deviceId);
      } catch (err) {
        if (!cancelled) {
          setPermissionError(
            err?.message || 'Unable to enumerate cameras. Please grant permission.'
          );
        }
      }
    };

    loadDevices();

    return () => {
      cancelled = true;
    };
  }, [deviceId, open, selectDevice]);

  const handleClose = () => {
    if (creating || isCapturing) return;
    setValidationError(null);
    clearCreateError?.();
    onClose();
  };

  const handleCycleCamera = useCallback(() => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((cam) => cam.deviceId === deviceId);
    const nextCamera = devices[(currentIndex + 1) % devices.length];
    selectDevice(nextCamera.deviceId);
  }, [deviceId, devices, selectDevice]);

  const handleCapture = async () => {
    const video = webcamRef.current?.video;
    if (!video) {
      setValidationError('Camera not ready yet.');
      return;
    }
    setValidationError(null);
    setIsCapturing(true);
    clearCreateError?.();

    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const preparedImage = await prepareImage(canvas);
      await createJob(preparedImage);
      handleClose();
    } catch (err) {
      setValidationError(err.message || 'Unable to process photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Face Search</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Position your face clearly inside the frame. Make sure only you are visible with ample lighting.
          </Typography>

          {permissionError && <Alert severity="error">{permissionError}</Alert>}
          {validationError && <Alert severity="warning">{validationError}</Alert>}
          {createError && <Alert severity="error">{createError}</Alert>}

          <Box
            sx={{
              position: 'relative',
              borderRadius: 2,
              overflow: 'hidden',
              aspectRatio: '4 / 3',
              backgroundColor: 'black',
            }}
          >
            <Webcam
              ref={webcamRef}
              forceScreenshotSourceSize
              mirrored={isFrontCamera}
              audio={false}
              videoConstraints={videoConstraints}
              onUserMedia={() => setPermissionError(null)}
              onUserMediaError={(err) =>
                setPermissionError(err?.message || 'Camera access denied. Allow permission and retry.')}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {devices.length > 1 && (
              <Button
                variant="contained"
                size="small"
                onClick={handleCycleCamera}
                disabled={Boolean(permissionError) || creating || isCapturing}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                  },
                }}
              >
                Switch Camera
              </Button>
            )}
            <Box
              sx={{
                position: 'absolute',
                top: '10%',
                left: '10%',
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.8)',
                pointerEvents: 'none',
              }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={creating || isCapturing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCapture}
          disabled={Boolean(permissionError) || creating || isCapturing}
          startIcon={(creating || isCapturing) && <CircularProgress size={16} />}
        >
          {creating ? 'Submitting…' : 'Capture & Search'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FaceSearchDialog;
