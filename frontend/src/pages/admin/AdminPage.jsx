import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { 
  Box, Stack, Card, Typography, Chip,
  IconButton, Tooltip, Tab, Tabs,
  ButtonGroup, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, useTheme,
  CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { 
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  RemoveRedEye as ViewIcon,
  Download as DownloadIcon,
  Person as UserIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CheckCircle,
} from '@mui/icons-material';
import ImageGrid from '../../components/ImageGrid';
import PageHeader from '../../components/PageHeader';
import config from '../../config';
import { REQUEST_TYPES, REQUEST_TYPE_LABELS } from '../../config/constants';

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'medium'
      });
    }
    return 'Invalid Date';
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

const AdminPage = () => {
  const theme = useTheme();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mounted = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    handleRefresh();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/admin/requests`);
      const data = await response.json();
      setRequests(data.map(req => ({
        ...req,
        id: req.username,
        requestDate: formatDate(req.timestamp),
      })));
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/admin/requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Refresh the requests list
      handleRefresh();
      
      setSnackbar({
        open: true,
        message: `Request ${newStatus} successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating status:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error updating request status',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRequests();
    setIsRefreshing(false);
  };

  return (
    <>
      <PageHeader
        pageTitle="Admin Dashboard"
        pageSubtitle="Manage student requests"
        breadcrumbs={['Admin']}
        actionButtons={
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<UserIcon />}
              onClick={() => navigate('/admin/manage')}
              sx={{
                boxShadow: 2,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              Manage Users
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/admin/settings')}
              sx={{
                boxShadow: 2,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              Settings
            </Button>
          </Stack>
        }
      />

      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          <StatsCards requests={requests} theme={theme} />

          <RequestsTable
            requests={requests}
            loading={loading}
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
            handleStatusChange={handleStatusChange}
            setSelectedRequest={setSelectedRequest}
            handleRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            setImagePreviewOpen={setImagePreviewOpen}
          />
        </Stack>
      </Box>

      <RequestDetailsDialog
        selectedRequest={selectedRequest}
        setSelectedRequest={setSelectedRequest}
      />

      <ImagePreviewDialog
        imagePreviewOpen={imagePreviewOpen}
        setImagePreviewOpen={setImagePreviewOpen}
        selectedRequest={selectedRequest}
      />
    </>
  );
};

// StatsCards component
const StatsCards = ({ requests, theme }) => (
  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
    {[
      { label: 'Total Requests', value: requests.length, color: theme.palette.primary.main },
      { label: 'Pending Requests', value: requests.filter(r => r.status === 'pending').length, color: theme.palette.warning.main },
      { label: 'Hard Copy Requests', value: requests.filter(r => r.requestType === REQUEST_TYPES.HARDCOPY || r.requestType === REQUEST_TYPES.BOTH).length, color: theme.palette.secondary.main },
      { label: 'Soft Copy Requests', value: requests.filter(r => r.requestType === REQUEST_TYPES.SOFTCOPY || r.requestType === REQUEST_TYPES.BOTH).length, color: theme.palette.info.main },
    ].map((stat) => (
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

// Move getStatusChip to be a standalone function or helper
const getStatusChip = (status) => {
  const statusConfig = {
    pending: { color: 'warning', label: 'Pending' },
    approved: { color: 'success', label: 'Approved' },
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
  setImagePreviewOpen
}) => {
  const columns = [
    {
      field: 'requestDate',
      headerName: 'Date',
      width: 180,
    },
    {
      field: 'username',
      headerName: 'Student ID',
      width: 130,
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
    },
    {
      field: 'course',
      headerName: 'Course',
      width: 150,
    },
    {
      field: 'requestType',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => {
        let chipColor = 'secondary';
        if (params.value == REQUEST_TYPES.HARDCOPY) {
          chipColor = 'primary';
        } else if (params.value == REQUEST_TYPES.BOTH) {
          chipColor = 'error';
        }
        return (
          <Chip 
            label={REQUEST_TYPE_LABELS[params.value] || 'Unknown'} 
            color={chipColor}
            size="small"
          />
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => getStatusChip(params.value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <ButtonGroup size="small">
          <Tooltip title="View Details">
            <IconButton
              onClick={() => setSelectedRequest(params.row)}
              size="small"
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.requestType !== REQUEST_TYPES.SOFTCOPY && params.row.status == 'pending' && (
            <>
              <Tooltip title="Approve">
                <IconButton
                  onClick={() => handleStatusChange(params.row.username, 'approved')}
                  color="success"
                  size="small"
                >
                  <ApproveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton
                  onClick={() => handleStatusChange(params.row.username, 'rejected')}
                  color="error"
                  size="small"
                >
                  <RejectIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {params.row.status === 'approved' && (
            <Tooltip title="Mark as Completed">
              <IconButton
                onClick={() => handleStatusChange(params.row.username, 'completed')}
                color="info"
                size="small"
              >
                <CheckCircle fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {params.row.paymentProof && (
            <Tooltip title="View Payment Proof">
              <IconButton
                onClick={() => {
                  setSelectedRequest(params.row);
                  setImagePreviewOpen(true);
                }}
                size="small"
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </ButtonGroup>
      ),
    },
  ];

  const filteredRequests = requests.filter(req => {
    if (selectedTab == 'all') return true;
    if (selectedTab == 'pending') return (req.status == 'pending' || req.status == 'approved');
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
          <Tab label="Hard Copy" value="hardcopy" />
          <Tab label="Soft Copy" value="softcopy" />
        </Tabs>
        <Tooltip title="Refresh">
          <IconButton 
            onClick={handleRefresh}
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
            {isRefreshing ? (
              <CircularProgress size={24} />
            ) : (
              <RefreshIcon />
            )}
          </IconButton>
        </Tooltip>
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
              sortModel: [{ field: 'requestDate', sort: 'desc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50]}
        />
      </Box>
    </Card>
  );
};

// Extracted RequestDetailsDialog component
const RequestDetailsDialog = ({ selectedRequest, setSelectedRequest }) => (
  <Dialog
    open={Boolean(selectedRequest)}
    onClose={() => setSelectedRequest(null)}
    maxWidth="sm"
    fullWidth
  >
    <DialogTitle>Request Details</DialogTitle>
    <DialogContent dividers>
      {selectedRequest && (
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
              ['Course', selectedRequest.course],
              ['Request Type', REQUEST_TYPE_LABELS[selectedRequest.requestType]],
              ['Hard Copy Img', selectedRequest.hardcopyImg],
              ['Status', selectedRequest.status],
              ['Date', selectedRequest.requestDate],
            ].map(([label, value]) => (
              <React.Fragment key={label}>
                <Typography color="text.secondary">{label}:</Typography>
                <Typography>{value}</Typography>
              </React.Fragment>
            ))}
          </Box>
          
          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Requested Images
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <ImageGrid
              images={Object.entries(selectedRequest.requestedImages || {})}
              loading={false}
              columns={3}
              showColumnControls={false}
              sx={{ width: '100%' }}
            />
          </Box>
        </Stack>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setSelectedRequest(null)}>Close</Button>
    </DialogActions>
  </Dialog>
);

// Extracted ImagePreviewDialog component
const ImagePreviewDialog = ({ imagePreviewOpen, setImagePreviewOpen, selectedRequest }) => (
  <Dialog
    open={imagePreviewOpen}
    onClose={() => setImagePreviewOpen(false)}
    maxWidth="md"
    fullWidth
  >
    <DialogTitle>Payment Proof</DialogTitle>
    <DialogContent>
      {selectedRequest?.paymentProof && (
        <Box
          component="img"
          src={selectedRequest.paymentProof}
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: '70vh',
            objectFit: 'contain',
          }}
        />
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setImagePreviewOpen(false)}>Close</Button>
    </DialogActions>
  </Dialog>
);

export default AdminPage;