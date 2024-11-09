const express = require('express');
const router = express.Router();
const { getAllUsers, importUsers, deleteUsers } = require('../services/user');
const { getSettings, updateSettings } = require('../services/settings');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { log } = require('../utils/logUtils');

// Routes to get list of all registered users
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

// Route to manage users (import, add or edit)
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

// Route to delete users
router.delete('/admin/manage', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { usernames } = req.body;
    log('info', 'DeletingUsers', { count: usernames.length });
    await deleteUsers(usernames);
    log('success', 'UsersDeleted', { count: usernames.length });
    res.json({ success: true });
  } catch (error) {
    log('error', 'DeleteUsersFailed', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// Routes to get settings for a specific category (or all)
router.get('/admin/settings/:category?', authMiddleware, async (req, res) => {
  const category = req.params.category || 'all';
  try {
    const settings = await getSettings(category);
    log('success', 'FetchSettings', { category });
    res.json(settings);
  } catch (error) {
    log('error', 'FetchSettingsFailed', { category, error: error.message });
    res.status(500).send('Error fetching settings');
  }
});

// Route to update settings
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