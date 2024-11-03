import React, { useState } from 'react';
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
  Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

export default function ImageGrid({ loading, images, selectedImages, onSelectImage, sx }) {
  const [columns, setColumns] = useState(3);
  const skeletonArray = Array.from(new Array(30));
  
  return (
    <Card variant='elevation' elevation='4' sx={sx}>
      <Box sx={{ mt:'-20px', mr: '-0px', mb:'10px', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <IconButton onClick={() => setColumns(prev => (prev > 1 ? prev - 1 : prev))}>
          <RemoveCircleOutlineIcon />
        </IconButton>
        <IconButton onClick={() => setColumns(prev => (prev < 10 ? prev + 1 : prev))}>
          <AddCircleOutlineIcon />
        </IconButton>
      </Box>
      <Grid container spacing={{ xs: 0, md: 2}} sx={{ overflowY: 'auto' }}>
        {(loading ? skeletonArray : images).map((item, index) => {
          const [imgName, imgThumbLink] = loading ? [] : item;
          const isSelected = selectedImages.includes(imgName);
          const isSelectable = selectedImages.length < 3 || isSelected;

          return (
            <Grid item xs={12 / columns} key={index}>
              <ImageCard
                loading={loading}
                imgName={imgName}
                imgThumbLink={imgThumbLink}
                isSelected={isSelected}
                isSelectable={isSelectable}
                onSelect={onSelectImage}
              />
            </Grid>
          );
        })}
      </Grid>
    </Card>
  );
}

function ImageCard({ loading, imgName, imgThumbLink, isSelected, isSelectable, onSelect }) {
  return (
    <Card
      onClick={() => !loading && onSelect(imgName)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        opacity: isSelectable ? 1 : 0.5,
        transition: '0.3s',
        border: isSelected ? '2px solid #3f51b5' : '2px solid transparent',
      }}
    >
      <CardActionArea>
        {loading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : (
          <CardMedia component="img" height="200" image={imgThumbLink} data-file={imgName} style={{ objectFit: 'cover', width: '100%' }} />
        )}
        <CardContent>
          {loading ? (
            <Skeleton variant="text" />
          ) : (
            <Typography variant="body2" align="center">
              {imgName.replace(/\.[^/.]+$/, '')}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
      {!loading && (
        <CardActions
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '50%',
            p: 0,
            m: 1
          }}
        >
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onSelect(imgName);
            }}
            aria-label="select image"
            sx={{ p: 0 }}
          >
            <CheckCircleIcon color={isSelected ? 'primary' : 'disabled'} />
          </IconButton>
        </CardActions>
      )}
    </Card>
  );
}