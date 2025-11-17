const express = require('express');
const router = express.Router();
const { cache, redisClient } = require('../config/cache');

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify secret key
const verifySecret = (req, res, next) => {
  const { key } = req.query;
  
  if (!key || key !== JWT_SECRET) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized: Invalid key' 
    });
  }
  
  next();
};

// GET /api/cache/invalidate/all - Flush all cache
router.get('/invalidate/all', verifySecret, async (req, res) => {
  try {
    await cache.flushAll();
    console.log('🗑️ All cache invalidated');
    res.json({ 
      success: true, 
      message: 'All cache cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing all cache:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing cache',
      error: error.message 
    });
  }
});

// GET /api/cache/invalidate/settings - Clear all settings cache
router.get('/invalidate/settings', verifySecret, async (req, res) => {
  try {
    const keys = await cache.keys('settings_*');
    if (keys.length > 0) {
      await cache.del(keys);
    }
    console.log(`🗑️ Invalidated ${keys.length} settings cache keys`);
    res.json({ 
      success: true, 
      message: `Cleared ${keys.length} settings cache keys`,
      keys 
    });
  } catch (error) {
    console.error('Error clearing settings cache:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing settings cache',
      error: error.message 
    });
  }
});

// GET /api/cache/invalidate/courses - Clear all courses cache
router.get('/invalidate/courses', verifySecret, async (req, res) => {
  try {
    const keys = await cache.keys('courses_*');
    if (keys.length > 0) {
      await cache.del(keys);
    }
    console.log(`🗑️ Invalidated ${keys.length} courses cache keys`);
    res.json({ 
      success: true, 
      message: `Cleared ${keys.length} courses cache keys`,
      keys 
    });
  } catch (error) {
    console.error('Error clearing courses cache:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing courses cache',
      error: error.message 
    });
  }
});

// GET /api/cache/invalidate/requests - Clear all requests cache
router.get('/invalidate/requests', verifySecret, async (req, res) => {
  try {
    const keys = await cache.keys('requests_*');
    const allRequestsKey = 'all_requests';
    const allKeys = [...keys, allRequestsKey];
    
    if (allKeys.length > 0) {
      await cache.del(allKeys);
    }
    console.log(`🗑️ Invalidated ${allKeys.length} requests cache keys`);
    res.json({ 
      success: true, 
      message: `Cleared ${allKeys.length} requests cache keys`,
      keys: allKeys 
    });
  } catch (error) {
    console.error('Error clearing requests cache:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing requests cache',
      error: error.message 
    });
  }
});

// GET /api/cache/invalidate/users - Clear all users cache
router.get('/invalidate/users', verifySecret, async (req, res) => {
  try {
    const keys = await cache.keys('user_*');
    if (keys.length > 0) {
      await cache.del(keys);
    }
    console.log(`🗑️ Invalidated ${keys.length} user cache keys`);
    res.json({ 
      success: true, 
      message: `Cleared ${keys.length} user cache keys`,
      keys 
    });
  } catch (error) {
    console.error('Error clearing users cache:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing users cache',
      error: error.message 
    });
  }
});

// GET /api/cache/invalidate/key/:key - Clear specific cache key
router.get('/invalidate/key/:key', verifySecret, async (req, res) => {
  try {
    const { key } = req.params;
    const deleted = await cache.del(key);
    console.log(`🗑️ Invalidated cache key: ${key}`);
    res.json({ 
      success: true, 
      message: deleted > 0 ? `Cleared cache key: ${key}` : `Key not found: ${key}`,
      deleted: deleted > 0 
    });
  } catch (error) {
    console.error('Error clearing cache key:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing cache key',
      error: error.message 
    });
  }
});

// GET /api/cache/keys - List all cache keys (with optional pattern)
router.get('/keys', verifySecret, async (req, res) => {
  try {
    const { pattern = '*' } = req.query;
    const keys = await cache.keys(pattern);
    console.log(`📋 Listed ${keys.length} cache keys matching pattern: ${pattern}`);
    res.json({ 
      success: true, 
      count: keys.length,
      keys 
    });
  } catch (error) {
    console.error('Error listing cache keys:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error listing cache keys',
      error: error.message 
    });
  }
});

// GET /api/cache/stats - Get Redis stats
router.get('/stats', verifySecret, async (req, res) => {
  try {
    const info = await redisClient.info('stats');
    const keyspace = await redisClient.info('keyspace');
    const memory = await redisClient.info('memory');
    
    res.json({ 
      success: true, 
      redis: {
        stats: info,
        keyspace: keyspace,
        memory: memory
      }
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting cache stats',
      error: error.message 
    });
  }
});

module.exports = router;
