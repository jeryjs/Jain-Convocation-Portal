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
  Paper,
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
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PageHeader from '../components/PageHeader';
import config from '../config';
import { REQUEST_TYPES } from '../config/constants';
import { useAuth } from '../config/AuthContext';
import ImageGrid from '../components/ImageGrid';
import { QRCodeCanvas } from 'qrcode.react';

const MAX_FILE_SIZE = 250 * 1024; // 250KB

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
          InputProps={{ readOnly: true }}
          fullWidth
        />
        <TextField
          label="Email"
          value={userFormData.email}
          onChange={handleChange('email')}
          fullWidth
          required
        />
        {(requestType == REQUEST_TYPES.HARDCOPY || hasExistingHardcopy) && (
          <TextField
            label="Phone Number"
            value={userFormData.phone}
            onChange={handleChange('phone')}
            fullWidth
            required
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

// Extracted PaymentDetails component
const PaymentDetails = ({ paymentSettings, paymentProof, handleFileUpload, setSnackbar }) => (
  <Card sx={{ p: 2, bgcolor: 'grey.100' }}>
    <Typography variant="subtitle1" sx={{ mb: 2 }}>Payment Details</Typography>
    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper' }}>
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={2} 
        alignItems="center"
      >
        <Button
          component="a"
          href={paymentSettings.upiLink}
          target="_blank"
          sx={{ 
            p: 2, 
            bgcolor: 'white',
            '&:hover': { bgcolor: 'white' }
          }}
        >
          <QRCodeCanvas
            value={paymentSettings.upiLink} 
            size={128}
            level="H"
            includeMargin
          />
        </Button>
        <Stack spacing={1} flex={1}>
          <Typography variant="body1" fontWeight="medium">
            Amount: ₹{paymentSettings.amount}
          </Typography>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={1} 
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Typography variant="body2" color="text.secondary">
              UPI: {paymentSettings.upiId}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => {
                navigator.clipboard.writeText(paymentSettings.upiId);
                setSnackbar({
                  open: true,
                  message: 'UPI ID copied to clipboard',
                  severity: 'success'
                });
              }}
            >
              Copy UPI ID
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
    <Button
      component="label"
      variant="outlined"
      startIcon={<CloudUploadIcon />}
      sx={{ mt: 2 }}
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
      <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
        File selected: {paymentProof.name}
      </Typography>
    )}
  </Card>
);

// Extracted ImagesSection component
const ImagesSection = ({ requestType, selectedImages, selectedHardcopyImage, handleImageSelection }) => (
  <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      {requestType === REQUEST_TYPES.HARDCOPY ? 
        'Select ONE image for hardcopy (₹500 per print)' : 
        'Selected Images'}
    </Typography>
    <ImageGrid
      images={Object.entries(selectedImages)}
      selectedImages={
        requestType === REQUEST_TYPES.HARDCOPY ? 
        (selectedHardcopyImage ? [selectedHardcopyImage] : []) : 
        []
      }
      onSelectImage={
        requestType === REQUEST_TYPES.HARDCOPY ? 
        handleImageSelection : 
        null
      }
      availableSlots={requestType == REQUEST_TYPES.HARDCOPY ? 1 : 3}
      columns={3}
      showColumnControls={false}
    />
  </Card>
);

