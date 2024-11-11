const admin = require("firebase-admin");
const db = require("../config/firebase");
const { cache, TTL } = require("../config/cache");
const { REQUEST_TYPES } = require("../constants");
const { getImageLinks } = require("./onedrive");
const { sendEmail } = require("./email");
const { invalidateCache } = require("../utils/cache.utils");

const COLLECTION_NAME = "2024";

// Function to handle softcopy/hardcopy requests
const handleImageRequest = async (userdata, requestedImages, requestType, paymentProof = null) => {
	return await db.runTransaction(async (transaction) => {
		const userRef = db.collection(COLLECTION_NAME).doc(userdata.username);
		const userSnap = await transaction.get(userRef);

		if (!userSnap.exists) throw new Error("User not found");

		const userData = userSnap.data();
		const currentRequestType = userData?.requestType || REQUEST_TYPES.NONE;

		// Determine new request type
		const newRequestType = currentRequestType !== REQUEST_TYPES.NONE && currentRequestType !== requestType ? REQUEST_TYPES.BOTH : requestType;

		// Prepare update data in one go
		const updateData = {
			requestType: newRequestType,
			requestedImages,
			status: userData.status == "approved" ? userData.status : newRequestType == REQUEST_TYPES.SOFTCOPY ? "completed" : "pending",
			lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
			email: userdata.email ?? "",
			phone: userdata.phone ?? "",
		};

		// Add hardcopy image & payment proof if applicable
		if (requestType === REQUEST_TYPES.HARDCOPY && userdata.hardcopyImages) {
			updateData.hardcopyImages = userdata.hardcopyImages;
		}
		if (paymentProof) updateData.paymentProof = paymentProof;

		// Single update operation
		transaction.update(userRef, updateData);

		// Handle notifications outside transaction to not slow it down
		setImmediate(async () => {
			try {
				if (requestType === REQUEST_TYPES.SOFTCOPY) {
					const imageNames = Object.keys(requestedImages);
					const imageLinks = await getImageLinks(imageNames);
					await sendEmail(
						userdata.email,
						"Your Requested Images",
						`Dear ${userdata.name},\n\nPlease find your requested images attached.\n\nBest regards,\nJain Convocation Team`,
						imageLinks
					);
				} else if (requestType === REQUEST_TYPES.HARDCOPY) {
					await sendEmail(
						userdata.email,
						"Hardcopy Request Confirmation",
						`Dear ${userdata.name},\n\nYour request for hardcopies has been received. Our team will contact you within 24 hours regarding the collection process.\n\nBest regards,\nJain Convocation Team`
					);
				}
			} catch (emailError) {
				console.error("Error sending email:", emailError);
			}
		});

		invalidateCache("requests");

		return {
			success: true,
			id: userdata.username,
			requestType: newRequestType,
			status: updateData.status,
		};
	});
};

// Function to get all requests with status > 0 
const getAllRequests = async () => {
	const cacheKey = "all_requests";
	const cachedRequests = cache.get(cacheKey);

	if (cachedRequests) {
		console.log("📦 Serving cached requests");
		return cachedRequests;
	}

	const snapshot = await db.collection(COLLECTION_NAME).where("requestType", ">", 0).get();

	const requests = snapshot.docs.map((doc) => {
		const data = doc.data();
		return { id: doc.id, ...data };
	});

	cache.set(cacheKey, requests, TTL.REQUESTS);
	return requests;
};

// Update request status
const updateRequestStatus = async (username, status) => {
	// Use transaction for consistency
	await db.runTransaction(async (transaction) => {
		const requestRef = db.collection(COLLECTION_NAME).doc(username);
		const requestDoc = await transaction.get(requestRef);

		if (!requestDoc.exists) throw new Error(`Request ${username} not found`);

		// Update request status
		transaction.update(requestRef, {
			status: status,
			lastUpdated: admin.firestore.Timestamp.now(),
		});
	});

	invalidateCache("user", username);
	invalidateCache("requests");
	return { success: true };
};

module.exports = {
	handleImageRequest,
	getAllRequests,
	updateRequestStatus,
};
