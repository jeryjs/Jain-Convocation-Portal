import { Alert, AlertTitle, Box, Button, Stack, Typography } from '@mui/material';

function FaceSearchBanner({
  status,
  error,
  isFiltering,
  isStale,
  resultCount,
  stageLabel,
  onCancel,
  onClearFilter,
  onRetry,
  onDismissError,
}) {
  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Stack direction="row" spacing={1}>
            <Button color="inherit" size="small" onClick={onRetry}>
              Try Again
            </Button>
            <Button color="inherit" size="small" onClick={onDismissError}>
              Dismiss
            </Button>
          </Stack>
        }
      >
        <AlertTitle>Face search failed</AlertTitle>
        {error}
      </Alert>
    );
  }

  if (isStale) {
    return (
      <Alert
        severity="warning"
        action={
          <Stack direction="row" spacing={1}>
            <Button color="inherit" size="small" onClick={onRetry}>
              Re-run Search
            </Button>
            <Button color="inherit" size="small" onClick={onClearFilter}>
              Clear Filter
            </Button>
          </Stack>
        }
      >
        <AlertTitle>Gallery Updated</AlertTitle>
        The gallery has changed since this search ran. Re-run the face search to see newer matches.
      </Alert>
    );
  }

  if (isFiltering) {
    return (
      <Alert
        severity="success"
        action={
          <Button color="inherit" size="small" onClick={onClearFilter}>
            Clear Filter
          </Button>
        }
      >
        <AlertTitle>Showing face matches</AlertTitle>
        Viewing {resultCount} matched photos for {stageLabel}. To browse the full gallery, clear the filter.
      </Alert>
    );
  }

  if (status) {
    return (
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={onCancel}>
            Cancel
          </Button>
        }
      >
        <AlertTitle>Face search queued</AlertTitle>
        <Box>
          <Typography variant="body2">
            Position: {status.position ?? '…'} / {status.total_size ?? '…'} in queue.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stage: {status.stage || stageLabel}
          </Typography>
        </Box>
      </Alert>
    );
  }

  return null;
}

export default FaceSearchBanner;
