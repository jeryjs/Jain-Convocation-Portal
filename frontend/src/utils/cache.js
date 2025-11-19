const CACHE_CONFIG = {
  courses: { ttl: 10 * 60 * 1000 }, // 10 minutes
  gallery: { ttl: 20 * 60 * 1000 }  // 20 minutes
};

export const cacheManager = {
  get: (key) => {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;

      const { value, timestamp, retryCount = 0 } = JSON.parse(item);
      const ttl = CACHE_CONFIG[key]?.ttl;

      // Don't use cache if retry count >= 3 or TTL expired
      if (retryCount >= 3 || (ttl && Date.now() - timestamp > ttl)) {
        sessionStorage.removeItem(key);
        return null;
      }

      return value;
    } catch {
      return null;
    }
  },

  set: (key, value, retry = false) => {
    try {
      const existing = sessionStorage.getItem(key);
      const retryCount = retry && existing ? JSON.parse(existing).retryCount + 1 : 0;

      sessionStorage.setItem(key, JSON.stringify({
        value,
        timestamp: Date.now(),
        retryCount
      }));
    } catch {
      // Ignore storage errors
    }
  }
};
