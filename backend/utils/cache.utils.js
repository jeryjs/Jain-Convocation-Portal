
const { cache } = require('../config/cache');

const invalidateCache = (type, key = '') => {
  switch (type) {
    case 'user':
      cache.del(`user_${key}`);
      break;
    case 'requests':
      cache.del('all_requests');
      break;
    case 'settings':
      cache.del(`settings_${key}`);
      cache.del('settings_all');
      break;
    default:
      cache.flushAll();
  }
};

module.exports = { invalidateCache };