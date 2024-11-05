// In-memory cache for settings
let settingsCache = {
  payment: {
    upiId: '',
    amount: '',
    upiLink: ''
  },
  courses: {
    folderId: process.env.ONEDRIVE_SHAREID // Fallback to env variable
  }
};

const updateSettingsCache = (newSettings) => {
  settingsCache = { ...settingsCache, ...newSettings };
};

const getSettings = (category) => {
  return category ? settingsCache[category] : settingsCache;
};

module.exports = { updateSettingsCache, getSettings };