// In-memory cache for settings with fallbacks
let settingsCache = {
    payment: {
        upiId: '',
        amount: '',
        upiLink: ''
    },
    courses: {
        folderId: ''
    },
    general: {
        gmailUser: '',
        gmailAppPass: ''
    }
};

const updateSettingsCache = (newSettings) => {
    // Deep merge new settings with existing cache
    Object.entries(newSettings).forEach(([category, values]) => {
        settingsCache[category] = {
            ...(settingsCache[category] || {}),
            ...values
        };
    });
};

const getSettings = (category) => {
    if (category) {
        // Return category settings with fallback to environment variables for critical settings
        if (category === 'general' && (!settingsCache.general.gmailUser || !settingsCache.general.gmailAppPass)) {
            return {
                gmailUser: settingsCache.general.gmailUser || process.env.GMAIL_USER,
                gmailAppPass: settingsCache.general.gmailAppPass || process.env.GMAIL_APP_PASS
            };
        }
        if (category === 'courses' && !settingsCache.courses.folderId) {
            return {
                folderId: settingsCache.courses.folderId || process.env.ONEDRIVE_SHAREID
            };
        }
        return settingsCache[category] || {};
    }
    return settingsCache;
};

module.exports = { updateSettingsCache, getSettings };