const config = {
  API_BASE_URL: location.origin.replace(/:\d+/, ':5000') + '/api',
  QUEUE_API_BASE_URL: location.origin.replace(/:\d+/, ':3000'),
  SHOW_UPLOAD_ALERT: true,
  HARDCOPY_DISABLED: true,
  REMOVE_HARDCOPY: true,
};

export default config;