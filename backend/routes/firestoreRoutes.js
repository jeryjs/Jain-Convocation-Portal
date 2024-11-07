const express = require('express');
const router = express.Router();
const { 
  authenticateUser, 
  handleImageRequest, 
  getAllRequests, 
  updateRequestStatus,
  getAllUsers,
  importUsers,
  getSettings,
  updateSettings
} = require('../services/firestore');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { generateToken } = require('../services/auth');
const { log } = require('../utils/logUtils');

// Login route
router.post('/login', async (req, res) => {
  const startTime = Date.now();
  const { username, password } = req.body;
  
  log('info', 'LoginAttempt', { username, ip: req.ip });

  try {
    const userdata = await authenticateUser(username, password);
    const duration = Date.now() - startTime;
    
    if (userdata) {
      log('success', 'LoginSuccess', { username, role: userdata.role || 'student', duration });
      const token = generateToken(userdata);
      res.json({ userdata, token });
    } else {
      log('error', 'LoginFailed', { username, reason: 'InvalidCredentials', duration });
      res.status(401).send('Invalid credentials');
    }
  } catch (e) {
    log('error', 'LoginError', { username, error: e.message, stack: e.stack });
    res.status(500).send('Login failed');
  }
});

// Update request route to remove course parameter
router.post('/request', authMiddleware, async (req, res) => {
  const { userdata, requestedImages, requestType, paymentProof } = req.body;

  log('info', 'ImageRequest', { username: userdata?.username, imageCount: Object.keys(requestedImages).length, type: requestType });

  try {
    const result = await handleImageRequest(userdata, requestedImages, requestType, paymentProof??'');
    log('success', 'ImageRequestProcessed', { requestId: result?.id });
    res.json(result);
  } catch (e) {
    log('error', 'ImageRequestFailed', { username: userdata?.username, error: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: e.message });
  }
});

// Admin requests route
router.get('/admin/requests', authMiddleware, adminMiddleware, async (req, res) => {
  log('info', 'FetchingAdminRequests');

  try {
    const requests = await getAllRequests();
    log('success', 'AdminRequestsFetched', { count: requests?.length || 0 });
    res.json(requests);
  } catch (e) {
    log('error', 'FetchRequestsFailed', { error: e.message, stack: e.stack });
    res.status(500).send('Error fetching requests');
  }
});

// Status update route
router.put('/admin/requests/:requestId/status', authMiddleware, adminMiddleware, async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;
  
  log('info', 'UpdateRequestStatus', { requestId, status });

  try {
    const result = await updateRequestStatus(requestId, status);
    log('success', 'StatusUpdateSuccess', { requestId });
    res.json(result);
  } catch (e) {
    log('error', 'StatusUpdateFailed', { requestId, error: e.message, stack: e.stack });
    res.status(500).send('Error updating status');
  }
});

// User management routes
router.get('/admin/manage', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const students = await getAllUsers();
    log('success', 'FetchUsers', { count: students.length });
    res.json(students);
  } catch (error) {
    log('error', 'FetchUsersFailed', { error: error.message });
    res.status(500).send('Error fetching users');
  }
});

// Route to add/edit/import users
router.post('/admin/manage/import', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { users } = req.body;
    log('info', 'ImportingUsers', { count: users.length });
    await importUsers(users);
    log('success', 'UsersImported', { count: users.length });
    res.json({ success: true });
  } catch (error) {
    log('error', 'ImportUsersFailed', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all settings or specific category
router.get('/admin/settings/:category?', authMiddleware, async (req, res) => {
  try {
    const settings = await getSettings(req.params.category || 'all');
    log('success', 'FetchSettings', { category });
    res.json(settings);
  } catch (error) {
    log('error', 'FetchSettingsFailed', { category, error: error.message });
    res.status(500).send('Error fetching settings');
  }
});

// Update settings
router.post('/admin/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    log('info', 'UpdatingSettings');
    await updateSettings(req.body);
    log('success', 'SettingsUpdated');
    res.json({ success: true });
  } catch (error) {
    log('error', 'UpdateSettingsFailed', { error: error.message });
    res.status(500).send('Error updating settings');
  }
});

module.exports = router;
