import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { 
  Box, Stack, Card, Typography, Chip,
  IconButton, Tooltip, Tab, Tabs,
  ButtonGroup, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, useTheme,
  CircularProgress, Snackbar, Alert
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { 
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  RemoveRedEye as ViewIcon,
  Download as DownloadIcon,
  Person as UserIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CheckCircle,
  Payment,
} from '@mui/icons-material';
import ImageGrid from '../../components/ImageGrid';
import PageHeader from '../../components/PageHeader';
import config from '../../config';
import { REQUEST_TYPES, REQUEST_TYPE_LABELS } from '../../config/constants';
import { useAuth } from '../../config/AuthContext';
import { formatDate, downloadFile } from '../../utils/utils';

const AdminPage = () => {
  const theme = useTheme();
  const { getAuthHeaders, userData } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [paymentPreviewOpen, setPaymentPreviewOpen] = useState(false);
  const [paymentPreviewRequest, setPaymentPreviewRequest] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({open: false, message: '', severity: 'info'});
  const [downloadingImages, setDownloadingImages] = useState({});
  const mounted = useRef(false);
  const navigate = useNavigate();
  const [showCompletedConfirm, setShowCompletedConfirm] = useState(false);
  const [isRefreshingCompleted, setIsRefreshingCompleted] = useState(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    handleRefresh();
  }, []);

  const fetchRequests = async (statusFilter = ['pending', 'approved', 'printed']) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      statusFilter.forEach(s => params.append('status', s));
      
      // Get the limit from user through a prompt
      if (statusFilter.includes('completed'))
        params.append('limit', prompt('Enter limit for completed requests (default: 100)', 100)??100);
      
      const response = await fetch(`${config.API_BASE_URL}/admin/requests?${params}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Failed to fetch requests');
      
      const data = await response.json();
      if (statusFilter.includes('completed')) {
        // Merge with existing non-completed requests
        setRequests(prev => {
          const nonCompleted = prev.filter(r => r.status !== 'completed');
          const completed = data.filter(r => r.status === 'completed');
          return [...nonCompleted, ...completed];
        });
      } else {
        // Replace only non-completed requests
        setRequests(prev => {
          const completed = prev.filter(r => r.status === 'completed');
          return [...data, ...completed];
        });
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setSnackbar({ open: true, message: 'Error fetching requests', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/admin/requests/${requestId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status: ' + response.statusText);

      // If printing and has hardcopy images, download them
      if (newStatus === 'printed') {
        const request = requests.find(r => r.username === requestId);
        if (request?.hardcopyImages?.length > 0) {
          for (const img of request.hardcopyImages) {
            await handleImageDownload(img, request.requestedImages);
          }
        }
      }

      // Update requests locally instead of refreshing
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.username === requestId 
            ? { ...request, status: newStatus, lastUpdated: { _seconds: Date.now() / 1000 } }
            : request
        )
      );
      
      setSnackbar({ open: true, message: `Request ${newStatus} successfully`, severity: 'success' });
    } catch (error) {
      console.error('Error updating status:', error);
      setSnackbar({ open: true, message: error.message || 'Error updating request status', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (includeCompleted = false) => {
    if (includeCompleted) {
      setIsRefreshingCompleted(true);
    } else {
      setIsRefreshing(true);
    }
    
    await fetchRequests(includeCompleted ? ['pending', 'approved', 'printed', 'completed'] : ['pending', 'approved', 'printed']);
    
    setIsRefreshing(false);
    setIsRefreshingCompleted(false);
    setShowCompletedConfirm(false);
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getImageLinks = async (paths) => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/images/${paths.join(',')}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      // Cache the links
      data.links.forEach(link => {
        localStorage.setItem(`img_${link.name}`, link.url);
      });
      
      return data.links;
    } catch (error) {
      console.error('Error fetching image links:', error);
      throw error;
    }
  };

  const handleImageDownload = async (path, requestImages) => {
    setDownloadingImages(prev => ({ ...prev, [path]: true }));
    try {
      // Check cache first
      const cachedUrl = localStorage.getItem(`img_${path}`);
      if (cachedUrl) {
        await downloadFile(cachedUrl, path, 500);
      } else {
        // If not in cache, fetch all images for this request
        const links = await getImageLinks(Object.keys(requestImages));
        const link = links.find(l => l.name === path);
        if (link) await downloadFile(link.url, path);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error downloading image', severity: 'error' });
    } finally {
      setDownloadingImages(prev => ({ ...prev, [path]: false }));
    }
  };

  const dialogProps = {
    selectedRequest,
    setSelectedRequest,
    downloadingImages,
    handleImageDownload
  };

  return (
    <>
      <PageHeader
        pageTitle="Admin Dashboard"
        pageSubtitle="Manage student requests"
        breadcrumbs={['Admin']}
        actionButtons={
          userData?.username == 'ADMIN' ? (
            <Stack direction="row" spacing={2}>
              <Button variant="contained" color="primary" startIcon={<UserIcon />}
                sx={{ boxShadow: 2, '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }, transition: 'all 0.2s ease-in-out' }}
                onClick={() => navigate('/admin/manage')}>
                Manage Users
              </Button>
              <Button variant="contained" color="secondary" startIcon={<SettingsIcon />}
                sx={{ boxShadow: 2, '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }, transition: 'all 0.2s ease-in-out' }}
                onClick={() => navigate('/admin/settings')}>
                Settings
              </Button>
            </Stack>
          ) : null
        }
      />

      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          <StatsCards requests={requests} theme={theme}/>

          <RequestsTable
            requests={requests}
            loading={loading}
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
            handleStatusChange={handleStatusChange}
            setSelectedRequest={setSelectedRequest}
            handleRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            setImagePreviewOpen={setPaymentPreviewOpen}
            setPaymentPreviewRequest={setPaymentPreviewRequest}
            isRefreshingCompleted={isRefreshingCompleted}
            onRefresh={() => handleRefresh(false)}
            onRefreshCompleted={() => setShowCompletedConfirm(true)}
          />
        </Stack>
      </Box>

      <RequestDetailsDialog {...dialogProps} />

      <PreviewPaymentDialog
        paymentPreviewOpen={paymentPreviewOpen}
        setPaymentPreviewOpen={setPaymentPreviewOpen}
        selectedRequest={paymentPreviewRequest}
      />

      <Snackbar 
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog 
        open={showCompletedConfirm} 
        onClose={() => setShowCompletedConfirm(false)}
      >
        <DialogTitle>Refresh Completed Requests?</DialogTitle>
        <DialogContent>
          <Typography>
            This will fetch all completed requests and significantly increase the database usage. Do you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompletedConfirm(false)}>Cancel</Button>
          <Button onClick={() => {handleRefresh(true); setShowCompletedConfirm(false)}} variant="contained" color="primary">
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// StatsCards component
const StatsCards = ({ requests, theme }) => {
  const feedbackStats = requests.reduce((acc, req) => {
    if (req.feedback) {
      acc.total += req.feedback;
      acc.count++;
    }
    return acc;
  }, { total: 0, count: 0 });

  const defaultStats = [
    { label: 'Total Requests', value: requests.length, color: theme.palette.info.light },
    { label: 'Pending Review', value: requests.filter(r => r.status === 'pending').length, color: theme.palette.warning.main },
    { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, color: theme.palette.success.main },
    { label: 'Ready to Collect', value: requests.filter(r => r.status === 'printed').length, color: theme.palette.secondary.main },
    { label: 'Hard Copy Requests', value: requests.filter(r => r.requestType === REQUEST_TYPES.HARDCOPY || r.requestType === REQUEST_TYPES.BOTH).length, color: theme.palette.primary.main },
    { label: 'Soft Copy Requests', value: requests.filter(r => r.requestType === REQUEST_TYPES.SOFTCOPY || r.requestType === REQUEST_TYPES.BOTH).length, color: theme.palette.info.dark },
    { label: 'Average Rating', value: feedbackStats.count ? (feedbackStats.total / feedbackStats.count / 2).toFixed(1) + '★' : 'N/A', color: '#ff3d47'},
    { label: 'Total Ratings', value: feedbackStats.count, color: theme.palette.success.main }
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))` }}>
      {defaultStats.map((stat) => (
        <Card key={stat.label} sx={{ p: 2 }}>
          <Typography variant="h3" sx={{ color: stat.color, fontWeight: 'bold' }}>
            {stat.value}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {stat.label}
          </Typography>
        </Card>
      ))}
    </Box>
  );
};

