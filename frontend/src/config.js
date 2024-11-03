const config = {
  API_BASE_URL: location.origin.replace(/:\d+/, ':5000') + '/api',
  
  getUserData: () => {
    return JSON.parse(localStorage.getItem('userdata'));
  },

  setUserData: (data) => {
    localStorage.setItem('userdata', JSON.stringify(data));
  },

  clearUserData: () => {
    localStorage.removeItem('userdata');
  },
};
  
export default config;