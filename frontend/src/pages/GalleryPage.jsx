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
import { downloadFile } from '../utils/utils';


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
        if (cached) {
          setImages(cached);
          setLoading(false);
          return;
        }
        
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

  useEffect(() => {
    if (isGroupPhotos) {
      // Pre-fetch and cache all image links for group photos
      const cacheImageLinks = async () => {
        setLoadingLinks(true);
        try {
          const response = await fetch(`${config.API_BASE_URL}/images/${images.map(img => Object.keys(img)[0]).join(',')}`, {
            headers: getAuthHeaders()
          });
          const data = await response.json();
          
          // Cache the links with a long expiry (30 days)
          data.links.forEach(link => {
            localStorage.setItem(`img_${link.name}`, JSON.stringify({
              url: link.url,
              timestamp: Date.now(),
              expires: Date.now() + (30 * 24 * 60 * 60 * 1000)
            }));
          });
        } catch (error) {
          console.error('Error caching image links:', error);
        } finally {
          setLoadingLinks(false);
        }
      };
      cacheImageLinks();
    }
  }, [images, isGroupPhotos]);

  const handleImageDownload = async (imagePath) => {
    try {
      // Check cache first
      const cached = localStorage.getItem(`img_${imagePath}`);
      if (cached) {
        const { url, expires } = JSON.parse(cached);
        if (expires > Date.now()) {
          await downloadFile(url, imagePath.split('/').pop());
          return;
        }
        localStorage.removeItem(`img_${imagePath}`);
      }

      // If not in cache or expired, fetch new link
      const links = await getImageLinks([imagePath]);
      const link = links.find(l => l.name === imagePath);
      if (link) {
        await downloadFile(link.url, imagePath.split('/').pop());
      }
    } catch (error) {
      console.error('Error downloading image:', error);
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
        {isGroupPhotos ? (
          <ImageGrid
            loading={loading || loadingLinks}
            images={images}
            columns={3}
            showColumnControls={true}
            onDownload={handleImageDownload}
            sx={{ p: 2, height: 'calc(100vh - 200px)', flex: 1 }}
          />
        ) : (
          <Stack 
            direction={{ xs: "column", md: "row" }} 
            spacing={2}
            sx={{ height: {md: '80vh'} }}
          >
            <ImageGrid
              loading={loading}
              images={images}
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
        )}
      </Box>
    </>
  );
}

export default GalleryPage;


function SelectedImagesPanel({ selectedImages, existingImages, onRequestPressed, availableSlots, sx }) {
  const { updateSelectedImages } = useAuth();

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