// Move getStatusChip to be a standalone function or helper
const getStatusChip = (status) => {
  const statusConfig = {
    pending: { color: 'warning', label: 'Pending' },
    approved: { color: 'success', label: 'Approved' },
    printed: { color: 'secondary', label: 'Printed' },
    rejected: { color: 'error', label: 'Rejected' },
    completed: { color: 'info', label: 'Completed' }
  };
  const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
  return <Chip label={config.label} color={config.color} size="small" />;
};

// Extracted RequestsTable component
const RequestsTable = ({
  requests,
  loading,
  selectedTab,
  setSelectedTab,
  handleStatusChange,
  setSelectedRequest,
  handleRefresh,
  isRefreshing,
  setImagePreviewOpen,
  setPaymentPreviewRequest,
  isRefreshingCompleted,
  onRefresh,
  onRefreshCompleted
}) => {
  const { userData } = useAuth();
  const columns = [
    { 
      field: 'lastUpdated', headerName: 'Date', width: 180,
      renderCell: (params) => formatDate(params.value._seconds)
    },
    { field: 'username', headerName: 'USN', width: 130 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'day', headerName: 'Day', width: 80 },
    { 
      field: 'requestType', headerName: 'Type', width: 150,
      renderCell: (params) => {
        let chipColor = 'secondary';
        if (params.value == REQUEST_TYPES.HARDCOPY) chipColor = 'primary';
        else if (params.value == REQUEST_TYPES.BOTH) chipColor = 'error';
        return (
          <Chip label={REQUEST_TYPE_LABELS[params.value] || 'Unknown'} color={chipColor} size="small" />
        );
      },
    },
    { 
      field: 'status', headerName: 'Status', width: 120,
      renderCell: (params) => getStatusChip(params.value),
    },
    { field: 'actions', headerName: 'Actions', width: 180, sortable: false,
      renderCell: (params) => (
        <ButtonGroup size="small">
          <Tooltip title="View Details">
            <IconButton onClick={() => setSelectedRequest(params.row)} size="small">
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.requestType !== REQUEST_TYPES.SOFTCOPY && params.row.status === 'pending' && (
            <>
              <Tooltip title="Approve Request">
                <IconButton onClick={() => handleStatusChange(params.row.username, 'approved')} color="success" size="small">
                  <ApproveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton onClick={() => handleStatusChange(params.row.username, 'rejected')} color="error" size="small">
                  <RejectIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {params.row.status === 'approved' && (userData.username == "VENDOR" || userData.username == "ADMIN") && (
            <Tooltip title="Mark as Printed and Download">
              <IconButton onClick={() => handleStatusChange(params.row.username, 'printed')} color="secondary" size="small">
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {params.row.status === 'printed' && (
            <Tooltip title="Mark as Completed">
              <IconButton onClick={() => handleStatusChange(params.row.username, 'completed')} color="info" size="small">
                <CheckCircle fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {params.row.paymentProof && (
            <Tooltip title="View Payment Proof">
              <IconButton size="small"
                onClick={() => {
                  setPaymentPreviewRequest(params.row);
                  setImagePreviewOpen(true);
                }}>
                <Payment fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </ButtonGroup>
      ),
    },
  ];

  const filteredRequests = requests.filter(req => {
    if (selectedTab == 'all') return true;
    if (selectedTab == 'pending') return req.status == 'pending';
    if (selectedTab == 'approved') return req.status == 'approved';
    if (selectedTab == 'printed') return req.status == 'printed';
    if (selectedTab == 'hardcopy') return req.requestType == REQUEST_TYPES.HARDCOPY || req.requestType == REQUEST_TYPES.BOTH;
    if (selectedTab == 'softcopy') return req.requestType == REQUEST_TYPES.SOFTCOPY || req.requestType == REQUEST_TYPES.BOTH;
    return true;
  });

  return (
    <Card>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, v) => setSelectedTab(v)}
          sx={{ px: 2, pt: 2 }}
        >
          <Tab label="All Requests" value="all" />
          <Tab label="Pending" value="pending" />
          <Tab label="Approved" value="approved" />
          <Tab label="Printed" value="printed" />
          <Tab label="Hard Copy" value="hardcopy" />
          <Tab label="Soft Copy" value="softcopy" />
        </Tabs>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh Active Requests">
            <IconButton 
              onClick={onRefresh}
              disabled={isRefreshing}
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  bgcolor: 'background.paper',
                  transform: 'rotate(180deg)',
                },
                transition: 'transform 0.5s',
              }}
            >
              {isRefreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Including Completed">
            <IconButton 
              onClick={onRefreshCompleted}
              disabled={isRefreshingCompleted}
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  bgcolor: 'background.paper',
                  transform: 'rotate(180deg)',
                },
                transition: 'transform 0.5s',
              }}
            >
              {isRefreshingCompleted ? <CircularProgress size={24} /> : <RefreshIcon color="secondary" />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <Box sx={{ height: 600, width: '100%', p: 2 }}>
        <DataGrid
          rows={filteredRequests}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          density="comfortable"
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
            sorting: {
              sortModel: [{ field: 'lastUpdated', sort: 'desc' }],
            },
          }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </Box>
    </Card>
  );
};

