import React, { useState, memo, useRef } from 'react';
import {
  Card,
  CardMedia,
  CardActionArea,
  CardActions,
  Grid,
  IconButton,
  Typography,
  CardContent,
  Skeleton,
  Box,
  Chip,
  Button,
  CircularProgress,
  TextField
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DownloadIcon from '@mui/icons-material/Download';

// Helper function to get short name from full path
const getShortName = (fullPath) => {
  if (!fullPath) return '';
  return fullPath.split('/').pop().replace(/\.[^/.]+$/, '');
};

export default function ImageGrid({ 
  images, // format: [{ 'path/to/image.jpg': 'thumbimglink' }]
  selectedImages = [],
  lockedImages = [], 
  onSelectImage, 
  onDownload,
  loading,
  availableSlots,
  columns = 3,
  showColumnControls = true,
  searchEnabled = false,
  sx 
}) {
  const [localColumns, setLocalColumns] = useState(columns);
  const [searchTerm, setSearchTerm] = useState('');
  const gridRefs = useRef({});
  const skeletonArray = Array.from(new Array(30));
  
  const handleSearch = (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term && !loading) {
      const firstMatch = images.findIndex(item => 
        getShortName(Object.keys(item)[0]).toLowerCase().includes(term)
      );
      
      if (firstMatch !== -1) {
        gridRefs.current[firstMatch]?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  };

  return (
    <Card variant='elevation' elevation='4' sx={{ display:"flex", flexDirection: "column", ...sx }}>
      {(searchEnabled || showColumnControls) && (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          {searchEnabled && (
            <TextField
              fullWidth
              size="small"
              placeholder="Search images..."
              value={searchTerm}
              onChange={handleSearch}
              disabled={loading}
            />
          )}
          {showColumnControls && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={() => setLocalColumns(prev => (prev < 10 ? prev + 1 : prev))}>
                <RemoveCircleOutlineIcon />
              </IconButton>
              <IconButton onClick={() => setLocalColumns(prev => (prev > 1 ? prev - 1 : prev))}>
                <AddCircleOutlineIcon />
              </IconButton>
            </Box>
          )}
        </Box>
      )}
      
      <Grid container spacing={{ xs: 0, md: 2}} sx={{ overflowY: 'auto' }}>
        {(loading ? skeletonArray : images).map((item, index) => {
          const imagePath = loading ? null : Object.keys(item)[0];
          const imageUrl = loading ? null : item[imagePath];
          const isSelected = selectedImages.includes(imagePath);
          const isLocked = lockedImages.includes(imagePath);
          const canSelect = !isLocked && (isSelected || availableSlots > 0);
          const isMatched = !loading && searchTerm && 
            getShortName(imagePath).toLowerCase().includes(searchTerm.toLowerCase());

          return (
            <Grid 
              item 
              xs={12 / (showColumnControls ? localColumns : columns)} 
              key={index}
              ref={el => gridRefs.current[index] = el}
            >
              <ImageCard
                loading={loading}
                imgPath={imagePath}
                imgThumbLink={imageUrl}
                isSelected={isSelected}
                isLocked={isLocked}
                canSelect={canSelect}
                onSelect={onSelectImage}
                onDownload={onDownload}
                isMatched={isMatched}
              />
            </Grid>
          );
        })}
      </Grid>
    </Card>
  );
}

const ImageCard = memo(({ 
  loading, 
  imgPath, 
  imgThumbLink, 
  isSelected, 
  isLocked, 
  canSelect, 
  onSelect,
  onDownload,
  isMatched
}) => {
  const displayName = getShortName(imgPath);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      await onDownload(imgPath);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card
      onClick={() => !loading && !onDownload && canSelect && onSelect && onSelect(imgPath, imgThumbLink)}
      style={{
        position: 'relative',
        cursor: onDownload ? 'default' : (isLocked ? 'default' : 'pointer'),
        opacity: onDownload ? 1 : (canSelect ? 1 : 0.5),
        transition: '0.3s',
        border: isSelected ? '2px solid #3f51b5' : isMatched ? '2px solid #4caf50' : '2px solid transparent',
      }}>
      <CardActionArea>
        {loading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : (
          <CardMedia component="img" height="200" image={imgThumbLink} data-file={imgPath} style={{ objectFit: 'cover', width: '100%' }} />
        )}
        <CardContent>
          {loading ? (
            <Skeleton variant="text" />
          ) : (
            <Typography variant="body2" align="center">
              {displayName}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
      
      {!loading && onDownload && (
        <CardActions sx={{ justifyContent: 'center', p: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleDownload}
            disabled={downloading}
            startIcon={downloading ? <CircularProgress size={16} /> : <DownloadIcon />}
          >
            Download
          </Button>
        </CardActions>
      )}
      
      {!loading && onSelect && !onDownload && (
        <CardActions sx={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#ffffffcc', borderRadius: '50%', p: 0, m: 1 }}>
          <IconButton aria-label="select image" sx={{ p: 0 }} >
            <CheckCircleIcon color={isSelected ? 'primary' : 'disabled'} />
          </IconButton>
        </CardActions>
      )}
      
      {isLocked && !onDownload && (
        <Chip label="Already Requested" size="small" color="primary" sx={{ position: 'absolute', top: 8, right: 8 }} />
      )}
    </Card>
  );
});
