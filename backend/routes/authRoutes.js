
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../services/user');
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

module.exports = router;