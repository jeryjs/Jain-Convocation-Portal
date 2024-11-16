
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  Rating,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Favorite, FavoriteBorder } from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../config/AuthContext';
import config from '../config';

const FeedbackDialog = ({ open, onClose, username }) => {
  const { userData } = useAuth();
  const [rating, setRating] = useState(userData?.feedback || 0);
  const [hover, setHover] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await fetch(`${config.API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, feedback: rating })
      });
      
      setShowSuccess(true);
      // Automatically close after success animation
      setTimeout(() => {
        setShowSuccess(false);
        onClose(true); // Pass true to indicate successful submission
      }, 1500);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={open}
      onClose={() => onClose(false)}
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          padding: 2,
          minWidth: 300,
          overflow: 'hidden' // For animation
        }
      }}
    >
      <AnimatePresence>
        {showSuccess ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px'
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CheckCircleIcon 
                sx={{ 
                  fontSize: 80, 
                  color: 'success.main',
                  filter: 'drop-shadow(0 0 8px rgba(76, 175, 80, 0.5))'
                }} 
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Typography variant="h6" sx={{ mt: 2 }}>
                Thanks for your feedback!
              </Typography>
            </motion.div>
          </motion.div>
        ) : (
          <>
            <DialogTitle sx={{ textAlign: 'center', typography: 'h5', fontWeight: 'bold' }}>
              How was your experience?
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
                <Rating
                  size="large"
                  value={rating / 2} // Convert to 5-point scale for display
                  onChange={(_, value) => setRating(value * 2)} // Convert back to 10-point scale
                  onChangeActive={(_, value) => setHover(value * 2)}
                  precision={0.5}
                  icon={<Favorite sx={{ 
                    fontSize: '3rem',
                    color: '#ff3d47',
                    filter: 'drop-shadow(0 0 3px rgba(255,61,71,0.4))',
                  }} />}
                  emptyIcon={<FavoriteBorder sx={{ 
                    fontSize: '3rem',
                    opacity: 0.55 
                  }} />}
                  sx={{
                    '& .MuiRating-iconFilled': {
                      transform: 'scale(1.2)',
                      transition: 'transform 0.2s'
                    },
                    '& .MuiRating-iconHover': {
                      transform: 'scale(1.3)',
                      color: '#ff3d47'
                    }
                  }}
                />
                <Typography variant="h6" sx={{ color: '#666', textAlign: 'center' }}>
                  {rating === 0 ? 'Rate us!' :
                   rating <= 2 ? 'Poor' :
                   rating <= 4 ? 'Fair' :
                   rating <= 6 ? 'Good' :
                   rating <= 8 ? 'Very Good' : 'Excellent!'}
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
              <LoadingButton
                loading={isSubmitting}
                variant="contained"
                onClick={handleSubmit}
                disabled={!rating}
                sx={{
                  px: 4,
                  py: 1,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    transform: 'scale(1.02)'
                  }
                }}
              >
                Submit Feedback
              </LoadingButton>
            </DialogActions>
          </>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default FeedbackDialog;