const db = require("../config/firebase");
const { cache, TTL } = require("../config/cache");
const { updateSettingsCache } = require("../config/settings");
const { invalidateCache } = require("../utils/cache.utils");

// Function to get settings from firestore
const getSettings = async (category = "all") => {
	const cacheKey = `settings_${category}2`;
	const cachedSettings = cache.get(cacheKey);

	if (cachedSettings) {
		console.log(`📦 Serving cached settings for category: ${category}`);
		return cachedSettings;
	}

	if (category === "all") {
		const snapshot = await db.collection("settings").get();
		const settings = {};
		
    snapshot.forEach((doc) => settings[doc.id] = doc.data());

		cache.set(cacheKey, settings, TTL.SETTINGS);
		return settings;
	} else {
		const doc = await db.collection("settings").doc(category).get();
		const settings = { [category]: doc.exists ? doc.data() : {} };
		cache.set(cacheKey, settings, TTL.SETTINGS);
		return settings;
	}
};

// Function to update settings
const updateSettings = async (settings) => {
	const batch = db.batch();

	// Update each category
	Object.entries(settings).forEach(([category, categorySettings]) => {
		const docRef = db.collection("settings").doc(category);
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
