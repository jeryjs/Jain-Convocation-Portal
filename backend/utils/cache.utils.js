
const { cache } = require('../config/cache');

const invalidateCache = async (type, key = '') => {
  switch (type) {
    case 'user':
      await cache.del(`user_${key}`);
      break;
    case 'requests':
      await cache.del(`requests_${key}`);
      await cache.del('all_requests');
      break;
    case 'settings':
      await cache.del(`settings_${key}`);
      await cache.del('settings_all');
      break;
    default:
      await cache.flushAll();
  }
};

module.exports = { invalidateCache };