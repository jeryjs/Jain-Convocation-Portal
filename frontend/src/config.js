const config = {
  API_BASE_URL: location.origin.replace(/:\d+/, ':5000') + '/api',
  SHOW_UPLOAD_ALERT: true,
  HARDCOPY_DISABLED: true,
};

export default config;