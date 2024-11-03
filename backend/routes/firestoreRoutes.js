const express = require('express');
const router = express.Router();
const { 
  authenticateUser, 
  handleImageRequest, 
  getAllRequests, 
  updateRequestStatus,
  getAllUsers,
  importUsers
} = require('../services/firestore');

// Login route
router.post('/login', async (req, res) => {
  const startTime = Date.now();
  const { username, password } = req.body;
  console.log(`🔐 [${new Date().toISOString()}] Login attempt:`);
  console.log(`   👤 User: ${username}`);
  console.log(`   🌐 IP: ${req.ip}`);

  try {
    const userdata = await authenticateUser(username, password);
    const duration = Date.now() - startTime;
    
    if (userdata) {
      console.log(`✅ [${new Date().toISOString()}] Login successful:`);
      console.log(`   👤 User: ${username}`);
      console.log(`   📝 Role: ${userdata.role || 'student'}`);
      console.log(`   ⏱️  Duration: ${duration}ms`);
      res.json({ userdata });
    } else {
      console.log(`❌ [${new Date().toISOString()}] Login failed:`);
      console.log(`   👤 User: ${username}`);
      console.log(`   ❗ Reason: Invalid credentials`);
      console.log(`   ⏱️  Duration: ${duration}ms`);
      res.status(401).send('Invalid credentials');
    }
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Login error:`);
    console.error(`   👤 User: ${username}`);
    console.error(`   🔥 Error: ${error.message}`);
    console.error(`   📚 Stack: ${error.stack}`);
    res.status(500).send('Login failed');
  }
});

// Handle image request route
router.post('/request/:course', async (req, res) => {
  const startTime = Date.now();
  const { userdata, requestedImages, requestType, paymentProof } = req.body;
  const course = req.params.course;

  console.log(`📸 [${new Date().toISOString()}] New image request:`);
  console.log(`   👤 User: ${userdata?.username || 'unknown'}`);
  console.log(`   📚 Course: ${course}`);
  console.log(`   🖼️  Images: ${requestedImages?.length || 0}`);
  console.log(`   📝 Type: ${requestType}`);

  try {
    const result = await handleImageRequest(userdata, course, requestedImages, requestType, paymentProof??'');
    const duration = Date.now() - startTime;

    console.log(`✅ [${new Date().toISOString()}] Image request processed:`);
    console.log(`   🔑 Request ID: ${result?.id || 'unknown'}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);

    res.json(result);
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Image request failed:`);
    console.error(`   👤 User: ${userdata?.username || 'unknown'}`);
    console.error(`   🔥 Error: ${error.message}`);
    console.error(`   📚 Stack: ${error.stack}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin requests route with detailed logging
router.get('/admin/requests', async (req, res) => {
  const startTime = Date.now();
  console.log(`📊 [${new Date().toISOString()}] Fetching admin requests...`);

  try {
    const requests = await getAllRequests();
    const duration = Date.now() - startTime;

    console.log(`✅ [${new Date().toISOString()}] Admin requests fetched:`);
    console.log(`   📝 Count: ${requests?.length || 0}`);
    console.log(`   🔍 First request: ${requests?.[0]?.id || 'none'}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);

    res.json(requests);
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Failed to fetch requests:`);
    console.error(`   🔥 Error: ${error.message}`);
    console.error(`   📚 Stack: ${error.stack}`);
    res.status(500).send('Error fetching requests');
  }
});

// Status update route with detailed logging
router.put('/admin/requests/:requestId/status', async (req, res) => {
  const startTime = Date.now();
  const { requestId } = req.params;
  const { status } = req.body;
  
  console.log(`📝 [${new Date().toISOString()}] Updating request status:`);
  console.log(`   🔑 Request ID: ${requestId}`);
  console.log(`   📊 New Status: ${status}`);

  try {
    const result = await updateRequestStatus(requestId, status);
    const duration = Date.now() - startTime;

    console.log(`✅ [${new Date().toISOString()}] Status updated successfully:`);
    console.log(`   🔑 Request ID: ${requestId}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);

    res.json(result);
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Status update failed:`);
    console.error(`   🔑 Request ID: ${requestId}`);
    console.error(`   🔥 Error: ${error.message}`);
    console.error(`   📚 Stack: ${error.stack}`);
    res.status(500).send('Error updating status');
  }
});

// Add new routes for student management
router.get('/admin/manage', async (req, res) => {
  try {
    const students = await getAllUsers();
    res.json(students);
  } catch (error) {
    console.error('Failed to fetch students:', error);
    res.status(500).send('Error fetching students');
  }
});

router.post('/admin/manage/import', async (req, res) => {
  try {
    const { students } = req.body;
    await importUsers(students);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to import students:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to import students'
    });
  }
});

module.exports = router;
