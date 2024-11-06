import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  Stack,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { REQUEST_TYPE_LABELS } from '../../config/constants';
import PageHeader from '../../components/PageHeader';
import config from '../../config';
import { useAuth } from '../../config/AuthContext';

export default function ManagePage() {
  const { getAuthHeaders } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const mounted  = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/admin/manage`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setStudents(data.map(student => ({
        ...student,
        id: student.username || '',
        requestTypeLabel: REQUEST_TYPE_LABELS[student.requestType || 0]
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
      setSnackbar({ open: true, message: 'Error fetching users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const jsonData = JSON.parse(jsonInput);
      const response = await fetch(`${config.API_BASE_URL}/admin/manage/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ students: jsonData })
      });
      
      if (!response.ok) throw new Error('Import failed');
      
      setSnackbar({ open: true, message: 'Students imported successfully', severity: 'success' });
      setImportDialogOpen(false);
      fetchUsers();
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Error importing students', severity: 'error' });
    }
  };

  const columns = [
    { field: 'username', headerName: 'USN', width: 130 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'email', headerName: 'Email', width: 230 },
    { field: 'password', headerName: 'Password', width: 150 },
    { field: 'role', headerName: 'Role', width: 150 },
    { field: 'course', headerName: 'Course', width: 150 },
    { field: 'requestTypeLabel', headerName: 'Request Type', width: 150 },
    { field: 'lastUpdated', 
      headerName: 'Last Updated', 
      width: 200,
      valueFormatter: (params) => {
        try {
        console.log(params._seconds);
        if (!params?.value) return 'Never';
        // Handle both timestamp and Firestore timestamp objects
        const timestamp = params.value?.seconds 
          ? new Date(params.value.seconds * 1000)
          : new Date(params.value);
        return timestamp.toLocaleString();
        } catch (error) {
          console.error('Error formatting date:', error);
          return 'Unknown';
        }
      }
    }
  ];

  return (
    <>
      <PageHeader
        pageTitle="Students"
        pageSubtitle="Manage student registrations"
        breadcrumbs={['Admin', 'Manage']}
        onBack={() => navigate('/admin')}
      />

      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Card sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Student List</Typography>
              <Button variant="contained" onClick={() => setImportDialogOpen(true)}>
                Import Students
              </Button>
            </Stack>
            <DataGrid
              rows={students}
              columns={columns}
              loading={loading}
              initialState={{
                pagination: { paginationModel: { page: 0, pageSize: 10 } },
                sorting: { sortModel: [{ field: 'username', sort: 'asc' }] },
              }}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              autoHeight
            />
          </Card>
        </Stack>
      </Box>

      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Students</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Paste your JSON data below. Format should be an array of objects with fields:
              username, name, email, course, password
            </Typography>
            <TextField
              multiline
              rows={10}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='[{"username": "22btrca061", "name": "Jery", "email": "jery@gmail.com", "course": "CSE-AI", "password": "28052005"}]'
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleImport} variant="contained">Import</Button>
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
