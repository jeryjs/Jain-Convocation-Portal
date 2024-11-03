const express = require('express');
const router = express.Router();
const { authenticateUser, getUserData, updateRequest } = require('../services/firestore');


// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const userdata = await authenticateUser(username, password);
    if (userdata) {
      res.json({ userdata });
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Login failed');
  }
});

// Route to submit a request for images
router.post('/request', async (req, res) => {
  const { username, requestedImages, requestType, paymentProof } = req.body;

  try {
    await updateRequest(username, requestedImages, requestType, paymentProof);
    res.send('Request submitted successfully');
  } catch (error) {
    console.error('Request submission error:', error);
    res.status(500).send('Failed to submit request');
  }
});

module.exports = router;
