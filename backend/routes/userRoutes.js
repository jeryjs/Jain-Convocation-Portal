const express = require('express');
const router = express.Router();
const { authenticateUser, updateUserFeedback } = require('../services/user');
const { generateToken } = require('../utils/authUtils');
const { log } = require('../utils/logUtils');

// Route to authenticate user and generate jwt token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  log('info', 'LoginAttempt', { username, ip: req.ip });

  try {
    const userdata = await authenticateUser(username, password);
    
    if (userdata) {
      log('success', 'LoginSuccess', { username, role: userdata.role || 'student' });
      const token = generateToken(userdata);
      res.json({ userdata, token });
    } else {
      log('error', 'LoginFailed', { username, reason: 'InvalidCredentials' });
      res.status(401).send('Invalid credentials');
    }
  } catch (e) {
    log('error', 'LoginError', { username, error: e.message, stack: e.stack });
    res.status(500).send('Login failed');
  }
});

// Route to get user data
router.get('/user/:username', async (req, res) => {
  const { username } = req.params;
  
  log('info', 'GetUser', { username, ip: req.ip });

  try {
    const userdata = await getUserData(username);
    if (userdata) {
      log('success', 'GetUserSuccess', { username });
      res.json(userdata);
    } else {
      log('error', 'GetUserFailed', { username, reason: 'NotFound' });
      res.status(404).send('User not found');
    }
  } catch (e) {
    log('error', 'GetUserError', { username, error: e.message, stack: e.stack });
    res.status(500).send('Error getting user data');
  }
});

// Route to update user feedback
router.post('/feedback', async (req, res) => {
  const { username, feedback } = req.body;
  
  log('info', 'FeedbackAttempt', { username, ip: req.ip });

  try {
    await updateUserFeedback(username, feedback);
    log('success', 'FeedbackSuccess', { username, feedback });
    res.json({ success: true });
  } catch (e) {
    log('error', 'FeedbackError', { username, error: e.message, stack: e.stack });
    res.status(500).send('Feedback submission failed');
  }
});

module.exports = router;