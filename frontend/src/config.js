const config = {
  API_BASE_URL: location.origin.replace(/:\d+/, ':5000') + '/api',
  SHOW_UPLOAD_ALERT: true,
  HARDCOPY_DISABLED: false,
};

export default config;