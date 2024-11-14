const express = require('express');
const router = express.Router();
const { handleImageRequest, getAllRequests, updateRequestStatus } = require('../services/request');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { log } = require('../utils/logUtils');

// User request routes
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

// Admin request routes
router.get('/admin/requests', authMiddleware, adminMiddleware, async (req, res) => {
  const { status = ['pending', 'approved'], limit = 100 } = req.query;
  const statusFilter = Array.isArray(status) ? status : [status];
  
  log('info', 'FetchingAdminRequests', { statusFilter });

  try {
    const requests = await getAllRequests(statusFilter, parseInt(limit));
    log('success', 'AdminRequestsFetched', { count: requests?.length || 0, filter: statusFilter });
    res.json(requests);
  } catch (e) {
    log('error', 'FetchRequestsFailed', { error: e.message, stack: e.stack });
    res.status(500).send('Error fetching requests');
  }
});

// Update request status
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

module.exports = router;