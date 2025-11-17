const admin = require("firebase-admin");
const db = require("../config/firebase");
const { cache, TTL } = require("../config/cache");
const { invalidateCache } = require("../utils/cache.utils");

const COLLECTION_NAME = "2025";

// Function to authenticate user
const authenticateUser = async (username, password) => {
	const userDoc = await db.collection(COLLECTION_NAME).doc(username).get();

	if (!userDoc.exists) return null;

	const userData = userDoc.data();
	if (userData.password == password) {
		// Don't send password back to the client
		const { password: _, ...userDataWithoutPassword } = userData;
		return {
			...userDataWithoutPassword,
			username,
		};
	}
	return null;
};

// Get user data by username
const getUserData = async (username) => {
	const cacheKey = `user_${username}`;
	const cachedData = await cache.get(cacheKey);

	if (cachedData) return cachedData;

	const snapshot = await db.collection(COLLECTION_NAME).doc(username).get();
	if (!snapshot.exists) return null;

	const data = {
		...snapshot.data(),
		username,
		requestedImages: snapshot.data().requestedImages || {},
	};

	await cache.set(cacheKey, data, TTL.USER_DATA);
	return data;
};

// Update user feedback
const updateUserFeedback = async (username, feedback) => {
	const docRef = db.collection(COLLECTION_NAME).doc(username);
	await docRef.update({
		feedback,
		lastUpdated: admin.firestore.Timestamp.now(),
	});
	invalidateCache(`user_${username}`);
	return { success: true };
};

// Function to get all users
const getAllUsers = async () => {
	const snapshot = await db.collection(COLLECTION_NAME).get();
	return snapshot.docs.map((doc) => ({
		...doc.data(),
		username: doc.id,
		id: doc.id,
	}));
};

// Function to manage users (import, edit, add)
const importUsers = async (users) => {
	if (!Array.isArray(users) || users.length === 0) throw new Error("Invalid users data: must be a non-empty array");

	const batch = db.batch();

	users.forEach((user) => {
		if (!user.username) throw new Error("Each user must have a username");
		const docRef = db.collection(COLLECTION_NAME).doc(user.username);

		// Remove undefined fields
		const cleanUser = Object.entries(user).reduce((acc, [key, value]) => {
			if (value !== undefined) acc[key] = value;
			return acc;
		}, {});

		batch.set(docRef, {
			...cleanUser,
			lastUpdated: admin.firestore.Timestamp.now(),
		});
	});

	await batch.commit();
	invalidateCache("requests");
	return { success: true };
};

// Function to delete users
const deleteUsers = async (usernames) => {
	if (!Array.isArray(usernames) || usernames.length === 0) {
		throw new Error("Invalid usernames: must be a non-empty array");
	}

	const batch = db.batch();
	usernames.forEach(username => {
		const docRef = db.collection(COLLECTION_NAME).doc(username);
		batch.delete(docRef);
	});

	await batch.commit();
	usernames.forEach(username => {
		const cacheKey = `user_${username}`;
		cache.del(cacheKey);
	});
	invalidateCache("requests");
	return { success: true };
};

module.exports = {
	authenticateUser,
	getUserData,
	updateUserFeedback,
	getAllUsers,
	importUsers,
	deleteUsers,
};
