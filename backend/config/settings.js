// In-memory cache for settings
let settingsCache = {
  payment: {
    upiId: '',
    amount: '',
    upiLink: ''
  },
  courses: {
    folderId: process.env.ONEDRIVE_SHAREID // Fallback to env variable
  },
  general: {
    gmailUser: process.env.GMAIL_USER,
    gmailAppPass: process.env.GMAIL_APP_PASS
  }
};

const updateSettingsCache = (newSettings) => {
  settingsCache = { ...settingsCache, ...newSettings };
};

const getSettings = (category) => {
  return category ? settingsCache[category] : settingsCache;
};

module.exports = { updateSettingsCache, getSettings };