const NodeCache = require('node-cache');

// TTL in seconds
const TTL = {
  SETTINGS: 900, // 15 minutes
  COURSES: 180, // 3 minutes
  USER_DATA: 30, // 30 seconds
  REQUESTS: 300, // 5 minutes
  COMPLETED_REQUESTS: 60 * 60, // 1 hour
};

const cache = new NodeCache({
  stdTTL: 60, // Default TTL
  checkperiod: 120, // Check for expired keys every 2 minutes
});

module.exports = {
  cache,
  TTL,
};