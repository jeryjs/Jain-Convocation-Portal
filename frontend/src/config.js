const config = {
  API_BASE_URL: location.origin + '/api',
  userdata: JSON.parse(localStorage.getItem('userdata'))
};
  
export default config;