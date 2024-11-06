import React, { useState, useEffect, useRef } from 'react';
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
    payment: { upiId: '', amount: '', upiLink: '' },
    courses: { folderId: '' },
    general: { gmailUser: '', gmailAppPass: '' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const mounted = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    
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
        <Stack spacing={3} width={{ xs:"100vw", md:"60vw" }}>
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

          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Course Settings</Typography>
            <Stack spacing={3}>
              <TextField
                label="OneDrive Share ID"
                value={settings.courses?.folderId || ''}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  const match = inputValue.match(/\/s!([^\/\?]+)/);
                  const folderId = match ? match[1] : inputValue?.replace(/[^A-Za-z0-9_-]/g, '');
                  handleCategoryChange('courses', 'folderId', folderId);
                }}
                helperText="The share ID from your OneDrive folder URL"
                fullWidth
              />
            </Stack>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>General Settings</Typography>
            <Stack spacing={3}>
              <TextField
                label="Gmail User"
                value={settings.general?.gmailUser || ''}
                onChange={(e) => handleCategoryChange('general', 'gmailUser', e.target.value)}
                fullWidth
              />
              <TextField
                label="Gmail App Password"
                type="password"
                value={settings.general?.gmailAppPass || ''}
                onChange={(e) => handleCategoryChange('general', 'gmailAppPass', e.target.value)}
                fullWidth
                helperText="Refer this is to generate App Password: https://bit.ly/3YTjwCT"
              />
            </Stack>
          </Card>

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