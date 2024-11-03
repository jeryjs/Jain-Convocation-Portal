import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardMedia,
  Stack,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Paper,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  CircularProgress,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PageHeader from '../components/PageHeader';
import config from '../config';
import { REQUEST_TYPES } from '../config/constants';

const MAX_FILE_SIZE = 250 * 1024; // 250KB

export default function RequestPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [requestType, setRequestType] = useState(REQUEST_TYPES.SOFTCOPY);
  const [paymentProof, setPaymentProof] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [processing, setProcessing] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  
  const selectedImages = location.state?.selectedImages || [];

  const handleRequestTypeChange = (event, newType) => {
    if (newType !== null) {
      setRequestType(parseInt(newType));
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.size > MAX_FILE_SIZE) {
      setSnackbar({
        open: true,
        message: 'File size should be less than 250KB',
        severity: 'error'
      });
      return;
    }
    setPaymentProof(file);
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText('your-upi-id@bank');
    setSnackbar({
      open: true,
      message: 'UPI ID copied to clipboard',
      severity: 'success'
    });
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialog(false);
  };

  const handleSubmit = async () => {
    try {
      setProcessing(true);
      setIsSubmitting(true);
      const userdata = config.getUserData();

      if (!userdata?.username) {
        throw new Error('User data not found. Please log in again.');
      }

      // Basic request data
      const requestData = {
        userdata,
        requestedImages: selectedImages.map(img => img.name),
        requestType,
      };

      // Only add payment proof for hardcopy requests
      if (requestType == REQUEST_TYPES.HARDCOPY) {
        if (!paymentProof) {
          throw new Error('Payment proof is required for hard copy requests');
        }

        if (paymentProof.size > MAX_FILE_SIZE) {
          throw new Error('File size exceeds 250KB limit');
        }

        // Convert file to base64
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(paymentProof);
        });
        
        requestData.paymentProof = base64;
      }

      const response = await fetch(`${config.API_BASE_URL}/request/${courseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) throw new Error('Request failed');

      const result = await response.json();
      
      if (result.success) {
        setSuccessDialog(true);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Error submitting request',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
      setProcessing(false);
    }
  };

  return (
    <>
      <PageHeader
        pageTitle="Request Images"
        pageSubtitle="Review and submit your request"
        breadcrumbs={['Courses', courseId, 'Gallery', 'Request']}
        onBack={() => navigate(`/courses/${courseId}`)}
      />
      
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 'lg', mx: 'auto' }}>
        <Stack spacing={{ xs: 2, sm: 3 }}>
          <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Selected Images</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(auto-fill, minmax(140px, 1fr))',
                  sm: 'repeat(auto-fill, minmax(200px, 1fr))'
                },
                gap: { xs: 1, sm: 2 },
              }}
            >
              {selectedImages.map((img) => (
                <Card key={img.name} sx={{ width: '100%' }}>
                  <CardMedia
                    component="img"
                    sx={{
                      aspectRatio: '4/3',
                      objectFit: 'cover'
                    }}
                    image={img.url}
                    alt={img.name}
                  />
                </Card>
              ))}
            </Box>
          </Card>

          <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Request Type</Typography>
            <ToggleButtonGroup
              value={requestType}
              exclusive
              onChange={handleRequestTypeChange}
              sx={{ 
                mb: 2,
                width: { xs: '100%', sm: 'auto' }
              }}
              orientation={isMobile ? 'vertical' : 'horizontal'}
            >
              <ToggleButton value={REQUEST_TYPES.SOFTCOPY} sx={{ py: { xs: 1.5, sm: 1 } }}>
                Soft Copy
              </ToggleButton>
              <ToggleButton value={REQUEST_TYPES.HARDCOPY} sx={{ py: { xs: 1.5, sm: 1 } }}>
                Hard Copy
              </ToggleButton>
            </ToggleButtonGroup>

            {requestType == REQUEST_TYPES.HARDCOPY && (
              <Stack spacing={2}>
                <Card sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'grey.100' }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>Payment Details</Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper' }}>
                    <Stack 
                      direction={{ xs: 'column', sm: 'row' }} 
                      spacing={2} 
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                    >
                      <QrCodeIcon sx={{ fontSize: { xs: 38, sm: 48 }, color: 'primary.main' }} />
                      <Stack spacing={1} flex={1}>
                        <Typography variant="body1" fontWeight="medium">
                          Amount: ₹500
                        </Typography>
                        <Stack 
                          direction={{ xs: 'column', sm: 'row' }} 
                          spacing={1} 
                          alignItems={{ xs: 'stretch', sm: 'center' }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            UPI: your-upi-id@bank
                          </Typography>
                          <Button
                            fullWidth={isMobile}
                            size="small"
                            variant="outlined"
                            startIcon={<ContentCopyIcon />}
                            onClick={handleCopyUPI}
                          >
                            Copy UPI ID
                          </Button>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Paper>
                </Card>

                <Button
                  component="label"
                  variant="outlined"
                  fullWidth={isMobile}
                  size={isMobile ? 'large' : 'medium'}
                  startIcon={<CloudUploadIcon />}
                >
                  Upload Payment Proof
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </Button>
                {paymentProof && (
                  <Typography variant="body2" color="primary">
                    File selected: {paymentProof.name}
                  </Typography>
                )}
              </Stack>
            )}
          </Card>

          <Button
            variant="contained"
            size="large"
            fullWidth={isMobile}
            onClick={handleSubmit}
            disabled={requestType == REQUEST_TYPES.HARDCOPY && !paymentProof || isSubmitting}
            sx={{ py: { xs: 1.5, sm: 1 } }}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Submit Request'
            )}
          </Button>
        </Stack>
      </Box>

      <Dialog
        open={processing}
        aria-describedby="processing-dialog"
      >
        <DialogTitle>Processing Request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
            <CircularProgress />
            <DialogContentText id="processing-dialog">
              Please wait while we process your request. Do not close this window or navigate away.
            </DialogContentText>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={successDialog}
        onClose={handleSuccessDialogClose}
        aria-labelledby="success-dialog-title"
        aria-describedby="success-dialog-description"
      >
        <DialogTitle id="success-dialog-title">
          Request Submitted Successfully
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="success-dialog-description">
            {requestType === REQUEST_TYPES.SOFTCOPY
              ? "The requested images have been sent to your registered email address."
              : "Your request for hard copies has been received. Our team will contact you within 24 hours regarding the collection process."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSuccessDialogClose} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={processing}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
