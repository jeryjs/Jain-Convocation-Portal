import React, { useEffect, useState, useRef, useCallback, Fragment } from 'react';
import Webcam from 'react-webcam';
import { useParams, useNavigate } from 'react-router-dom';
import config from '../config';
import ImageGrid from '../components/ImageGrid';
import PageHeader from '../components/PageHeader';
import {
  Box,
  Stack,
  Typography,
  Card,
  Button,
  Alert,
  IconButton,
  Paper,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { CameraAlt, Replay, GetApp, StopCircle } from '@mui/icons-material';
import { useAuth } from '../config/AuthContext';
import { cacheManager } from '../utils/cache';
import { downloadFile } from '../utils/utils';
import DemoPageBanner from '../components/DemoPageBanner';

function GalleryPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pathData, setPathData] = useState({ day: '', time: '', batch: '' });
  const mounted = useRef(false);
  const { userData, selectedImages, updateSelectedImages, getAvailableSlots, getAuthHeaders } = useAuth();
  const [loadingLinks, setLoadingLinks] = useState(false);
  const isGroupPhotos = pathData.batch === 'Group Photos';

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const fetchImages = async (isRetry = false) => {
      setLoading(true);

      // Decode session ID back to path
      const [day, time, batch] = atob(sessionId).split('/');
      setPathData({ day, time, batch });

      try {
        // Try to get from cache first
        const cacheKey = `gallery-${sessionId}`;
        const cached = !isRetry && cacheManager.get(cacheKey);
        // if (cached) {
        //   setImages(cached);
        //   setLoading(false);
        //   return;
        // }

        const response = await fetch(`${config.API_BASE_URL}/courses/${day}/${time}/${batch}`);
        const data = await response.json();

        setImages(data);
        // Cache the new data
        cacheManager.set(cacheKey, data, isRetry);
      } catch (error) {
        console.error('Error fetching images:', error);
        if (!isRetry) {
          fetchImages(true);
        } else {
          navigate('/sessions'); // Redirect on error after retry
        }
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [sessionId, navigate]);

  const handleImageDownload = async (imagePath) => {
    try {
      // Check if links are already cached
      const cached = localStorage.getItem('group_photos_links');
      let links;

      if (cached) {
        const { data, expires } = JSON.parse(cached);
        if (expires > Date.now()) {
          links = data;
        } else {
          localStorage.removeItem('group_photos_links');
        }
      }

      if (!links) {
        setLoadingLinks(true);
        // Fetch all image links at once
        const response = await fetch(`${config.API_BASE_URL}/images/${images.map(img => Object.keys(img)[0]).join(',')}`, {
          headers: getAuthHeaders()
        });
        links = await response.json();

        // Cache the links with a 30-day expiry
        localStorage.setItem('group_photos_links', JSON.stringify({
          data: links,
          expires: Date.now() + (30 * 24 * 60 * 60 * 1000)
        }));
        setLoadingLinks(false);
      }

      // Find and download the requested image
      const link = links.links.find(l => l.name === imagePath);
      if (link) {
        await downloadFile(link.url, imagePath.split('/').pop());
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      setLoadingLinks(false);
    }
  };

  const handleSelectImage = (imagePath, thumbUrl) => {
    if (selectedImages[imagePath]) {
      const { [imagePath]: removed, ...rest } = selectedImages;
      updateSelectedImages(rest);
    } else if (getAvailableSlots() > 0) {
      updateSelectedImages({
        ...selectedImages,
        [imagePath]: thumbUrl
      });
    }
  };

  const handleRequestPressed = () => {
    navigate(`/gallery/${sessionId}/request`);
  };
  
  // web cam
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user",
  };

  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
    }
  }, [webcamRef, setImgSrc]);

  const handleStartCamera = () => {
    setImgSrc(null); // Clear previous image
    setIsCameraOn(true);
  };

  const handleStopCamera = () => {
    setIsCameraOn(false);
  };

  const handleRetake = () => {
    setImgSrc(null);
  };

  return (
    <>
      <PageHeader
        pageTitle="Image Gallery"
        pageSubtitle="Images are sorted by time taken."
        breadcrumbs={['Sessions', 'Gallery']}
        onBack={() => navigate('/sessions')}
        sx={{ mb: 2 }}
      />

      <DemoPageBanner />

      <Box sx={{ width: { xs: '100vw', md: '90vw' }, pb: { xs: '60px', md: 0 } }}>
        {isGroupPhotos ? (
          <ImageGrid
            loading={loading || loadingLinks}
            images={images}
            columns={3}
            showColumnControls={true}
            sx={{ p: 2, height: 'calc(100vh - 200px)', flex: 1 }}
          />
        ) : (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ height: { md: '80vh' } }}
          >
            <ImageGrid
              loading={loading}
              images={images}
              selectedImages={Object.keys(selectedImages)}
              lockedImages={Object.keys(userData?.requestedImages || {})}
              onSelectImage={handleSelectImage}
              availableSlots={getAvailableSlots()}
              searchEnabled={true}
              sx={{ p: 2, height: { xs: '80vh' }, flex: { md: '4' } }}
            />

            <SelectedImagesPanel
              selectedImages={selectedImages}
              updateSelectedImages={updateSelectedImages}
              existingImages={userData?.requestedImages || {}}
              onRequestPressed={handleRequestPressed}
              availableSlots={getAvailableSlots()}
              sx={{ flex: { md: '1' }, display: { xs: 'none', md: 'block' } }}
            />
          </Stack>
        )}
      </Box>

      {/* Webcam Panel for both mobile and desktop */}
      <Box sx={{ p: 2 }}>
        <WebcamPanel
          isCameraOn={isCameraOn}
          imgSrc={imgSrc}
          webcamRef={webcamRef}
          videoConstraints={videoConstraints}
          onStartCamera={handleStartCamera}
          onStopCamera={handleStopCamera}
          onCapture={capture}
          onRetake={handleRetake}
          sx={{ display: { xs: 'flex', md: 'none' } }} // Show on mobile, hide on desktop
        />
      </Box>

      {/* Mobile Selected Images Strip & Request Button */}
      {!isGroupPhotos && !isCameraOn && !imgSrc && (
        <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', display: { xs: 'block', md: 'none' }, zIndex: 1000 }}>
          {/* Horizontal Scrollable Selected Images */}
          <Box
            sx={{
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              px: 2,
              pt: 1,
              pb: 0.5,
              '&::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            {Object.entries(selectedImages).length > 0 ? (
              Object.entries(selectedImages).map(([path, url]) => (
                <Box
                  key={path}
                  component="img"
                  src={url}
                  sx={{
                    height: 60,
                    width: 60,
                    objectFit: 'cover',
                    borderRadius: 1,
                    mr: 1,
                    display: 'inline-block',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const { [path]: removed, ...rest } = selectedImages;
                    updateSelectedImages(rest);
                  }}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                No images selected
              </Typography>
            )}
          </Box>

          {/* Request Button Section */}
          <Box sx={{ p: 2, pt: 1 }}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon color="warning" sx={{ fontSize: 16, mr: 1 }} />
                <Typography variant="caption" sx={{ color: 'warning.main' }}>
                  You will not be able to change selections after making request.
                </Typography>
              </Box>
              <Button
                fullWidth
                variant="contained"
                onClick={handleRequestPressed}
                disabled={Object.keys(selectedImages).length < 0}
              >
                Request ({Object.keys(selectedImages).length}/4)
              </Button>
            </Stack>
          </Box>
        </Box>
      )}
    </>
  );
}

