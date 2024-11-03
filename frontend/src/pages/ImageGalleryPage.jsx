import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import config from '../config';
import Header from '../components/Header';
import ImageGrid from '../components/ImageGrid';
import PageHeader from '../components/PageHeader';
import {
  Box,
  Stack,
  Typography,
  Card,
  CardMedia,
  Button,
  IconButton,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';


export default function ImageGalleryPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState(3);
  const [selectedImages, setSelectedImages] = useState([]);

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
      setSelectedImages((prev) => prev.filter((img) => img !== imgName));
    } else if (selectedImages.length < 3) {
      setSelectedImages((prev) => [...prev, imgName]);
    }
  };

  return (
    <>
      <PageHeader
        pageTitle="Image Gallery"
        pageSubtitle="Manage your images"
        breadcrumbs={['Courses', courseId, 'Gallery']}
        onBack={() => navigate(-1)}
        actionButtons={
          <>
            <IconButton onClick={() => setColumns(prev => (prev > 1 ? prev - 1 : prev))}>
              <RemoveCircleOutlineIcon />
            </IconButton>
            <IconButton onClick={() => setColumns(prev => (prev < 10 ? prev + 1 : prev))}>
              <AddCircleOutlineIcon />
            </IconButton>
          </>
        }
      />
      <Box padding={3} width='100%'>

        <Stack direction="row" spacing={2} mb={2}>
          <ImageGrid
            loading={loading}
            images={images}
            columns={columns}
            selectedImages={selectedImages}
            onSelectImage={handleSelectImage}
          />

          <SelectedImagesPanel
            selectedImages={selectedImages}
            images={images}
            onSoftcopyRequest={() => navigate(`/confirm/soft/${selectedImages.join(',')}`)}
            onHardcopyRequest={() => navigate(`/confirm/hard/${selectedImages.join(',')}`)}
          />
        </Stack>
      </Box>
    </>
  );
}


function SelectedImagesPanel({ selectedImages, images, onSoftcopyRequest, onHardcopyRequest }) {
  return (
    <Box
      sx={{
        right: 0,
        top: '88px',
        width: '300px',
        height: 'auto',
        backgroundColor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'divider',
        padding: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="h6" mb={2}>Selected Images</Typography>
      <Box flex={1} overflow="auto">
        {selectedImages.map((imgName, index) => (
          <Card key={index} sx={{ mb: 1 }}>
            <CardMedia
              component="img"
              height="100"
              image={images.find(([name]) => name === imgName)?.[1]}
              alt={imgName}
            />
          </Card>
        ))}
      </Box>
      <Box mt={2}>
        <Button
          fullWidth
          variant="contained"
          sx={{ mb: 1 }}
          onClick={onSoftcopyRequest}
          disabled={selectedImages.length === 0}
        >
          Request Softcopy
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={onHardcopyRequest}
          disabled={selectedImages.length === 0}
        >
          Request Hardcopy
        </Button>
      </Box>
    </Box>
  );
}
