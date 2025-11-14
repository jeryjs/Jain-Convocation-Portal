import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Stack,
  Typography,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import { CameraAlt, Replay, Videocam, Search } from '@mui/icons-material';
import config from '../config';
import { saveJobForStage, enableFilterForStage } from '../hooks/useFaceFilterJob';

const CAMERA_STORAGE_KEY = 'face-filter-camera-id';

function FaceFilterDialog({ open, onClose, stage, uid }) {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [permissionState, setPermissionState] = useState('prompt'); // 'prompt', 'granted', 'denied'
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Load devices and check permissions
  useEffect(() => {
    if (!open) return;

    const checkPermissionAndDevices = async () => {
      try {
        // Check if permission was previously granted
        const savedCamera = localStorage.getItem(CAMERA_STORAGE_KEY);

        // Request permission and get devices
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately

        setPermissionState('granted');

        // Get available devices
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);

        // Set selected device (use saved or first device)
        if (savedCamera && videoDevices.find(d => d.deviceId === savedCamera)) {
          setSelectedDevice(savedCamera);
        } else if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId);
        }

        // Auto-start camera if permission already granted
        if (videoDevices.length > 0) {
          setIsCameraOn(true);
        }
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionState('denied');
          setError('Camera permission denied');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found');
        } else {
          setPermissionState('prompt');
        }
      }
    };

    checkPermissionAndDevices();
  }, [open]);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

      setPermissionState('granted');
      setError(null);

      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
        setIsCameraOn(true);
      }
    } catch (err) {
      setPermissionState('denied');
      setError('Camera permission denied. Please enable camera access in your browser settings.');
    }
  };

  const handleDeviceChange = (e) => {
    const deviceId = e.target.value;
    setSelectedDevice(deviceId);
    localStorage.setItem(CAMERA_STORAGE_KEY, deviceId);
  };

  const handleRetake = () => {
    setImgSrc(null);
  };

  const handleSearch = async () => {
    if (!imgSrc || !stage || !uid) {
      setSubmitError('Missing required data');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${config.QUEUE_API_BASE_URL}/api/create-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imgSrc,
          uid: uid,
          stage: stage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          setSubmitError(`Rate limit: ${data.message}. Try again in ${Math.ceil(data.retryAfter / 60)} minute(s).`);
        } else if (response.status === 409) {
          setSubmitError(`Already in queue: ${data.message}`);
        } else {
          setSubmitError(data.message || 'Failed to create job');
        }
        return;
      }

      // Success - save job to localStorage
      saveJobForStage(stage, {
        jobId: data.jobId,
        timestamp: data.timestamp,
        filterActive: true,
      });

      // Enable filter automatically
      enableFilterForStage(stage);

      // Close dialog and trigger refresh
      handleClose();

      // Notify parent to refresh (will trigger SSE connection)
      if (onClose) {
        onClose(true); // Pass true to indicate job was created
      }
    } catch (err) {
      console.error('Error creating job:', err);
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setImgSrc(null);
    setSubmitError(null);
    onClose();
  };

  const videoConstraints = {
    width: 640,
    height: 480,
    deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Find by Selfie</DialogTitle>
      <DialogContent>
        <Stack spacing={2} alignItems="center">
          {/* Experimental Feature Notice */}
          <Alert severity="warning" sx={{ width: '100%' }}>
            <Typography variant="caption">
              <strong>Experimental Feature:</strong> This is a beta feature. Search accuracy may vary depending on lighting, angle, and image quality.
            </Typography>
          </Alert>
          {/* Camera Selection */}
          {devices.length > 1 && permissionState === 'granted' && !imgSrc && (
            <FormControl fullWidth size="small">
              <InputLabel>Camera</InputLabel>
              <Select
                value={selectedDevice}
                label="Camera"
                onChange={handleDeviceChange}
                startAdornment={<Videocam sx={{ mr: 1, color: 'action.active' }} />}
              >
                {devices.map((device) => (
                  <MenuItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${devices.indexOf(device) + 1}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Error Alert */}
          {error && permissionState !== 'denied' && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}

          {/* Submit Error Alert */}
          {submitError && (
            <Alert severity="error" sx={{ width: '100%' }} onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}

          {/* Camera Preview */}
          <Paper
            variant="outlined"
            sx={{
              width: '100%',
              aspectRatio: '4/3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'black',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            {permissionState === 'prompt' && !imgSrc && (
              <Stack spacing={2} alignItems="center" sx={{ p: 3, textAlign: 'center' }}>
                <Videocam sx={{ fontSize: 48, color: 'grey.500' }} />
                <Typography variant="body2" color="grey.300">
                  Camera permission is needed to capture your selfie
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleRequestPermission}
                  startIcon={<CameraAlt />}
                >
                  Allow Camera Access
                </Button>
              </Stack>
            )}

            {permissionState === 'denied' && (
              <Stack spacing={2} alignItems="center" sx={{ p: 3, textAlign: 'center' }}>
                <Videocam sx={{ fontSize: 48, color: 'error.main' }} />
                <Typography variant="body2" color="error.light">
                  {error}
                </Typography>
              </Stack>
            )}

            {isCameraOn && permissionState === 'granted' && !imgSrc && (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onUserMediaError={() => setError('Failed to access camera')}
              />
            )}

            {imgSrc && (
              <img src={imgSrc} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </Paper>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ width: '100%' }}>
            {isCameraOn && !imgSrc && (
              <Button variant="contained" onClick={capture} startIcon={<CameraAlt />} fullWidth>
                Capture
              </Button>
            )}
            {imgSrc && (
              <>
                <Button variant="outlined" onClick={handleRetake} startIcon={<Replay />} fullWidth>
                  Retake
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={handleSearch}
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} /> : <Search />}
                >
                  {submitting ? 'Creating job...' : 'Search'}
                </Button>
              </>
            )}
          </Stack>

          {/* Info Alert */}
          {!isCameraOn && !imgSrc && permissionState === 'granted' && (
            <Alert severity="info" sx={{ width: '100%' }}>
              Use your selfie to quickly find your photos from the gallery.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default FaceFilterDialog;