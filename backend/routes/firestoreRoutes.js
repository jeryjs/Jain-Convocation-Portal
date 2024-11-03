const express = require('express');
const router = express.Router();
const { authenticateUser, handleImageRequest } = require('../services/firestore');

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`🔐 Login attempt for user: ${username}`);

  try {
    const userdata = await authenticateUser(username, password);
    console.log(userdata ? `✅ Login successful: ${username}` : `❌ Login failed: ${username}`);
    if (userdata) {
      res.json({ userdata });
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).send('Login failed');
  }
});

// Route to handle image requests
router.post('/request/:course', async (req, res) => {
  const { userdata, requestedImages, requestType, paymentProof } = req.body;
  const course = req.params.course;

  console.log(`📸 New ${requestType} request:`);
  console.log(`   User: ${userdata?.username}`);
  console.log(`   Course: ${course}`);
  console.log(`   Images: ${requestedImages.length}`);

  try {
    const result = await handleImageRequest(
      userdata,
      course,
      requestedImages,
      requestType,
      paymentProof
    );
    console.log(`✅ Request processed successfully for ${userdata?.username}`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Request failed for ${userdata?.username}:`, error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to process request'
    });
  }
});

module.exports = router;
