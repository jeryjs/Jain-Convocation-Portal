export const staticConfig = {
  API_BASE_URL: location.origin.replace(/:\d+/, ':5000') + '/api',
  QUEUE_API_BASE_URL: (process.env.NODE_ENV === 'development' ? location.origin.replace(/:\d+/, ':4102') : "https://face-search." + location.host) + '/api',

  // ==== Server Configurable Settings with Static Defaults ====
  SHOW_UPLOAD_ALERT: false,
  HARDCOPY_DISABLED: false,
  REMOVE_HARDCOPY: false,
  DEMO_MODE: false,
};

let serverConfig = {};
let isReady = false;

const fetchServerConfig = async () => {
  try {
    const res = await fetch(`${staticConfig.API_BASE_URL}/settings/config`);
    if (res.ok) {
      const settings = await res.json();
      serverConfig = settings['config'] || {};
    }
  } catch (error) {
    console.warn('Failed to fetch server config, using static defaults:', error);
  } finally {
    isReady = true;
  }
};

// Initialize fetch immediately and block until ready
const configReadyPromise = fetchServerConfig();

// Proxy handler that merges server settings with static config
const configHandler = {
  get(target, prop) {
    // Always use static values for API URLs
    if (prop === 'API_BASE_URL' || prop === 'QUEUE_API_BASE_URL') {
      return target[prop];
    }
    
    // If server settings loaded and has non-null value, use it
    if (isReady && serverConfig[prop] !== null && serverConfig[prop] !== undefined) {
      return serverConfig[prop];
    }
    
    // Fallback to static config
    return target[prop];
  }
};

const config = new Proxy(staticConfig, configHandler);

// Export ready promise and refresh function
export const waitForConfig = () => configReadyPromise;

export const refreshConfig = async () => {
  serverConfig = {};
  isReady = false;
  await fetchServerConfig();
};

export default config;