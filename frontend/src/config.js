const config = {
  API_BASE_URL: location.origin.replace(/:\d+/, ':5000') + '/api',
  QUEUE_API_BASE_URL: location.origin.replace(/:\d+/, ':3000'),
  SHOW_UPLOAD_ALERT: true,
  HARDCOPY_DISABLED: false,
  REMOVE_HARDCOPY: false,
  DEMO_MODE: false,
};

export default config;