import { Alert, AlertTitle, Box, Button, Stack, Typography, useTheme, useMediaQuery } from '@mui/material';

function FaceSearchBanner({
  status,
  error,
  isFiltering,
  isStale,
  resultCount,
  onCancel,
  onClearFilter,
  onRetry,
  onDismissError,
}) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const buttonSx = {
    minWidth: 36,
    px: 0.5,
    py: 0.4,
    fontSize: isXs ? '0.7rem' : '0.8rem',
    textTransform: 'none',
    lineHeight: 1,
  };

  const alertSx = {
    px: isXs ? 1 : 2,
    py: isXs ? 0.5 : 1,
    borderRadius: 1,
    '& .MuiAlert-action': {
      margin: 0,
      alignSelf: 'center',
    },
    '& .MuiAlert-message': {
      padding: 0,
    },
  };

  const titleSx = { fontSize: isXs ? '0.86rem' : '0.95rem', lineHeight: 1.1, mb: 0.25 };

  const messageTypographyProps = { noWrap: isXs, variant: isXs ? 'caption' : 'body2' };

  if (error) {
    return (
      <Alert
        severity="error"
        sx={alertSx}
        action={
          <Stack direction={isXs ? 'column' : 'row'} spacing={0.5} alignItems="center">
            <Button color="inherit" size="small" onClick={onRetry} sx={buttonSx}>
              Try Again
            </Button>
            <Button color="inherit" size="small" onClick={onDismissError} sx={buttonSx}>
              Dismiss
            </Button>
          </Stack>
        }
      >
        <AlertTitle sx={titleSx}>Face search failed</AlertTitle>
        <Typography {...messageTypographyProps} color="inherit">
          {isXs ? String(error).slice(0, 100) + (String(error).length > 100 ? '…' : '') : error}
        </Typography>
      </Alert>
    );
  }

  if (isStale) {
    return (
      <Alert
        severity="warning"
        sx={alertSx}
        action={
          <Stack direction={isXs ? 'column' : 'row'} spacing={0.5} alignItems="center">
            <Button color="inherit" size="small" onClick={onRetry} sx={buttonSx}>
              Re-run
            </Button>
            <Button color="inherit" size="small" onClick={onClearFilter} sx={buttonSx}>
              Clear
            </Button>
          </Stack>
        }
      >
        <AlertTitle sx={titleSx}>Gallery Updated</AlertTitle>
        <Typography {...messageTypographyProps}>
          The gallery has changed since this search ran. Re-run to get newer matches.
        </Typography>
      </Alert>
    );
  }

  if (isFiltering) {
    return (
      <Alert
        severity="success"
        sx={alertSx}
        action={
          <Button color="inherit" size="small" onClick={onClearFilter} sx={buttonSx}>
            Clear
          </Button>
        }
      >
        <AlertTitle sx={titleSx}>Showing face matches</AlertTitle>
        <Typography {...messageTypographyProps}>
          Viewing {resultCount} {resultCount === 1 ? 'match' : 'matches'}. Clear filter to view the full gallery.
        </Typography>
      </Alert>
    );
  }

  if (status) {
    return (
      <Alert
        severity="info"
        sx={alertSx}
        action={
          <Button color="inherit" size="small" onClick={onCancel} sx={buttonSx}>
            Cancel
          </Button>
        }
      >
        <AlertTitle sx={titleSx}>Search queued</AlertTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Typography {...messageTypographyProps}>
            Position: {status.position ?? '…'} / {status.total_size ?? '…'}
          </Typography>
          <Typography {...messageTypographyProps} color="text.secondary">
            Stage: {status.stage || stageLabel}
          </Typography>
        </Box>
      </Alert>
    );
  }

  return null;
}

export default FaceSearchBanner;
