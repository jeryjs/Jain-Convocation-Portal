import React, { useState, memo } from 'react';
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
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

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
  loading,
  availableSlots,
  columns = 3,
  showColumnControls = true,
  sx 
}) {
  const [localColumns, setLocalColumns] = useState(columns);
  const skeletonArray = Array.from(new Array(30));
  
  return (
    <Card variant='elevation' elevation='4' sx={{ display:"flex", flexDirection: "column", ...sx }}>
      {showColumnControls && (
        <Box sx={{ mt:'-20px', mr: '-0px', mb:'10px', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <IconButton onClick={() => setLocalColumns(prev => (prev > 1 ? prev - 1 : prev))}>
            <RemoveCircleOutlineIcon />
          </IconButton>
          <IconButton onClick={() => setLocalColumns(prev => (prev < 10 ? prev + 1 : prev))}>
            <AddCircleOutlineIcon />
          </IconButton>
        </Box>
      )}
      <Grid container spacing={{ xs: 0, md: 2}} sx={{ overflowY: 'auto' }}>
        {(loading ? skeletonArray : images).map((item, index) => {
          const imagePath = loading ? null : Object.keys(item)[0];
          const imageUrl = loading ? null : item[imagePath];
          const isSelected = selectedImages.includes(imagePath);
          const isLocked = lockedImages.includes(imagePath);
          const canSelect = !isLocked && (isSelected || availableSlots > 0);

          return (
            <Grid item xs={12 / (showColumnControls ? localColumns : columns)} key={index}>
              <ImageCard
                loading={loading}
                imgPath={imagePath}
                imgThumbLink={imageUrl}
                isSelected={isSelected}
                isLocked={isLocked}
                canSelect={canSelect}
                onSelect={onSelectImage}
              />
            </Grid>
          );
        })}
      </Grid>
    </Card>
  );
}

const ImageCard = memo(({ loading, imgPath, imgThumbLink, isSelected, isLocked, canSelect, onSelect }) => {
  const displayName = getShortName(imgPath);

  return (
    <Card
      onClick={() => !loading && canSelect && onSelect && onSelect(imgPath, imgThumbLink)}
      style={{
        position: 'relative',
        cursor: isLocked ? 'default' : 'pointer',
        opacity: canSelect ? 1 : 0.5,
        transition: '0.3s',
        border: isSelected ? '2px solid #3f51b5' : '2px solid transparent',
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
      {!loading && onSelect && (
        <CardActions sx={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#ffffffcc', borderRadius: '50%', p: 0, m: 1 }}>
          <IconButton aria-label="select image" sx={{ p: 0 }} >
            <CheckCircleIcon color={isSelected ? 'primary' : 'disabled'} />
          </IconButton>
        </CardActions>
      )}
      {isLocked && (
        <Chip label="Already Requested" size="small" color="primary" sx={{ position: 'absolute', top: 8, right: 8 }} />
      )}
    </Card>
  );
});
