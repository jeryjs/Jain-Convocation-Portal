import { AutoAwesome, NoPhotography } from '@mui/icons-material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Skeleton,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import React, { memo, useRef, useState } from 'react';

// Helper function to get short name from full path
const getShortName = (fullPath) => {
  if (!fullPath) return '';
  return fullPath.split('/').pop().replace(/\.[^/.]+$/, '');
};

function ImageWithLoader({ imgThumbLink, imgPath }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '3/2', overflow: 'hidden', borderRadius: 2, boxShadow: loading ? 3 : 1 }}>
      {loading && !error && (
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',
          animation: 'shimmer 1.2s infinite linear',
          backgroundSize: '800px 100%',
          '@keyframes shimmer': {
            '0%': { backgroundPosition: '-400px 0' },
            '100%': { backgroundPosition: '400px 0' }
          }
        }} />
      )}
      {!error ? (
        <CardMedia component="img" height="200" loading="lazy" image={imgThumbLink} data-file={imgPath}
          sx={{
            objectFit: 'cover', width: '100%', aspectRatio: '3/2', opacity: loading ? 0 : 1,
            transition: 'opacity 0.5s cubic-bezier(.4,0,.2,1)',
            filter: loading ? 'blur(8px) grayscale(0.5)' : 'none'
          }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      ) : (
        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8d7da', color: '#721c24' }}>
          Failed to load image
        </Box>
      )}
    </Box>
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
  isMatched,
  matchScore,
  columns,
  selectViaIconOnly = false
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

  const canTriggerSelect = !loading && !onDownload && canSelect && typeof onSelect === 'function';

  const handleCardClick = () => {
    if (selectViaIconOnly) return;
    if (canTriggerSelect) onSelect(imgPath, imgThumbLink);
  };

  const handleIconClick = (event) => {
    event.stopPropagation();
    if (canTriggerSelect) onSelect(imgPath, imgThumbLink);
  };

  return (
    <Card
      onClick={handleCardClick}
      style={{
        position: 'relative',
        cursor: onDownload ? 'default' : ((isLocked || selectViaIconOnly) ? 'default' : 'pointer'),
        opacity: onDownload ? 1 : (canSelect ? 1 : 0.5),
        transition: '0.3s',
        border: isSelected ? '2px solid #3f51b5' : isMatched ? '2px solid #4caf50' : '2px solid transparent',
      }}>
      <CardActionArea>
        {loading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : (
          <ImageWithLoader imgThumbLink={imgThumbLink} imgPath={imgPath} />
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
          <IconButton
            aria-label="select image"
            sx={{ p: 0 }}
            onClick={handleIconClick}
            disabled={!canTriggerSelect}
          >
            <CheckCircleIcon color={isSelected ? 'primary' : 'disabled'} />
          </IconButton>
        </CardActions>
      )}

      {isLocked && !onDownload && (
        <Chip label="Already Requested" size="small" color="primary" sx={{ position: 'absolute', top: 8, right: 8 }} />
      )}
      {Number.isFinite(matchScore) && (
        <Chip
          label={`${Math.round(matchScore * 100)}%`}
          size="small"
          color="success"
          sx={{
            position: 'absolute', top: 4, left: 4, fontSize: '0.65rem',
            height: 18, textOverflow: 'revert', background: 'rgba(150,255,150,0.25)',
            backdropFilter: 'blur(6px)', border: '1px solid rgba(100,255,100,0.3)',
            boxShadow: '0 2px 8px 0 rgba(31,38,135,0.15)', scale: 1 + (Math.log2(4 - columns) * 0.5),  // via logarithmic formula: scale = 1 + (Math.log2(4 - columns) * 0.5)
            '& .MuiChip-label': { px: 0.5, py: 0, color: '#FFF' },
          }}
        />
      )}
    </Card>
  );
});

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
  onFaceSearch,
  faceSearchActive = false,
  faceSearchComplete = false,
  faceMatchMap = {},
  sx,
  selectViaIconOnly = false
}) {
  const [localColumns, setLocalColumns] = useState(columns);
  const [searchTerm, setSearchTerm] = useState('');
  const gridRefs = useRef({});
  const skeletonArray = Array.from(new Array(30));
  const faceSearchEnabled = Boolean(onFaceSearch);

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

  const [hideFaceSearch, setHideFaceSearch] = useState(false);

  // Hide Face Search button after 3 seconds
  React.useEffect(() => {
    if (faceSearchEnabled) {
      const timer = setTimeout(() => setHideFaceSearch(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [faceSearchEnabled]);

  return (
    <Card variant='elevation' elevation='4' sx={{ display: "flex", flexDirection: "column", ...sx }}>
      {(searchEnabled || showColumnControls || faceSearchEnabled) && (
        <Box sx={{ p: 0.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
              <Box sx={{ display: 'flex', gap: 0.5, border: '1px solid', borderColor: '#b8b8b8', borderRadius: 2, p: 0.5 }}>
                <IconButton size="small" onClick={() => setLocalColumns(prev => (prev < 10 ? prev + 1 : prev))}>
                  <RemoveCircleOutlineIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setLocalColumns(prev => (prev > 1 ? prev - 1 : prev))}>
                  <AddCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            {faceSearchEnabled && (
              <Tooltip title={faceSearchActive ? "Face Search is Active" : "Start Face Search"}>
                <Button
                  variant={(faceSearchActive || faceSearchComplete) ? 'contained' : 'outlined'}
                  color={faceSearchActive ? 'success' : 'primary'}
                  size="small"
                  onClick={onFaceSearch}
                  disabled={loading}
                  startIcon={faceSearchActive ? <NoPhotography /> : <AutoAwesome />}
                  sx={{ textTransform: 'none', overflow: 'hidden', pl: 2.5, height: 36, minWidth: !hideFaceSearch ? '150px' : 0 }}
                >
                  <Box
                    sx={{
                      display: 'inline-block',
                      maxWidth: hideFaceSearch ? 0 : 100,
                      opacity: hideFaceSearch ? 0 : 1,
                      transition: 'max-width 0.4s cubic-bezier(.4,0,.2,1), opacity 0.3s cubic-bezier(.4,0,.2,1)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    }}
                  >
                    Face Search
                  </Box>
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      <Grid container py={1} spacing={{ xs: 0, md: 2 }} sx={{ overflowY: 'auto' }}>
        {(loading ? skeletonArray : images).map((item, index) => {
          const imagePath = loading ? null : Object.keys(item)[0];
          const imageUrl = loading ? null : item[imagePath];
          const isSelected = selectedImages.includes(imagePath);
          const isLocked = lockedImages.includes(imagePath);
          const canSelect = !isLocked && (isSelected || availableSlots > 0);
          const isMatched = !loading && searchTerm &&
            getShortName(imagePath).toLowerCase().includes(searchTerm.toLowerCase());
          const rawScore = !loading ? faceMatchMap?.[imagePath] : null;
          const matchScore = typeof rawScore === 'number' ? rawScore : rawScore != null ? Number(rawScore) : null;

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
                matchScore={faceSearchActive ? matchScore : null}
                columns={localColumns}
                selectViaIconOnly={selectViaIconOnly}
              />
            </Grid>
          );
        })}
      </Grid>
    </Card>
  );
}