import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Stack,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import config from '../../config';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    payment: {
      upiId: '',
      amount: '',
      upiLink: ''
    }
    // Add more categories here as needed
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/admin/settings`);
      const data = await response.json();
      setSettings(data || {});
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching settings',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${config.API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) throw new Error('Failed to save settings');
      
      setSnackbar({
        open: true,
        message: 'Settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Error saving settings',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <>
      <PageHeader
        pageTitle="Settings"
        pageSubtitle="Manage application settings"
        breadcrumbs={['Admin', 'Settings']}
        onBack={() => {navigate('/admin')}}
      />

      <Box sx={{ p: 3 }}>
        <Stack spacing={3} maxWidth="md">
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Payment Settings</Typography>
            <Stack spacing={3}>
              <TextField
                label="UPI ID"
                value={settings.payment?.upiId || ''}
                onChange={(e) => handleCategoryChange('payment', 'upiId', e.target.value)}
                fullWidth
              />
              <TextField
                label="Amount"
                type="number"
                value={settings.payment?.amount || ''}
                onChange={(e) => handleCategoryChange('payment', 'amount', e.target.value)}
                fullWidth
              />
              <TextField
                label="UPI Link"
                value={settings.payment?.upiLink || ''}
                onChange={(e) => handleCategoryChange('payment', 'upiLink', e.target.value)}
                helperText="Format: upi://pay?pa=upiid&pn=name&am=amount"
                fullWidth
              />
            </Stack>
          </Card>

          {/* Add more settings categories here */}

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Save All Settings'}
          </Button>
        </Stack>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SettingsPage;