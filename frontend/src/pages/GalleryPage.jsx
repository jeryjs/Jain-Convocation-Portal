import React, { useEffect, useState, useRef } from 'react';
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
  Alert
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { useAuth } from '../config/AuthContext';
import { cacheManager } from '../utils/cache';


function GalleryPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pathData, setPathData] = useState({ day: '', time: '', batch: '' });
  const mounted = useRef(false);
  const { userData, selectedImages, updateSelectedImages, getAvailableSlots, updateUserData } = useAuth();

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    
    const fetchImages = async (isRetry = false) => {
      setLoading(true);
      try {
        // Try to get from cache first
        const cacheKey = `gallery-${sessionId}`;
        const cached = !isRetry && cacheManager.get(cacheKey);
        if (cached) {
          setImages(cached);
          setPathData(atob(sessionId).split('/'));
          setLoading(false);
          return;
        }

        // Decode session ID back to path
        const [day, time, batch] = atob(sessionId).split('/');
        setPathData({ day, time, batch });
        
        const response = await fetch(`${config.API_BASE_URL}/courses/${day}/${time}/${batch}`);
        const data = await response.json();
        const formattedData = data.map((item) => Object.entries(item)[0]);
        
        setImages(formattedData);
        // Cache the new data
        cacheManager.set(cacheKey, formattedData, isRetry);
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

  const handleSelectImage = (imageName, thumbUrl) => {
    const fullPath = `${pathData.day}/${pathData.time}/${pathData.batch}/${imageName}`;
    if (selectedImages[fullPath]) {
      const { [fullPath]: removed, ...rest } = selectedImages;
      updateSelectedImages(rest);
    } else if (getAvailableSlots() > 0) {
      updateSelectedImages({
        ...selectedImages,
        [fullPath]: thumbUrl
      });
    }
  };

  const handleRequestPressed = () => {
    navigate(`/gallery/${sessionId}/request`);
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
      <Box sx={{ width: {xs:'100vw', md:'90vw'} }}>
        <Stack 
          direction={{ xs: "column", md: "row" }} 
          spacing={2}
          sx={{ height: {md: '80vh'} }}
        >
          <ImageGrid
            loading={loading}
            images={images.map(([path, url]) => [path, url])}
            selectedImages={Object.keys(selectedImages)}
            lockedImages={Object.keys(userData?.requestedImages || {})}
            onSelectImage={handleSelectImage}
            availableSlots={getAvailableSlots()}
            sx={{ p:2, height: {xs:'80vh'}, flex: {md: '4'} }}
          />

          <SelectedImagesPanel
            selectedImages={selectedImages}
            existingImages={userData?.requestedImages || {}}
            onRequestPressed={handleRequestPressed}
            availableSlots={getAvailableSlots()}
            sx={{ flex: {md: '1'}  }}
          />
        </Stack>
      </Box>
    </>
  );
}

export default GalleryPage;


function SelectedImagesPanel({ selectedImages, existingImages, onRequestPressed, availableSlots, sx }) {
  const { updateSelectedImages } = useAuth();

  return (
    <Card elevation={2} sx={{ ...sx }}>
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Selected Images ({Object.entries(selectedImages).length}/3)
          </Typography>
        </Box>
        
        {availableSlots > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You can select {availableSlots} more image{availableSlots !== 1 ? 's' : ''}
          </Alert>
        )}

        <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
          <ImageGrid
            images={Object.entries(selectedImages).map(([name, url]) => [name, url])}
            selectedImages={Object.keys(selectedImages)}
            lockedImages={Object.keys(existingImages)}
            onSelectImage={(imgPath) => {
              // Deselect images from selected panel
              const { [imgPath]: removed, ...rest } = selectedImages;
              updateSelectedImages(rest);
            }}
            availableSlots={availableSlots}
            columns={window.innerHeight/window.innerWidth > 0.95 ? "3" : "1"}
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
