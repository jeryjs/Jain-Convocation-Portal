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
                    const match = inputValue.match(/\/folders\/([A-Za-z0-9_-]+)/);
                    const folderId = match ? match[1] : inputValue?.replace(/[^A-Za-z0-9_-]/g, '');
                    handleCategoryChange('courses', 'folderId', folderId);
                    setSnackbar({ open: true, message: `Extracted: ${folderId}`, severity: 'info' });
                  }}
                  helperText="The share ID from your Google Drive folder URL. For example, https://drive.google.com/drive/folders/1Yr0d0h0yKtmuqaV7qtCHxSCGOmr2OYtO"
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Click toggle to cycle: Default → Enabled → Disabled → Default
              </Typography>
              <Stack spacing={2}>
                {Object.keys(staticConfig).filter(key => !key.includes('URL')).map((key) => {
                  const value = settings.config?.[key];
                  const displayName = key.split('_').map(word => 
                    word.charAt(0) + word.slice(1).toLowerCase()
                  ).join(' ');
                  
                  return (
                    <Card 
                      key={key} 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { 
                          bgcolor: 'action.hover',
                          boxShadow: 1
                        }
                      }}
                      onClick={() => {
                        const next = value === null ? true : (value === true ? false : null);
                        handleCategoryChange('config', key, next);
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            {displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {value === null ? 'Using default value' : value ? 'Enabled' : 'Disabled'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              px: 2,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor: value === null ? 'grey.200' : (value ? 'success.light' : 'error.light'),
                              color: value === null ? 'text.secondary' : (value ? 'success.dark' : 'error.dark'),
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              minWidth: 80,
                              textAlign: 'center',
                              transition: 'all 0.2s'
                            }}
                          >
                            {value === null ? 'DEFAULT' : value ? 'ON' : 'OFF'}
                          </Box>
                        </Box>
                      </Box>
                    </Card>
                  );
                })}
              </Stack>
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