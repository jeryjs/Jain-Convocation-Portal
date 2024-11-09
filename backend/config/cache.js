const NodeCache = require('node-cache');

// TTL in seconds
const TTL = {
  SETTINGS: 3600, // 1 hour
  COURSES: 180, // 3 minutes
  USER_DATA: 30, // 30 seconds
  SETTINGS: 3600, // 1 hour
};

const cache = new NodeCache({
  stdTTL: 60, // Default TTL
  checkperiod: 120, // Check for expired keys every 2 minutes
});

module.exports = {
  cache,
  TTL,
};