// RequestDetailsDialog component
const RequestDetailsDialog = ({ selectedRequest, setSelectedRequest, downloadingImages, handleImageDownload }) => (
  <Dialog open={Boolean(selectedRequest)} onClose={() => setSelectedRequest(null)} maxWidth="sm" fullWidth>
    {selectedRequest && (
      <>
        <DialogTitle>Request Details</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="subtitle2">
              Student Details
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'auto 1fr' }}>
              {[
                ['USN', selectedRequest.username],
                ['Name', selectedRequest.name],
                ['Email', selectedRequest.email],
                ['Phone', selectedRequest.phone],
                ['Program', selectedRequest.program],
                ['Day', selectedRequest.day],
                ['Feedback', selectedRequest.feedback ? `${selectedRequest.feedback/2} ♥` : 'N/A'],
                ['Request Type', REQUEST_TYPE_LABELS[selectedRequest.requestType]],
                ['Status', selectedRequest.status],
                ['Date', formatDate(selectedRequest.lastUpdated._seconds)]
              ].filter(([_, value]) => value != null).map(([label, value]) => (
                <React.Fragment key={label}>
                  <Typography color="text.secondary">{label}:</Typography>
                  <Typography>{value}</Typography>
                </React.Fragment>
              ))}
            </Box>
            
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Requested Images:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <ImageGrid
                images={Object.entries(selectedRequest.requestedImages).map(([path, url]) => ({ [path]: url }))}
                loading={false}
                showColumnControls={false}
                sx={{ width: '100%' }} />
            </Box>

            {selectedRequest.hardcopyImages && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Hard Copy Images:</Typography>
                <Stack direction="column" spacing={1}>
                  {selectedRequest.hardcopyImages.map((img) => (
                    <Chip
                      key={img}
                      variant="outlined"
                      color="primary"
                      label={img}
                      icon={downloadingImages[img] ? <CircularProgress size={16} /> : <DownloadIcon />}
                      onClick={() => handleImageDownload(img, selectedRequest.requestedImages)}
                      clickable
                    />
                  ))}
                </Stack>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRequest(null)}>Close</Button>
        </DialogActions>
      </>
    )}
  </Dialog>
);

const PreviewPaymentDialog = ({ paymentPreviewOpen, setPaymentPreviewOpen, selectedRequest }) => (
  <Dialog open={paymentPreviewOpen} onClose={() => setPaymentPreviewOpen(false)} maxWidth="md" fullWidth>
    <DialogTitle>Payment Proof</DialogTitle>
    <DialogContent>
      {selectedRequest?.paymentProof && (
        <Box component="img" src={selectedRequest.paymentProof} sx={{ width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain' }} />
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={() => {
        const base64Data = selectedRequest.paymentProof.replace(/^data:image\/\w+;base64,/, "");
        const blob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], {type: 'image/jpeg'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payment-proof-${selectedRequest.username}.jpg`;
        link.click();
        URL.revokeObjectURL(url);
      }}>Download</Button>
      <Button onClick={() => setPaymentPreviewOpen(false)}>Close</Button>
    </DialogActions>
  </Dialog>
);

export default AdminPage;