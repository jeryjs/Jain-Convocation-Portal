const db = require("../config/firebase");
const { cache, TTL } = require("../config/cache");
const { updateSettingsCache } = require("../config/settings");
const { invalidateCache } = require("../utils/cache.utils");

// Function to get settings from firestore
const getSettings = async (category = "all") => {
    const cacheKey = `settings_${category}`;
    const cachedSettings = cache.get(cacheKey);

    if (cachedSettings) {
        console.log(`📦 Serving cached settings for category: ${category}`);
        return cachedSettings;
    }

    try {
        let settings;
        if (category === "all") {
            const snapshot = await db.collection("settings").get();
            settings = {};
            snapshot.forEach((doc) => settings[doc.id] = doc.data());
        } else {
            const doc = await db.collection("settings").doc(category).get();
            settings = { [category]: doc.exists ? doc.data() : {} };
        }
        
        cache.set(cacheKey, settings, TTL.SETTINGS);
        updateSettingsCache(settings); // Update in-memory cache as well
        return settings;
    } catch (error) {
        console.error('Error fetching settings:', error);
        throw error;
    }
};

// Function to update settings
const updateSettings = async (settings) => {
    const batch = db.batch();

    // Update each category
    Object.entries(settings).forEach(([category, categorySettings]) => {
        const docRef = db.collection("settings").doc(category);
        invalidateCache(`settings`, category);
        batch.set(docRef, categorySettings);
    });

    await batch.commit();
    updateSettingsCache(settings); // Update cache after successful save
    invalidateCache("settings");
    return { success: true };
};

module.exports = {
    getSettings,
    updateSettings,
};
