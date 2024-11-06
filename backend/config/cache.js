const NodeCache = require('node-cache');

// TTL in seconds
const TTL = {
  SETTINGS: 3600, // 1 hour
  COURSES: 60, // 1 minute
  USER_DATA: 30, // 30 seconds
  REQUESTS: 15, // 15 seconds
};

const cache = new NodeCache({
  stdTTL: 60, // Default TTL
  checkperiod: 120, // Check for expired keys every 2 minutes
});

module.exports = {
  cache,
  TTL,
};