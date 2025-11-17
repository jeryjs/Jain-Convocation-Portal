const Redis = require('ioredis');

// TTL in seconds
const TTL = {
  SETTINGS: 900, // 15 minutes
  COURSES: 180, // 3 minutes
  USER_DATA: 30, // 30 seconds
  REQUESTS: 300, // 5 minutes
  COMPLETED_REQUESTS: 60 * 60, // 1 hour
};

// Initialize Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

// Wrapper class to mimic node-cache API using Redis
class RedisCacheWrapper {
  constructor(redisClient) {
    this.redis = redisClient;
    this.defaultTTL = 60;
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @param {boolean} returnExpired - Not used in Redis (node-cache compatibility)
   * @returns {Promise<any>} Cached value or undefined
   */
  async get(key, returnExpired = false) {
    try {
      const value = await this.redis.get(key);
      if (value === null) return undefined;
      return JSON.parse(value);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error.message);
      return undefined;
    }
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = null) {
    try {
      const serialized = JSON.stringify(value);
      const ttlToUse = ttl || this.defaultTTL;
      await this.redis.setex(key, ttlToUse, serialized);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete a key from cache
   * @param {string|string[]} keys - Key or array of keys to delete
   * @returns {Promise<number>} Number of keys deleted
   */
  async del(keys) {
    try {
      if (Array.isArray(keys)) {
        if (keys.length === 0) return 0;
        return await this.redis.del(...keys);
      }
      return await this.redis.del(keys);
    } catch (error) {
      console.error(`Cache del error for keys ${keys}:`, error.message);
      return 0;
    }
  }

  /**
   * Get all keys matching a pattern
   * @param {string} pattern - Pattern to match (default: *)
   * @returns {Promise<string[]>} Array of matching keys
   */
  async keys(pattern = '*') {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error(`Cache keys error for pattern ${pattern}:`, error.message);
      return [];
    }
  }

  /**
   * Flush all keys from cache
   * @returns {Promise<boolean>} Success status
   */
  async flushAll() {
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      console.error('Cache flushAll error:', error.message);
      return false;
    }
  }

  /**
   * Close Redis connection
   * @returns {Promise<void>}
   */
  async close() {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Error closing Redis connection:', error.message);
    }
  }
}

// Create cache instance
const cache = new RedisCacheWrapper(redisClient);

// Sync wrapper to maintain backwards compatibility with synchronous code
// This converts async Redis operations to synchronous-looking calls
const cacheSync = new Proxy(cache, {
  get(target, prop) {
    const originalMethod = target[prop];
    
    if (typeof originalMethod === 'function') {
      return function(...args) {
        const result = originalMethod.apply(target, args);
        
        // If it's a Promise, we need to handle it synchronously
        // This is a workaround for existing sync code - returns Promise that can be awaited
        if (result instanceof Promise) {
          // For backwards compatibility, return the promise itself
          // Existing code will need to await or use .then()
          return result;
        }
        
        return result;
      };
    }
    
    return originalMethod;
  }
});

module.exports = {
  cache: cacheSync,
  redisClient,
  TTL,
};