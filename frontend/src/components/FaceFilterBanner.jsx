import React from 'react';
import { Alert, Button, Stack, Typography, CircularProgress, Box } from '@mui/material';
import { 
  CheckCircle, 
  Error as ErrorIcon, 
  HourglassEmpty,
  FilterAlt,
  Visibility
} from '@mui/icons-material';

/**
 * Banner component to display face filter job status and results
 * @param {Object} props
 * @param {Object} props.status - Queue position status
 * @param {Array} props.result - Filter results
 * @param {string} props.error - Error message
 * @param {boolean} props.isComplete - Job completion status
 * @param {boolean} props.filterActive - Whether filter is currently active
 * @param {number} props.filteredCount - Number of filtered images
 * @param {Function} props.onDisableFilter - Callback to disable filter
 * @param {Function} props.onEnableFilter - Callback to enable filter
 * @param {Function} props.onRetry - Callback to retry job creation
 */
export default function FaceFilterBanner({
  status,
  result,
  error,
  isComplete,
  filterActive,
  filteredCount,
  onDisableFilter,
  onEnableFilter,
  onRetry,
}) {
  // Show nothing if no job state
  if (!status && !result && !error) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <Alert 
        severity="error" 
        icon={<ErrorIcon />}
        sx={{ mb: 2 }}
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={onRetry}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Try Again
          </Button>
        }
      >
        <Typography variant="body2">
          <strong>Failed to process face filter:</strong> {error}
        </Typography>
      </Alert>
    );
  }

  // Success state with results
  if (isComplete && result && result.length > 0) {
    if (filterActive) {
      return (
        <Alert 
          severity="success" 
          icon={<FilterAlt />}
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={onDisableFilter}
              startIcon={<Visibility />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Show All
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>Face filter active:</strong> Showing {filteredCount || result.length} matching image{filteredCount !== 1 ? 's' : ''}
          </Typography>
        </Alert>
      );
    } else {
      return (
        <Alert 
          severity="info" 
          icon={<CheckCircle />}
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={onEnableFilter}
              startIcon={<FilterAlt />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Apply Filter
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>Filter ready:</strong> Found {result.length} matching image{result.length !== 1 ? 's' : ''}. Click to filter.
          </Typography>
        </Alert>
      );
    }
  }

  // Success but no matches
  if (isComplete && result && result.length === 0) {
    return (
      <Alert 
        severity="warning" 
        icon={<ErrorIcon />}
        sx={{ mb: 2 }}
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={onRetry}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Try Again
          </Button>
        }
      >
        <Typography variant="body2">
          <strong>No matches found:</strong> Your face was not detected in any of the images. Try with a different angle or lighting.
        </Typography>
      </Alert>
    );
  }

  // Processing state (in queue)
  if (status) {
    const { position, total_size } = status;
    return (
      <Alert 
        severity="info" 
        icon={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={20} thickness={4} />
          </Box>
        }
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <HourglassEmpty sx={{ fontSize: 18 }} />
          <Typography variant="body2">
            <strong>Processing your face filter...</strong> 
            {position && total_size ? (
              <> Position {position} of {total_size} in queue</>
            ) : (
              <> Please wait...</>
            )}
          </Typography>
        </Stack>
      </Alert>
    );
  }

  return null;
}
