import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  Stack,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  Alert,
  CircularProgress,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Grid,
  Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PageHeader from '../components/PageHeader';
import config from '../config';
import { REQUEST_TYPES } from '../config/constants';
import { useAuth } from '../config/AuthContext';
import ImageGrid from '../components/ImageGrid';
import { QRCodeCanvas } from 'qrcode.react';
import { LoadingButton } from '@mui/lab';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import { compressImage, generateUPILink, validatePhone, formatWaitingTime, sendRequestEmail } from '../utils/utils';

const MAX_FILE_SIZE = 250 * 1024; // 250KB

export default function RequestPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { userData, updateUserAfterRequest, selectedImages, getAuthHeaders } = useAuth();
  const hasExistingRequests = Object.keys(userData?.requestedImages || {}).length > 0;
  const [paymentProof, setPaymentProof] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [processing, setProcessing] = useState(false);
  const [successDialog, setSuccessDialog] = useState({ open: false, waitingTime: null });
  const [requestType, setRequestType] = useState(REQUEST_TYPES.SOFTCOPY);
  const [selectedHardcopyImages, setSelectedHardcopyImages] = useState([]);
  const [userFormData, setUserFormData] = useState({
    email: '',
    phone: '',
  });
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadLinks, setDownloadLinks] = useState([]);

  useEffect(() => {
    if (userData) {
      setUserFormData({
        email: userData.email || '',
        phone: userData.phone || '',
      });
    }
  }, [userData]); // Only run when userData changes

  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const response = await fetch(`${config.API_BASE_URL}/admin/settings/payment`, {
          headers: getAuthHeaders()
        });
        const data = await response.json();
        setPaymentSettings(data.payment);
      } catch (error) {
        console.error('Error fetching payment settings:', error);
      }
    };

    if (requestType === REQUEST_TYPES.HARDCOPY) {
      fetchPaymentSettings();
    }
  }, [requestType, getAuthHeaders]);

  const handleRequestTypeChange = (event, newType) => {
    if (newType !== null) {
      setRequestType(parseInt(newType));
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    try {
      if (file.size <= MAX_FILE_SIZE) {
        setPaymentProof(file);
      } else {
        const compressedFile = await compressImage(file, MAX_FILE_SIZE);
        if (compressedFile && compressedFile.size <= MAX_FILE_SIZE) {
          setPaymentProof(compressedFile);
        } else {
          setSnackbar({ open: true, message: 'Unable to compress file below 250KB. Please use a smaller image.', severity: 'error' });
        }
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error processing image', severity: 'error' });
    }
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialog({ open: false, waitingTime: null });
    window.location.reload();
  };

  const handleFormChange = (field, value) => {
    setUserFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update image selection handler
  const handleImageSelection = (imgPath) => {
    if (requestType === REQUEST_TYPES.HARDCOPY) {
      setSelectedHardcopyImages(prev => {
        const isSelected = prev.includes(imgPath);
        if (isSelected)
          return prev.filter(img => img !== imgPath);
        if (prev.length < 4) { // Allow up to 4 selections
          return [...prev, imgPath];
        }
        return prev;
      });
    }
  };

  // Helper function to calculate payment amount
  const calculatePaymentAmount = () => {
    return selectedHardcopyImages.length * Number(paymentSettings.amount);
  };

  const canDownloadImages = () => {
    if (!userData?.requestedImages || Object.keys(selectedImages).length === 0) return false;
    return Object.keys(selectedImages).every(img => userData.requestedImages[img]);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/images/${Object.keys(selectedImages).join(',')}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (!data.links || data.links.length === 0)
        throw new Error('No download links available');

      setDownloadLinks(data.links);
      setSnackbar({ open: true, message: 'Successfully generated download links!', severity: 'success' });
      return data.links;
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Error fetching image links', severity: 'error' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setProcessing(true);
      setIsSubmitting(true);

      if (requestType === REQUEST_TYPES.HARDCOPY && (!userFormData.phone || !validatePhone(userFormData.phone)))
        throw new Error('Please enter a valid phone number');

      const updatedUserData = {
        ...userData,
        email: userFormData.email,
        phone: requestType == REQUEST_TYPES.HARDCOPY ? userFormData.phone : userData.phone,
        requestedImages: selectedImages,
        hardcopyImages: selectedHardcopyImages
      };

      const requestData = {
        userdata: updatedUserData,
        requestedImages: selectedImages,
        requestType,
        paymentProof: requestType == REQUEST_TYPES.HARDCOPY ? await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(paymentProof);
        }) : null
      };

      const response = await fetch(`${config.API_BASE_URL}/request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      if (result.success) {
        updateUserAfterRequest(updatedUserData);
        
        // Send email based on request type
        if (requestType === REQUEST_TYPES.SOFTCOPY) {
          const links = await handleDownload(); // Generate download links
          await sendRequestEmail(updatedUserData, 'softcopy', links);
        } else if (requestType === REQUEST_TYPES.HARDCOPY) {
          await sendRequestEmail(updatedUserData, 'hardcopy', result.waitingTime);
        }
        
        setSnackbar({ open: true, message: 'Email sent successfully.', severity: 'success' });
        setSuccessDialog({ open: true, waitingTime: result.waitingTime });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Error submitting request', severity: 'error' });
    } finally {
      setIsSubmitting(false);
      setProcessing(false);
    }
  };

  return (
    <>
      <PageHeader
        pageTitle={hasExistingRequests ? "Re-request Images" : "Request Images"}
        pageSubtitle={hasExistingRequests
          ? "Request soft copies of your previously selected images"
          : "Review and submit your request"}
        breadcrumbs={['Sessions', 'Gallery', 'Request']}
        onBack={() => navigate(`/gallery/${sessionId}`)}
      />

      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 'lg', minWidth:{xs:'95vw', md:'70vw'} }}>
        <Stack spacing={{ xs: 2, sm: 3 }}>
          {hasExistingRequests && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You have previously requested images. You can only request soft copies of these images again.
            </Alert>
          )}

          <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Request Type</Typography>
            <ToggleButtonGroup value={requestType} exclusive onChange={handleRequestTypeChange} sx={{ mb: 2 }}>
              <ToggleButton value={REQUEST_TYPES.SOFTCOPY}>Soft Copy</ToggleButton>
              <ToggleButton value={REQUEST_TYPES.HARDCOPY}>Hard Copy</ToggleButton>
            </ToggleButtonGroup>
          </Card>

          <UserForm
            userData={userData}
            userFormData={userFormData}
            onFormChange={handleFormChange}
            requestType={requestType}
            hasExistingHardcopy={requestType == REQUEST_TYPES.HARDCOPY || requestType == REQUEST_TYPES.BOTH}
          />

          <ImagesSection
            requestType={requestType}
            selectedImages={selectedImages}
            selectedHardcopyImages={selectedHardcopyImages}
            handleImageSelection={handleImageSelection}
            amount={paymentSettings?.amount?? 0}
          />

          {requestType === REQUEST_TYPES.HARDCOPY && paymentSettings && (
            <PaymentDetails
              paymentSettings={{
                ...paymentSettings,
                amount: calculatePaymentAmount(),
                upiLink: generateUPILink(paymentSettings.upiLink, calculatePaymentAmount())
              }}
              paymentProof={paymentProof}
              handleFileUpload={handleFileUpload}
              setSnackbar={setSnackbar}
              selectedCount={selectedHardcopyImages.length}
            />
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ width: '100%' }}
          >
            <LoadingButton
              loading={isSubmitting}
              variant="contained"
              size="large"
              onClick={handleSubmit}
              startIcon={<SendIcon />}
              disabled={
                (requestType === REQUEST_TYPES.SOFTCOPY && Object.keys(selectedImages).length === 0) ||
                (requestType === REQUEST_TYPES.HARDCOPY && (!paymentProof || selectedHardcopyImages.length === 0)) ||
                userFormData.email == ''
              }
              sx={{ py: { xs: 1.5, sm: 1 }, flex: 1 }}>
              { hasExistingRequests? 'Re-Submit Request' : 'Submit Request'}
            </LoadingButton>

            {requestType === REQUEST_TYPES.SOFTCOPY && canDownloadImages() && (
              <>
                {downloadLinks.length === 0 ? (
                  <LoadingButton
                    loading={isDownloading}
                    variant="outlined"
                    size="large"
                    onClick={handleDownload}
                    startIcon={<DownloadIcon />}
                    sx={{ py: { xs: 1.5, sm: 1 }, flex: { sm: 1 } }}>
                    Download Images
                  </LoadingButton>
                ) : (
                  <Card variant='outlined' sx={{ flex: { sm: 1 } }}>
                    {downloadLinks.map((link) => (
                      <Chip
                        key={link.name}
                        component='a'
                        label={ link.name.match(/\/(\w+\.\w+)$/)[1] }
                        href={link.url}
                        icon={<DownloadIcon />}
                        color="secondary"
                        variant="outlined"
                        clickable
                        sx={{ m:'20' }} />
                    ))}
                  </Card>
                )}
              </>
            )}
          </Stack>
        </Stack>
      </Box>

      <Dialog open={processing} aria-describedby="processing-dialog">
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
        open={successDialog.open}
        onClose={handleSuccessDialogClose}
        aria-labelledby="success-dialog-title"
        aria-describedby="success-dialog-description">
        <DialogTitle id="success-dialog-title">
          Request Submitted Successfully
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="success-dialog-description">
            {requestType == REQUEST_TYPES.SOFTCOPY
              ? "The requested images will be sent to your registered email address within 5 minutes."
              : `Your request for hard copies has been received. Our team will contact you within ${formatWaitingTime(successDialog.waitingTime)}.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSuccessDialogClose} variant="contained">OK</Button>
        </DialogActions>
      </Dialog>

      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={processing} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}

// Create a new UserForm component outside the main component
const UserForm = React.memo(({ userData, userFormData, onFormChange, requestType, hasExistingHardcopy }) => {
  const handleChange = (field) => (event) => {
    onFormChange(field, event.target.value);
  };

  return (
    <Card sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>User Details</Typography>
      <Stack spacing={2}>
        <TextField
          label="USN"
          value={userData.username}
          aria-readonly="true"
        />
        <TextField
          label="Email"
          value={userFormData.email}
          onChange={handleChange('email')}
          type='email'
        />
        {(requestType == REQUEST_TYPES.HARDCOPY || hasExistingHardcopy) && (
          <TextField
            label="Phone Number"
            value={userFormData.phone}
            onChange={handleChange('phone')}
            type="tel"
            error={requestType == REQUEST_TYPES.HARDCOPY && !validatePhone(userFormData.phone)}
            helperText={requestType == REQUEST_TYPES.HARDCOPY && 'Please enter a valid phone number for hardcopy requests'}
          />
        )}
      </Stack>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return prevProps.userFormData.email == nextProps.userFormData.email &&
    prevProps.userFormData.phone == nextProps.userFormData.phone &&
    prevProps.requestType == nextProps.requestType;
});

// Payment Details component
const PaymentDetails = ({ paymentSettings, paymentProof, handleFileUpload, setSnackbar, selectedCount }) => {
  const handleCopyUPI = () => {
    try {
      navigator.clipboard.writeText(paymentSettings.upiId);
      setSnackbar({ open: true, message: 'UPI ID copied to clipboard', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to copy UPI ID', severity: 'error' });
    }
  };

  return (
    <Card sx={{ p: 2, opacity: paymentSettings.amount > 0 ? 1 : 0.5, pointerEvents: paymentSettings.amount > 0 ? 'auto' : 'none' }}>
      <Stack spacing={3}>
        <Typography variant="h6">Payment Details</Typography>

        <Card variant="outlined" sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Grid container spacing={3} alignItems="center">
            {/* Payment Info */}
            <Grid item xs={12} md={6}>
              <Stack spacing={2.5}>
                <Button size="medium" variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyUPI} fullWidth>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    UPI ID: {paymentSettings.upiId}
                  </Typography>
                </Button>

                <Typography variant="h6" color="primary" sx={{ textAlign: 'center' }}>
                  Amount: ₹{paymentSettings.amount} ({selectedCount} {selectedCount === 1 ? 'print' : 'prints'})
                </Typography>
              </Stack>
            </Grid>

            {/* QR Code */}
            <Grid item xs={12} md={6}>
              <Box component="a" href={paymentSettings.upiLink} target="_blank" rel="noopener noreferrer" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }}>
                <QRCodeCanvas value={paymentSettings.upiLink} size={180} level="H" includeMargin={true} />
                <Typography variant="caption" color="text.secondary" display={{ md: "none" }} sx={{ mt: 1 }}>
                  Tap QR to open in UPI app
                </Typography>
              </Box>
            </Grid>

            {/* Upload Section */}
            <Grid item xs={12}>
              <Stack spacing={2}>
                <Button component="label" variant="contained" startIcon={<CloudUploadIcon />} size="large" fullWidth>
                  Upload Payment Proof
                  <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                </Button>

                {paymentProof && (
                  <Alert severity="success" icon={false} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Card variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Box
                        component="img"
                        src={URL.createObjectURL(paymentProof)}
                        alt="Payment proof"
                        sx={{ height: 240, objectFit: 'cover', borderRadius: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {paymentProof.name}
                      </Typography>
                    </Box>
                  </Card>
                  </Alert>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Card>
      </Stack>
    </Card>
  );
};

// Extracted ImagesSection component
const ImagesSection = ({ requestType, selectedImages, selectedHardcopyImages, handleImageSelection, amount }) => (
  <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      {requestType === REQUEST_TYPES.HARDCOPY ?
        `Select up to FOUR images for hardcopy (₹${amount} per print)` :
        'Selected Images'}
    </Typography>
    <ImageGrid
      images={ Object.entries(selectedImages).map(([path, url]) => ({ [path]: url })) }
      selectedImages={ requestType === REQUEST_TYPES.HARDCOPY ? selectedHardcopyImages : [] }
      onSelectImage={ requestType === REQUEST_TYPES.HARDCOPY ? handleImageSelection : null }
      availableSlots={4}
      showColumnControls={false}
    />
  </Card>
);
