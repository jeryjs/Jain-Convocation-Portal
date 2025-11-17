import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import ReplayIcon from '@mui/icons-material/Replay';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

function FaceSearchBanner({
  status,
  error,
  isFiltering,
  isStale,
  resultCount,
  hasResult,
  onCancel,
  onToggleFilter,
  onRetry,
  onDismissError,
}) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  // Compact button styles for mobile, slightly larger for desktops
  const buttonSx = {
    minWidth: 28,
    px: 0.4,
    py: 0.3,
    fontSize: isXs ? '0.72rem' : '0.82rem',
    textTransform: 'none',
    lineHeight: 1,
    borderRadius: 1,
  };

  // Glass effect / compact layout
  const glassBg =
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.06)
      : alpha(theme.palette.background.paper, 0.82);
  const borderColor = alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.22 : 0.6);

  const alertSx = {
    px: isXs ? 0.75 : 1,
    py: isXs ? 0.45 : 0.6,
    borderRadius: 2,
    width: '100%',
    backdropFilter: 'blur(6px)',
    background: glassBg,
    border: `1px solid ${borderColor}`,
    boxShadow: isXs ? theme.shadows[1] : `0 2px 8px ${alpha(theme.palette.common.black, 0.06)}`,
    alignItems: 'center',
    display: 'flex',
    gap: 1,
    '& .MuiAlert-action': {
      margin: 0,
      alignSelf: 'center',
    },
    '& .MuiAlert-message': {
      padding: 0,
      width: '100%',
    },
  };

  const titleSx = {
    fontSize: isXs ? '0.9rem' : '0.95rem',
    lineHeight: 1.05,
    fontWeight: 600,
    mb: 0.15,
  };

  // More compact message typography (smaller & allow wrapping on mobile)
  const messageTypographyProps = {
    noWrap: false,
    variant: isXs ? 'caption' : 'body2',
    component: 'div',
  };

  // Generic renderAction that uses small icon-only controls on mobile, condensed buttons on desktop
  const renderAction = ({ label, onClick, icon: IconComponent, ariaLabel }) => {
    if (isXs) {
      return (
        <Tooltip title={label}>
          <IconButton color="inherit" size="small" onClick={onClick} aria-label={ariaLabel}>
            <IconComponent fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    }
    return (
      <Button
        color="inherit"
        size="small"
        onClick={onClick}
        sx={buttonSx}
        startIcon={<IconComponent fontSize="small" />}
      >
        {label}
      </Button>
    );
  };

  if (error) {
    return (
      <Alert
        severity="error"
        variant="standard"
        sx={alertSx}
        action={
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 0.5 }}>
            {renderAction({ label: 'Try again', onClick: onRetry, icon: ReplayIcon, ariaLabel: 'retry' })}
            {renderAction({ label: 'Dismiss', onClick: onDismissError, icon: CloseIcon, ariaLabel: 'dismiss' })}
          </Stack>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, width: '100%' }}>
          <AlertTitle sx={titleSx}>Face search failed</AlertTitle>
          <Typography {...messageTypographyProps} color="inherit">
            {isXs ? String(error).slice(0, 140) + (String(error).length > 140 ? '…' : '') : error}
          </Typography>
        </Box>
      </Alert>
    );
  }

  if (isStale) {
    return (
      <Alert
        severity="warning"
        variant="standard"
        sx={alertSx}
        action={
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 0.5 }}>
            {renderAction({ label: 'Re-run', onClick: onRetry, icon: ReplayIcon, ariaLabel: 'rerun' })}
            {renderAction({ label: 'Hide', onClick: onToggleFilter, icon: FilterAltOffIcon, ariaLabel: 'hide' })}
          </Stack>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <AlertTitle sx={titleSx}>Gallery Updated</AlertTitle>
            <Typography {...messageTypographyProps}>
              The gallery changed — re-run to get newer matches.
            </Typography>
          </Box>
        </Box>
      </Alert>
    );
  }

  if (isFiltering) {
    return (
      <Alert
        severity="success"
        variant="standard"
        sx={alertSx}
        action={
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 0.5 }}>
            {renderAction({ label: 'Show All', onClick: onToggleFilter, icon: FilterAltOffIcon, ariaLabel: 'show all' })}
          </Stack>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', width: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <AlertTitle sx={titleSx}>Face Filter Active</AlertTitle>
            <Typography {...messageTypographyProps}>
              {resultCount === 0 ? (
                'No matches found'
              ) : (
                <>Showing top <strong>{resultCount}</strong> results</>
              )}
            </Typography>
          </Box>
          {resultCount > 0 && (
            <Chip
              label={resultCount}
              size={isXs ? 'small' : 'medium'}
              sx={{
                background: alpha(theme.palette.success.main, 0.16),
                border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                color: theme.palette.text.primary,
                fontWeight: 600,
                ml: 0.25,
                height: isXs ? 24 : 28,
              }}
            />
          )}
        </Box>
      </Alert>
    );
  }

  // Show inactive filter state when results exist but filter is off
  // if (hasResult && !isFiltering && !isStale) {
  //   return (
  //     <Alert
  //       severity="info"
  //       variant="standard"
  //       sx={alertSx}
  //       action={
  //         <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 0.5 }}>
  //           {renderAction({ label: 'Apply Filter', onClick: onToggleFilter, icon: FilterAltIcon, ariaLabel: 'apply filter' })}
  //         </Stack>
  //       }
  //     >
  //       <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', width: '100%' }}>
  //         <Box sx={{ flex: 1 }}>
  //           <AlertTitle sx={titleSx}>Face Search Complete</AlertTitle>
  //           <Typography {...messageTypographyProps}>
  //             Found <strong>{resultCount}</strong> {resultCount === 1 ? 'match' : 'matches'}. Click to filter.
  //           </Typography>
  //         </Box>
  //       </Box>
  //     </Alert>
  //   );
  // }

  if (status) {
    // If we have size info, show a subtle progress bar on mobile and a compact state on desktop
    const progress =
      status.position && status.total_size ? Math.round((status.position / status.total_size) * 100) : undefined;

    return (
      <Alert
        severity="info"
        variant="standard"
        sx={alertSx}
        action={
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 0.5 }}>
            {renderAction({ label: 'Cancel', onClick: onCancel, icon: CancelIcon, ariaLabel: 'cancel' })}
          </Stack>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <AlertTitle sx={titleSx}>Search queued</AlertTitle>
            {progress !== undefined ? (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                {Math.min(Math.max(progress, 0), 100)}%
              </Typography>
            ) : null}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
            <Typography {...messageTypographyProps} color="text.secondary" sx={{ flex: 1 }}>
              Position: {status.position ?? '…'} / {status.total_size ?? '…'}
            </Typography>
            <Typography {...messageTypographyProps} color="text.secondary">
              Stage: {status.stage ?? '…'}
            </Typography>
          </Box>

          {/* Thin progress bar (subtle and compact) */}
          {isXs && progress !== undefined ? (
            <Box sx={{ width: '100%', mt: 0.4 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(Math.max(progress, 0), 100)}
                sx={{ height: 6, borderRadius: 2 }}
              />
            </Box>
          ) : null}
        </Box>
      </Alert>
    );
  }

  return null;
}

export default FaceSearchBanner;
