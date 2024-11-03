import React from 'react';
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
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function ImageGrid({ loading, images, columns, selectedImages, onSelectImage }) {
  const skeletonArray = Array.from(new Array(30));
  
  return (
    <Grid container spacing={2} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
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
          <CardMedia component="img" height="200" image={imgThumbLink} alt={imgName} style={{ objectFit: 'cover', width: '100%' }} />
        )}
        <CardContent>
          {loading ? (
            <Skeleton variant="text" />
          ) : (
            <Typography variant="body2" align="center">
              {imgName}
            </Typography>
          )}
        </CardContent>
        {!loading && (
          <CardActions>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onSelect(imgName);
              }}
              aria-label="select image"
            >
              <CheckCircleIcon color={isSelected ? 'primary' : 'disabled'} />
            </IconButton>
          </CardActions>
        )}
      </CardActionArea>
    </Card>
  );
}