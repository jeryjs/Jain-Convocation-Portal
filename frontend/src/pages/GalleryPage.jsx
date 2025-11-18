import WarningIcon from '@mui/icons-material/Warning';
import {
  Alert,
  Box,
  Button,
  Card,
  Stack,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DemoPageBanner from '../components/DemoPageBanner';
import FaceSearchBanner from '../components/FaceSearchBanner';
import FaceSearchDialog from '../components/FaceSearchDialog';
import ImageGrid from '../components/ImageGrid';
import PageHeader from '../components/PageHeader';
import config from '../config';
import { useAuth } from '../config/AuthContext';
import { useFaceSearchQueue } from '../hooks/useFaceSearchQueue';
import { cacheManager } from '../utils/cache';
import { downloadFile } from '../utils/utils';


function GalleryPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pathData, setPathData] = useState({ day: '', time: '', batch: '' });
  const [faceDialogOpen, setFaceDialogOpen] = useState(false);
  const { userData, selectedImages, updateSelectedImages, getAvailableSlots, getAuthHeaders } = useAuth();
  const [loadingLinks, setLoadingLinks] = useState(false);
  const isGroupPhotos = pathData.batch === 'Group Photos';

  const decodedStage = useMemo(() => {
    try {
      return atob(sessionId);
    } catch {
      return sessionId;
    }
  }, [sessionId]);

  const faceSearch = useFaceSearchQueue({
    stageKey: decodedStage,
    imageCount: images.length,
    userId: userData?.email,
    enabled: !isGroupPhotos && Boolean(userData) && !loading,
  });

  const faceMatchMap = useMemo(() => {
    if (!faceSearch.result?.length) return {};
    return faceSearch.result.reduce((acc, { id, similarity }) => {
      acc[id] = similarity;
      return acc;
    }, {});
  }, [faceSearch.result]);

  const displayImages = useMemo(() => {
    if (!faceSearch.isFiltering) return images;
    return images
      .filter((item) => faceMatchMap[Object.keys(item)[0]] !== undefined)
      .sort((a, b) => {
        const aId = Object.keys(a)[0];
        const bId = Object.keys(b)[0];
        return faceMatchMap[bId] - faceMatchMap[aId];
      });
  }, [faceMatchMap, faceSearch.isFiltering, images]);

  useEffect(() => {
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

  const handleImageDownload = async (imagePath) => {
    try {
      // Check if links are already cached (use timestamp instead of expires)
      const cached = localStorage.getItem('group_photos_links');
      let links;
      const TTL = 1 * 24 * 60 * 60 * 1000; // 1 day

      if (cached) {
        const parsed = JSON.parse(cached);
        const { data, timestamp, expires } = parsed;

        if (timestamp) {
          if (Date.now() - timestamp < TTL) {
            links = data;
          } else {
            localStorage.removeItem('group_photos_links');
          }
        } else if (expires) {
          // Backwards compatibility: fall back to old 'expires' field
          if (expires > Date.now()) {
            links = data;
          } else {
            localStorage.removeItem('group_photos_links');
          }
        }
      }

      if (!links) {
        setLoadingLinks(true);
        // Fetch all image links at once
        const response = await fetch(`${config.API_BASE_URL}/images/${images.map(img => Object.keys(img)[0]).join(',')}`, {
          headers: getAuthHeaders()
        });
        links = await response.json();

        // Cache the links with a timestamp (expiry logic handled via timestamp & TTL)
        localStorage.setItem('group_photos_links', JSON.stringify({
          data: links,
          timestamp: Date.now()
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

  const handleFaceSearchClick = () => {
    if (!userData) return;
    if (faceSearch.result) {
      faceSearch.toggleFilter();
    } else {
      setFaceDialogOpen(true);
    }
  };

  const showFaceSearchBanner = (!isGroupPhotos && (faceSearch.status || faceSearch.error || faceSearch.isStaleResult || faceSearch.isFiltering || faceSearch.result));

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
            onDownload={handleImageDownload}
            sx={{ py: 2, px: 1, height: 'calc(100vh - 200px)', flex: 1 }}
          />
        ) : (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ height: { md: '80vh' } }}
          >
            <Stack spacing={2} sx={{ flex: { md: '4' }, minWidth: 0 }}>
              {showFaceSearchBanner && (
                <FaceSearchBanner
                  status={faceSearch.status}
                  error={faceSearch.error}
                  isFiltering={faceSearch.isFiltering}
                  isStale={faceSearch.isStaleResult}
                  resultCount={faceSearch.result?.length || 0}
                  hasResult={Boolean(faceSearch.result)}
                  onCancel={faceSearch.clearJob}
                  onToggleFilter={faceSearch.toggleFilter}
                  onRetry={() => {
                    faceSearch.clearJob();
                    setFaceDialogOpen(true);
                  }}
                  onDismissError={faceSearch.dismissError} />
              )}
              <ImageGrid
                loading={loading}
                images={displayImages}
                selectedImages={Object.keys(selectedImages)}
                lockedImages={Object.keys(userData?.requestedImages || {})}
                onSelectImage={handleSelectImage}
                availableSlots={getAvailableSlots()}
                searchEnabled={true}
                onFaceSearch={Boolean(userData) && handleFaceSearchClick}
                faceSearchActive={faceSearch.isFiltering}
                faceSearchComplete={Boolean(faceSearch.result)}
                faceMatchMap={faceMatchMap}
                sx={{ p: 2, height: { xs: '80vh' }, flex: 1 }}
              />
            </Stack>

            <SelectedImagesPanel
              variant="sidebar"
              selectedImages={selectedImages}
              existingImages={userData?.requestedImages || {}}
              onRequestPressed={handleRequestPressed}
              availableSlots={getAvailableSlots()}
              sx={{ flex: { md: '1' }, display: { xs: 'none', md: 'block' } }}
            />
          </Stack>
        )}
      </Box>

      {/* Mobile Selected Images Strip & Request Button */}
      {!isGroupPhotos && (
        <SelectedImagesPanel
          variant="mobile"
          selectedImages={selectedImages}
          existingImages={userData?.requestedImages || {}}
          onRequestPressed={handleRequestPressed}
          availableSlots={getAvailableSlots()}
        />
      )}

      <FaceSearchDialog
        open={faceDialogOpen}
        onClose={() => setFaceDialogOpen(false)}
        prepareImage={faceSearch.prepareImage}
        createJob={faceSearch.createJob}
        creating={faceSearch.creating}
        createError={faceSearch.createError}
        clearCreateError={faceSearch.clearCreateError}
      />
    </>
  );
}

export default GalleryPage;


function SelectedImagesPanel({ selectedImages, existingImages, onRequestPressed, availableSlots, sx, variant = 'sidebar' }) {
  const { updateSelectedImages } = useAuth();

  // Transform selectedImages back to array of objects format
  const selectedImagesArray = Object.entries(selectedImages).map(([path, url]) => ({ [path]: url }));

  const selectedCount = Object.keys(selectedImages).length;
  const handleRemoveImage = (imgPath) => {
    const { [imgPath]: removed, ...rest } = selectedImages;
    updateSelectedImages(rest);
  };

  if (variant === 'mobile') {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          display: { xs: 'block', md: 'none' },
          zIndex: 1000,
          ...sx,
        }}
      >
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
          {selectedCount > 0 ? (
            Object.entries(selectedImages).map(([path, url]) => {
              const isLocked = Boolean(existingImages[path]);
              return (
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
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked ? 0.6 : 1,
                    border: isLocked ? '2px solid' : 'none',
                    borderColor: isLocked ? 'warning.main' : 'transparent',
                  }}
                  onClick={() => {
                    if (isLocked) return;
                    handleRemoveImage(path);
                  }}
                />
              );
            })
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
              onClick={onRequestPressed}
              disabled={selectedCount === 0}
            >
              Request ({selectedCount}/4)
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

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
              handleRemoveImage(imgPath);
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
            disabled={selectedCount === 0}
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
