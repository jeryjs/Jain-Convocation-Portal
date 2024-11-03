import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import config from '../config';
import ImageGrid from '../components/ImageGrid';
import PageHeader from '../components/PageHeader';
import {
  Box,
  Stack,
  Typography,
  Card,
  CardMedia,
  Button,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';


export default function GalleryPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState(() => {
    const savedImages = JSON.parse(localStorage.getItem(`selected_images`)) || [];
    return savedImages;
  });

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${config.API_BASE_URL}/courses/${courseId}`);
        const data = await response.json();
        const formattedData = data.map((item) => Object.entries(item)[0]);
        setImages(formattedData);
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [courseId]);

  const handleSelectImage = (imgName) => {
    if (selectedImages.includes(imgName)) {
      const newSelected = selectedImages.filter((img) => img !== imgName);
      setSelectedImages(newSelected);
      localStorage.setItem(`selected_images`, JSON.stringify(newSelected));
    } else if (selectedImages.length < 3) {
      const newSelected = [...selectedImages, imgName];
      setSelectedImages(newSelected);
      localStorage.setItem(`selected_images`, JSON.stringify(newSelected));
    }
  };

  const handleRequestPressed = () => {
    navigate(`/courses/${courseId}/request`, {
      state: { 
        selectedImages: selectedImages.map(imgName => ({
          name: imgName,
          url: images.find(([name]) => name === imgName)?.[1]
        }))
      }
    });
  };

  return (
    <>
      <PageHeader
        pageTitle="Image Gallery"
        pageSubtitle="Manage your images"
        breadcrumbs={['Courses', courseId, 'Gallery']}
        onBack={() => navigate(-1)}
        sx={{ mb: 2 }}
      />
      <Box sx={{ height: 'calc(100vh - 112px)', width: {xs:'100vw', md:'90vw'}, overflow: 'hidden' }}>
        <Stack 
          direction={{ xs: "column", md: "row" }} 
          spacing={2}
          sx={{ height: '100%' }}
        >
          <ImageGrid
            loading={loading}
            images={images}
            selectedImages={selectedImages}
            onSelectImage={handleSelectImage}
            sx={{ p:2, flex: 4, display: 'flex', flexDirection: 'column' }}
          />

          <SelectedImagesPanel
            selectedImages={selectedImages}
            images={images}
            onRequestPressed={handleRequestPressed}
            sx={{ flex: 1 }}
          />
        </Stack>
      </Box>
    </>
  );
}


function SelectedImagesPanel({ selectedImages, images, onRequestPressed, sx }) {
  return (
    <Card 
      elevation={2} 
      sx={{ 
        width: { xs: '100%', md: '300px' },
        height: { xs: '170px', md: '100%' },
        minHeight: '150px',
        position: 'relative',
        ...sx
      }}
    >
      <Box
        sx={{
          padding: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Selected Images ({selectedImages.length}/3)
          </Typography>
        </Box>
        
        <Box 
          sx={{
            flex: 1,
            overflowY: 'auto',
            mb: 2,
            display: {xs:"none", md:'flex'},
            flexDirection: 'column',
            gap: 1
          }}
        >
          {selectedImages.map((imgName, index) => (
            <Card key={imgName} sx={{ flexShrink: 0 }}>
              <CardMedia
                component="img"
                height="120"
                image={images.find(([name]) => name === imgName)?.[1]}
                alt={imgName}
                sx={{ objectFit: 'cover' }}
              />
            </Card>
          ))}
        </Box>

        <Stack spacing={1} sx={{ mt: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="warning" sx={{ fontSize: 20 }} />
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              You will not be able to select other images after request.
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={onRequestPressed}
            disabled={selectedImages.length === 0}
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