export default function RequestPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { userData, updateUserAfterRequest, selectedImages } = useAuth();
  const hasExistingRequests = Object.keys(userData?.requestedImages || {}).length > 0;
  const [paymentProof, setPaymentProof] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [processing, setProcessing] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [requestType, setRequestType] = useState(REQUEST_TYPES.SOFTCOPY);
  const [selectedHardcopyImage, setSelectedHardcopyImage] = useState(userData?.hardcopyImg || null);
  const [userFormData, setUserFormData] = useState({
    email: '',
    phone: '',
  });
  const [paymentSettings, setPaymentSettings] = useState(null);

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
        const response = await fetch(`${config.API_BASE_URL}/admin/settings/payment`);
        const data = await response.json();
        setPaymentSettings(data.payment);
      } catch (error) {
        console.error('Error fetching payment settings:', error);
      }
    };

    if (requestType === REQUEST_TYPES.HARDCOPY) {
      fetchPaymentSettings();
    }
  }, [requestType]);

  const handleRequestTypeChange = (event, newType) => {
    if (newType !== null) {
      setRequestType(parseInt(newType));
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    
    // Function to compress image
    const compressImage = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Calculate new dimensions while maintaining aspect ratio
            if (width > height) {
              if (width > 480) {
                height = Math.round((height * 480) / width);
                width = 480;
              }
            } else {
              if (height > 480) {
                width = Math.round((width * 480) / height);
                height = 480;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Try different quality values until file size is under MAX_FILE_SIZE
            for (let quality = 0.7; quality >= 0.1; quality -= 0.1) {
              const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
              const compressedBlob = dataURLtoBlob(compressedDataUrl);
              if (compressedBlob.size <= MAX_FILE_SIZE) {
                resolve(new File([compressedBlob], file.name, { type: 'image/jpeg' }));
                return;
              }
            }
            resolve(null); // Could not compress enough
          };
        };
      });
    };

    // Helper function to convert data URL to Blob
    const dataURLtoBlob = (dataURL) => {
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    };

    try {
      if (file.size <= MAX_FILE_SIZE) {
        setPaymentProof(file);
      } else {
        const compressedFile = await compressImage(file);
        if (compressedFile && compressedFile.size <= MAX_FILE_SIZE) {
          setPaymentProof(compressedFile);
        } else {
          setSnackbar({
            open: true,
            message: 'Unable to compress file below 250KB. Please use a smaller image.',
            severity: 'error'
          });
        }
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error processing image',
        severity: 'error'
      });
    }
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

  const handleFormChange = (field, value) => {
    setUserFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setProcessing(true);
      setIsSubmitting(true);

      const updatedUserData = {
        ...userData,
        email: userFormData.email,
        phone: requestType == REQUEST_TYPES.HARDCOPY ? userFormData.phone : userData.phone,
        requestedImages: selectedImages,
        hardcopyImg: selectedHardcopyImage
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

      const response = await fetch(`${config.API_BASE_URL}/request/${courseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      if (result.success) {
        // Update both user data and selected images
        updateUserAfterRequest(updatedUserData);
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
  
  // Single handler for image selection
  const handleImageSelection = (imgName) => {
    if (requestType == REQUEST_TYPES.HARDCOPY) {
      setSelectedHardcopyImage(imgName == selectedHardcopyImage ? null : imgName);
    }
  };

  return (
    <>
      <PageHeader
        pageTitle={hasExistingRequests ? "Re-request Images" : "Request Images"}
        pageSubtitle={hasExistingRequests 
          ? "Request soft copies of your previously selected images" 
          : "Review and submit your request"}
        breadcrumbs={['Courses', courseId, 'Gallery', 'Request']}
        onBack={() => navigate(`/courses/${courseId}`)}
      />
      
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 'lg', mx: 'auto' }}>
        <Stack spacing={{ xs: 2, sm: 3 }}>
          {hasExistingRequests && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You have previously requested images. You can only request soft copies of these images again.
            </Alert>
          )}

          <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Request Type</Typography>
            <ToggleButtonGroup
              value={requestType}
              exclusive
              onChange={handleRequestTypeChange}
              sx={{ mb: 2 }}
            >
              <ToggleButton value={REQUEST_TYPES.SOFTCOPY}>
                Soft Copy
              </ToggleButton>
              <ToggleButton 
                value={REQUEST_TYPES.HARDCOPY}
                // disabled={hasExistingHardcopyRequest} // Only disable if they have an existing hardcopy request
              >
                Hard Copy
              </ToggleButton>
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
            selectedHardcopyImage={selectedHardcopyImage}
            handleImageSelection={handleImageSelection}
          />

          {requestType === REQUEST_TYPES.HARDCOPY && paymentSettings && (
            <PaymentDetails
              paymentSettings={paymentSettings}
              paymentProof={paymentProof}
              handleFileUpload={handleFileUpload}
              setSnackbar={setSnackbar}
            />
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={
              (requestType == REQUEST_TYPES.HARDCOPY && 
                (!paymentProof || !selectedHardcopyImage || !userFormData.phone)) || 
              isSubmitting || 
              (requestType == REQUEST_TYPES.SOFTCOPY && 
                Object.keys(selectedImages).length == 0)
            }
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
            {requestType == REQUEST_TYPES.SOFTCOPY
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
