const config = {
  API_BASE_URL: location.origin.replace(/:\d+/, ':5000') + '/api',
  QUEUE_API_BASE_URL: (process.env.NODE_ENV === 'development' ? location.origin.replace(/:\d+/, ':4102') : "face-search." + location.origin) + '/api',
  SHOW_UPLOAD_ALERT: true,
  HARDCOPY_DISABLED: false,
  REMOVE_HARDCOPY: false,
  DEMO_MODE: false,
};

export default config;