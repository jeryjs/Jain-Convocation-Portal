const config = {
  API_BASE_URL: location.origin.replace(/:\d+/, ':5000') + '/api',
  userdata: JSON.parse(localStorage.getItem('userdata'))
};
  
export default config;