export default GalleryPage;

function SelectedImagesPanel({ selectedImages, existingImages, onRequestPressed, availableSlots, sx }) {

  // Transform selectedImages back to array of objects format
  const selectedImagesArray = Object.entries(selectedImages).map(([path, url]) => ({ [path]: url }));

  return (
    <Card elevation={2} sx={{ ...sx }}>
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Selected Images ({Object.entries(selectedImages).length}/4)
          </Typography>
        </Box>

        {availableSlots > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You can select {availableSlots} more image{availableSlots !== 1 ? 's' : ''}
          </Alert>
        )}

        <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
          <ImageGrid
            images={selectedImagesArray}
            selectedImages={Object.keys(selectedImages)}
            lockedImages={Object.keys(existingImages)}
            onSelectImage={(imgPath) => {
              // Deselect images from selected panel
              const { [imgPath]: removed, ...rest } = selectedImages;
              updateSelectedImages(rest);
            }}
            availableSlots={availableSlots}
            columns={window.innerWidth < 900 ? "3" : "1"}
            showColumnControls={false}
          />
        </Box>

        <Stack spacing={1} sx={{ mt: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="warning" sx={{ fontSize: 20 }} />
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              You will not be able to change selections after making request.
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={onRequestPressed}
            disabled={Object.keys(selectedImages).length < 0}
            sx={{
              flex: 1,
              height: { xs: '32px', md: '36px' },
              fontSize: { xs: '0.75rem', md: '0.875rem' }
            }}>
            Request
          </Button>
        </Stack>
      </Box>
    </Card>
  );
}

const WebcamPanel = ({
  isCameraOn,
  imgSrc,
  webcamRef,
  videoConstraints,
  onStartCamera,
  onStopCamera,
  onCapture,
  onRetake,
  sx
}) => {
  return (
    <Card
      elevation={2}
      // Combine passed sx with default styles. Show on desktop by default.
      sx={{ ...sx, p: 2, display: sx?.display || { xs: 'none', md: 'flex' }, flexDirection: 'column' }}
    >
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6">Find by Selfie</Typography>
        <Paper variant="outlined" sx={{ width: '100%', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'black', borderRadius: 1, overflow: 'hidden' }}>
          {!isCameraOn && !imgSrc && (
            <Button variant="outlined" onClick={onStartCamera} startIcon={<CameraAlt />}>
              Start Camera
            </Button>
          )}
          {isCameraOn && !imgSrc && (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
            />
          )}
          {imgSrc && (
            <img src={imgSrc} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </Paper>

        <Stack spacing={2} sx={{ width: '100%' }}>
          <Stack direction="row" spacing={1} justifyContent="center">
            {isCameraOn && !imgSrc && (
              <Button variant="contained" onClick={onCapture} startIcon={<CameraAlt />}>
                Capture
              </Button>
            )}
            {isCameraOn && (
              <Button variant="outlined" color="secondary" onClick={onStopCamera} startIcon={<StopCircle />}>
                Stop
              </Button>
            )}
            {imgSrc && (
              <>
                <Button variant="outlined" onClick={onRetake} startIcon={<Replay />}>
                  Retake
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => alert('Search functionality to be implemented!')}
                >
                  Search with this image
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {!isCameraOn && !imgSrc && !isCameraOn && (
          <Alert severity="info" sx={{ width: '100%' }}>
            Use your selfie to quickly find your photos from the gallery.
          </Alert>
        )}
      </Stack>
    </Card>
  );
};
