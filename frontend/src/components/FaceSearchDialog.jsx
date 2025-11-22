import { AddPhotoAlternate, BrowseGallery, Cameraswitch } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Webcam from 'react-webcam';

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
  creating = false,
  createError = null,
  clearCreateError,
}) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [permissionError, setPermissionError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(() => getStoredCameraId());
  const [hasConsented, setHasConsented] = useState(false);

  const videoConstraints = useMemo(
    () =>
      deviceId
        ? { ...BASE_CONSTRAINTS, deviceId: { exact: deviceId } }
        : { ...BASE_CONSTRAINTS, facingMode: 'user' },
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

  const refreshDevices = useCallback(async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
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
      setPermissionError(err?.message || 'Unable to list cameras.');
    }
  }, [deviceId, selectDevice]);

  useEffect(() => {
    if (!open) {
      setValidationError(null);
      setPermissionError(null);
      setDevices([]);
      setHasConsented(false);
    } else if (open) {
      handleEnableCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !hasConsented || !navigator?.mediaDevices?.addEventListener) return undefined;
    const handler = () => refreshDevices();
    navigator.mediaDevices.addEventListener('devicechange', handler);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handler);
    };
  }, [hasConsented, open, refreshDevices]);

  const handleClose = () => {
    if (creating || isCapturing) return;
    setValidationError(null);
    clearCreateError?.();
    setHasConsented(false);
    onClose();
  };

  const handleCycleCamera = useCallback(() => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((cam) => cam.deviceId === deviceId);
    const nextCamera = devices[(currentIndex + 1) % devices.length];
    selectDevice(nextCamera.deviceId);
  }, [deviceId, devices, selectDevice]);

  const handleUserMedia = useCallback(() => {
    setPermissionError(null);
    refreshDevices();
  }, [refreshDevices]);

  const handleUserMediaError = useCallback((err) => {
    setPermissionError(err?.message || 'Camera access denied. Allow permission and retry.');
    if (deviceId) {
      selectDevice(null);
    }
    setHasConsented(false);
  }, [deviceId, selectDevice]);

  const handleEnableCamera = () => {
    setPermissionError(null);
    setHasConsented(true);
  };

  const handleCapture = async () => {
    if (!hasConsented) {
      setValidationError('Please enable the camera before capturing.');
      return;
    }
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
          {!createError && validationError && <Alert severity="warning">{validationError}</Alert>}
          {createError && <Alert severity="error">{createError}</Alert>}

          <Box
            sx={{
              position: 'relative',
              borderRadius: 2,
              overflow: 'hidden',
              aspectRatio: '4 / 3',
              backgroundColor: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {hasConsented ? (
              <>
                <Webcam
                  ref={webcamRef}
                  forceScreenshotSourceSize
                  mirrored={isFrontCamera}
                  audio={false}
                  videoConstraints={videoConstraints}
                  onUserMedia={handleUserMedia}
                  onUserMediaError={handleUserMediaError}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {devices.length > 1 && (
                  <IconButton
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
                    <Cameraswitch fontSize="large" sx={{ color: 'white' }} />
                  </IconButton>
                )}
                
                    <IconButton
                      onClick={() => document.getElementById('face-media-picker-inline')?.click()}
                      disabled={creating || isCapturing}
                      sx={{
                      position: 'absolute',
                      top: 68,
                      right: 8,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                      },
                    }}
                    >
                      <AddPhotoAlternate fontSize="large" sx={{ color: 'white' }} />
                    </IconButton>
                <Box
                  sx={{
                    position: 'absolute',
                    width: '50%',
                    height: '80%',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.8)',
                    pointerEvents: 'none',
                  }}
                />
              </>
            ) : (
              <Stack spacing={2} alignItems="center" px={3}>
                <Typography variant="body1" color="common.white" align="center">
                  Tap below to enable your camera. You’ll be prompted for permission.
                </Typography>
                <Button variant="contained" onClick={handleEnableCamera}>
                  Enable Camera
                </Button>
              </Stack>
            )}
          </Box>

          {/* --- MEDIA PICKER (NO NEW NAMED FUNCTIONS — handlers inline) --- */}
          <Box>
            <input
              id="face-media-picker-inline"
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                clearCreateError?.();
                setValidationError(null);
                const file = e?.target?.files?.[0];
                if (!file) return;

                setIsCapturing(true);
                const url = URL.createObjectURL(file);
                try {
                  const canvas = canvasRef.current || document.createElement('canvas');
                  canvasRef.current = canvas;

                  if (file.type.startsWith('video/')) {
                    // draw first frame of video
                    await new Promise((resolve, reject) => {
                      const videoEl = document.createElement('video');
                      videoEl.preload = 'auto';
                      videoEl.muted = true;
                      videoEl.playsInline = true;
                      videoEl.src = url;

                      const cleanup = () => {
                        try {
                          videoEl.pause();
                          videoEl.src = '';
                        } catch (e) {
                          /* ignore */
                        }
                      };

                      videoEl.addEventListener('loadedmetadata', () => {
                        canvas.width = videoEl.videoWidth || BASE_CONSTRAINTS.width.ideal;
                        canvas.height = videoEl.videoHeight || BASE_CONSTRAINTS.height.ideal;

                        const onCanPlay = () => {
                          try {
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                            cleanup();
                            resolve();
                          } catch (err) {
                            cleanup();
                            reject(err);
                          }
                        };

                        if (videoEl.readyState >= 2) {
                          onCanPlay();
                        } else {
                          videoEl.addEventListener('canplay', onCanPlay, { once: true });
                          setTimeout(() => {
                            if (videoEl.readyState < 2) {
                              cleanup();
                              reject(new Error('Unable to load video frame.'));
                            }
                          }, 2000);
                        }
                      }, { once: true });

                      videoEl.addEventListener('error', () => {
                        cleanup();
                        reject(new Error('Failed to load'));
                      });

                      videoEl.load();
                    });
                  } else {
                    // image
                    await new Promise((resolve, reject) => {
                      const img = new Image();
                      img.crossOrigin = 'anonymous';
                      img.onload = () => {
                        try {
                          canvas.width = img.naturalWidth;
                          canvas.height = img.naturalHeight;
                          const ctx = canvas.getContext('2d');
                          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                          resolve();
                        } catch (err) {
                          reject(err);
                        }
                      };
                      img.onerror = () => reject(new Error('Failed to load image.'));
                      img.src = url;
                    });
                  }

                  const prepared = await prepareImage(canvas);
                  await createJob(prepared);
                  // cleanup and close
                  URL.revokeObjectURL(url);
                  handleClose();
                } catch (err) {
                  URL.revokeObjectURL(url);
                  setValidationError(err?.message || 'Unable to process selected media. Please try another file.');
                } finally {
                  setIsCapturing(false);
                  // reset input value so same file can be selected again
                  try {
                    e.target.value = null;
                  } catch (ex) {
                    /* ignore */
                  }
                }
              }}
            />
          </Box>
          {/* --- end MEDIA PICKER --- */}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={creating || isCapturing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCapture}
          disabled={!hasConsented || Boolean(permissionError) || creating || isCapturing}
          startIcon={(creating || isCapturing) && <CircularProgress size={16} />}
        >
          {creating ? 'Submitting…' : 'Capture & Search'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FaceSearchDialog;
