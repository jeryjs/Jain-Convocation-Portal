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
  CircularProgress,
  Switch,
  FormControlLabel,
  FormGroup
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import config, { refreshConfig, staticConfig } from '../../config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../config/AuthContext';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    payment: { upiId: '', amount: '', upiLink: '' },
    courses: { folderId: '' },
    general: { gmailUser: '', gmailAppPass: '' },
    config: staticConfig
  });
  const { getAuthHeaders } = useAuth();
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
      const response = await fetch(`${config.API_BASE_URL}/admin/settings`, {
        headers: getAuthHeaders()
      });
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
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) throw new Error('Failed to save settings');
      
      // Refresh config after saving
      await refreshConfig();
      
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

  return (
    <>
      <PageHeader
        pageTitle="Settings"
        pageSubtitle="Manage application settings"
        breadcrumbs={['Admin', 'Settings']}
        onBack={() => {navigate('/admin')}}
      />

      {loading ? (
        <CircularProgress />
      ) : (
        <Box sx={{ p: 3 }} width={{ xs: "90%", md: "60%" }}>
          <Stack spacing={3}>
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
                  label="Google Drive Share ID"
                  value={settings.courses?.folderId || ''}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const match = inputValue.match(/\/s!([^\/\?]+)/);
                    const folderId = match ? match[1] : inputValue?.replace(/[^A-Za-z0-9_-]/g, '');
                    handleCategoryChange('courses', 'folderId', folderId);
                  }}
                  helperText="The share ID from your Google Drive folder URL"
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

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>Frontend Configuration</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Leave toggles in the middle (null) to use hardcoded defaults. Enable/disable to override.
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.config?.SHOW_UPLOAD_ALERT ?? false}
                      indeterminate={settings.config?.SHOW_UPLOAD_ALERT === null}
                      onChange={(e) => {
                        const current = settings.config?.SHOW_UPLOAD_ALERT;
                        const next = current === null ? true : (current === true ? false : null);
                        handleCategoryChange('config', 'SHOW_UPLOAD_ALERT', next);
                      }}
                    />
                  }
                  label={`Show Upload Alert: ${settings.config?.SHOW_UPLOAD_ALERT === null ? 'Default' : settings.config?.SHOW_UPLOAD_ALERT ? 'On' : 'Off'}`}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.config?.HARDCOPY_DISABLED ?? false}
                      indeterminate={settings.config?.HARDCOPY_DISABLED === null}
                      onChange={(e) => {
                        const current = settings.config?.HARDCOPY_DISABLED;
                        const next = current === null ? true : (current === true ? false : null);
                        handleCategoryChange('config', 'HARDCOPY_DISABLED', next);
                      }}
                    />
                  }
                  label={`Hardcopy Disabled: ${settings.config?.HARDCOPY_DISABLED === null ? 'Default' : settings.config?.HARDCOPY_DISABLED ? 'On' : 'Off'}`}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.config?.REMOVE_HARDCOPY ?? false}
                      indeterminate={settings.config?.REMOVE_HARDCOPY === null}
                      onChange={(e) => {
                        const current = settings.config?.REMOVE_HARDCOPY;
                        const next = current === null ? true : (current === true ? false : null);
                        handleCategoryChange('config', 'REMOVE_HARDCOPY', next);
                      }}
                    />
                  }
                  label={`Remove Hardcopy: ${settings.config?.REMOVE_HARDCOPY === null ? 'Default' : settings.config?.REMOVE_HARDCOPY ? 'On' : 'Off'}`}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.config?.DEMO_MODE ?? false}
                      indeterminate={settings.config?.DEMO_MODE === null}
                      onChange={(e) => {
                        const current = settings.config?.DEMO_MODE;
                        const next = current === null ? true : (current === true ? false : null);
                        handleCategoryChange('config', 'DEMO_MODE', next);
                      }}
                    />
                  }
                  label={`Demo Mode: ${settings.config?.DEMO_MODE === null ? 'Default' : settings.config?.DEMO_MODE ? 'On' : 'Off'}`}
                />
              </FormGroup>
            </Card>

            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={24} /> : 'Save All Settings'}
            </Button>
          </Stack>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SettingsPage;