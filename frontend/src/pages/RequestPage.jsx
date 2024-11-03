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
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PageHeader from '../components/PageHeader';
import config from '../config';

export default function RequestPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [requestType, setRequestType] = useState('softcopy');
  const [paymentProof, setPaymentProof] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  const selectedImages = location.state?.selectedImages || [];

  const handleRequestTypeChange = (event, newType) => {
    if (newType !== null) {
      setRequestType(newType);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: 'File size should be less than 5MB',
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

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const userdata = config.userdata;
      
      
      localStorage.removeItem(`selected_images`);
      setSnackbar({
        open: true,
        message: 'Request submitted successfully',
        severity: 'success'
      });
      
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error submitting request. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
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
              <ToggleButton value="softcopy" sx={{ py: { xs: 1.5, sm: 1 } }}>
                Soft Copy
              </ToggleButton>
              <ToggleButton value="hardcopy" sx={{ py: { xs: 1.5, sm: 1 } }}>
                Hard Copy
              </ToggleButton>
            </ToggleButtonGroup>

            {requestType === 'hardcopy' && (
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
            disabled={requestType === 'hardcopy' && !paymentProof || isSubmitting}
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
