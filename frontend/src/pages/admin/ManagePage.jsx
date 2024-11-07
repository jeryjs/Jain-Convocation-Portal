import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import {
  Box, Card, Stack, Typography,
  Button, TextField, Dialog,
  DialogTitle, DialogContent,
  DialogActions, Snackbar,
  Alert, CircularProgress,
  IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem,
  ToggleButton, ToggleButtonGroup,
  Tab, Tabs, Paper,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CodeIcon from '@mui/icons-material/Code';
import ViewListIcon from '@mui/icons-material/ViewList';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DataGrid } from '@mui/x-data-grid';
import { REQUEST_TYPE_LABELS } from '../../config/constants';
import PageHeader from '../../components/PageHeader';
import config from '../../config';
import { useAuth } from '../../config/AuthContext';
import LoadingButton from '@mui/lab/LoadingButton';

export default function ManagePage() {
  const { getAuthHeaders } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('ui'); // 'ui' or 'json'
  const [activeTab, setActiveTab] = useState(0);
  const [editingUsers, setEditingUsers] = useState([]);
  const [jsonInput, setJsonInput] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [formMode, setFormMode] = useState('add');
  const [saving, setSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mounted = useRef(false);
  const navigate = useNavigate();

  const defaultUserData = {
    username: '',
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'student',
    requestType: 0,
  };

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    handleRefresh();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/admin/manage`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setSnackbar({ open: true, message: 'Error fetching users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    setIsRefreshing(false);
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
      // Sync JSON when switching modes
      if (newMode === 'json') {
        setJsonInput(JSON.stringify(editingUsers, null, 2));
      } else {
        try {
          const parsed = JSON.parse(jsonInput);
          setEditingUsers(Array.isArray(parsed) ? parsed : [parsed]);
        } catch (e) {
          // Keep existing state if JSON is invalid
        }
      }
    }
  };

  const handleEditClick = (user) => {
    setEditingUsers([user]);
    setActiveTab(0);
    setViewMode('ui');
    setFormMode('edit');
    setDialogOpen(true);
  };

  const handleAddUser = () => {
    setEditingUsers([...editingUsers, { ...defaultUserData }]);
    setActiveTab(editingUsers.length);
  };

  const handleRemoveUser = (index) => {
    const newUsers = editingUsers.filter((_, i) => i !== index);
    setEditingUsers(newUsers);
    setActiveTab(Math.min(activeTab, newUsers.length - 1));
  };

  const handleUserChange = (index, field, value) => {
    const newUsers = [...editingUsers];
    newUsers[index] = { ...newUsers[index], [field]: value };
    setEditingUsers(newUsers);
  };

  const handleDialogOpen = () => {
    // If users are selected, load them for editing
    if (selectionModel.length > 0) {
      const selectedUsers = users.filter(u => selectionModel.includes(u.id));
      setEditingUsers(selectedUsers);
      setJsonInput(JSON.stringify(selectedUsers, null, 2));
    } else {
      // For fresh import, start with empty JSON array
      setEditingUsers([]);
      setJsonInput('[]');
    }
    setFormMode(selectionModel.length > 0 ? 'edit' : 'import');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const usersToSave = viewMode === 'json' ? JSON.parse(jsonInput) : editingUsers;

      const response = await fetch(`${config.API_BASE_URL}/admin/manage/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ users: usersToSave })
      });

      if (!response.ok) throw new Error('Operation failed');

      setSnackbar({ open: true, message: `Users ${formMode === 'import' ? 'imported' : 'updated'} successfully`, severity: 'success' });
      setDialogOpen(false);
      setSelectionModel([]);
      fetchUsers();
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Add selection model to DataGrid
  const [selectionModel, setSelectionModel] = useState([]);

  const UserForm = ({ user, index }) => (
    <Stack spacing={2}>
      <TextField label="Username" value={user.username} required
        onChange={(e) => handleUserChange(index, 'username', e.target.value)}
      />
      <TextField label="Name" value={user.name}
        onChange={(e) => handleUserChange(index, 'name', e.target.value)}
      />
      <TextField label="Email" type="email" value={user.email}
        onChange={(e) => handleUserChange(index, 'email', e.target.value)}
      />
      <TextField label="Password" value={user.password}
        onChange={(e) => handleUserChange(index, 'password', e.target.value)}
      />
      <TextField label="Phone" value={user.phone}
        onChange={(e) => handleUserChange(index, 'phone', e.target.value)}
      />
      <FormControl fullWidth>
        <InputLabel>Role</InputLabel>
        <Select value={user.role} label="Role"
          onChange={(e) => handleUserChange(index, 'role', e.target.value)}
        >
          <MenuItem value="student">Student</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>Request Type</InputLabel>
        <Select value={user.requestType} label="Request Type"
          onChange={(e) => handleUserChange(index, 'requestType', e.target.value)}
        >
          {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={Number(value)}>{label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );

  const columns = [
    { field: 'id', headerName: 'USN', width: 130 },
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'email', headerName: 'Email', width: 180 },
    { field: 'username', headerName: 'Username', width: 130 },
    { field: 'password', headerName: 'Password', width: 130 },
    { field: 'role', headerName: 'Role', width: 100 },
    { field: 'phone', headerName: 'Phone', width: 130 },
    {
      field: 'requestType', headerName: 'Request Type', width: 120,
      renderCell: (params) => REQUEST_TYPE_LABELS[params.value || 0]
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params) => (
        <Tooltip title="Edit">
          <IconButton onClick={() => handleEditClick(params.row)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        pageTitle="Users"
        pageSubtitle="Manage user registrations"
        breadcrumbs={['Admin', 'Manage']}
        onBack={() => navigate('/admin')}
      />

      <Box sx={{ p: 3, width: { md: '90vw' } }}>
        <Stack spacing={3}>
          <Card sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Users List</Typography>
              <Stack direction="row" spacing={2}>
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
                <Button variant="contained" onClick={handleDialogOpen}>
                  {selectionModel.length > 0 ? 'Edit Selected' : 'Import Users'}
                </Button>
              </Stack>
            </Stack>
            <DataGrid
              rows={users}
              columns={columns}
              loading={loading}
              initialState={{
                pagination: { paginationModel: { page: 0, pageSize: 10 } },
                sorting: { sortModel: [{ field: 'username', sort: 'asc' }] },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              checkboxSelection
              onRowSelectionModelChange={(newSelection) => {
                setSelectionModel(newSelection);
              }}
              rowSelectionModel={selectionModel}
            />
          </Card>
        </Stack>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {formMode === 'import' ? 'Import Users' : 'Edit Users'}
            </Typography>
            <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange} size="small">
              <ToggleButton value="ui">
                <Tooltip title="Form View">
                  <ViewListIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="json">
                <Tooltip title="JSON View">
                  <CodeIcon />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {viewMode === 'ui' ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Paper sx={{ borderRadius: 1 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 1 }}>
                  <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable">
                    {editingUsers.map((_, index) => (
                      <Tab key={index} label={`User ${index + 1}`} icon={editingUsers.length > 1 &&
                        <IconButton size="small" onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveUser(index);
                        }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                      />
                    ))}
                  </Tabs>
                  <IconButton onClick={handleAddUser}>
                    <AddIcon />
                  </IconButton>
                </Stack>
              </Paper>
              {editingUsers[activeTab] && (
                <UserForm
                  user={editingUsers[activeTab]}
                  index={activeTab}
                />
              )}
            </Stack>
          ) : (
            <TextField multiline fullWidth rows={20} value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              error={(() => {
                try {
                  JSON.parse(jsonInput);
                  return false;
                } catch {
                  return true;
                }
              })()}
              helperText={(() => {
                try {
                  JSON.parse(jsonInput);
                  return 'Valid JSON format';
                } catch {
                  return 'Invalid JSON format';
                }
              })()}
              sx={{
                '& .MuiInputBase-root': { fontFamily: 'monospace' },
                '& .MuiInputBase-input': { whiteSpace: 'pre !important' },
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <LoadingButton
            onClick={handleSave}
            loading={saving}
            variant="contained"
            disabled={(() => {
              if (loading) return true;
              if (viewMode !== 'json') return false;
              try {
                const parsed = JSON.parse(jsonInput);
                return !Array.isArray(parsed);
              } catch {
                return true;
              }
            })()}
          >
            {formMode === 'import' ? 'Import' : 'Save'}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}