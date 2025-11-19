const admin = require("firebase-admin");
const db = require("../config/firebase");
const { cache, TTL } = require("../config/cache");
const { REQUEST_TYPES } = require("../constants");
const { invalidateCache } = require("../utils/cache.utils");

const COLLECTION_NAME = "2025";

// Calculate waiting time for hardcopy requests
const calculateWaitingTime = async () => {
  const approvedRequests = await db.collection(COLLECTION_NAME)
    .where("status", "==", "approved")
    .count()
    .get();

  const count = approvedRequests.data().count;
  const baseWaitingTime = 90; // Base waiting time in minutes
  const additionalTime = Math.floor(count / 50) * 15; // Add 15 mins for every 50 requests
  return baseWaitingTime + additionalTime;
};

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

		await invalidateCache("requests", "pending");
		if (requestType == REQUEST_TYPES.HARDCOPY) await invalidateCache();

		const waitingTime = requestType == REQUEST_TYPES.HARDCOPY ? await calculateWaitingTime() : 0;

		return {
			success: true,
			id: userdata.username,
			requestType: newRequestType,
			status: updateData.status,
			waitingTime
		};
	});
};

// Function to get all requests with status > 0 
const getAllRequests = async (statusFilter = ['pending', 'approved', 'printed'], limit = 100, includeSoftcopy = false) => {
  const cacheKey = `requests_${statusFilter.sort().join('_')}_${includeSoftcopy}`;
  const cachedRequests = await cache.get(cacheKey);

  if (cachedRequests) {
    console.log("📦 Serving cached requests");
    return cachedRequests;
  }

  try {
    let query = db.collection(COLLECTION_NAME)
      .where("requestType", ">", 0)
      .where("status", "in", statusFilter);

    if (!includeSoftcopy) query = query.where("requestType", "!=", 2);

    query = query.orderBy("lastUpdated", "desc").limit(limit);
    const snapshot = await query.get();
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    await cache.set(cacheKey, requests, TTL.REQUESTS);
    return requests;

  } catch (error) {
    console.error('Error in getAllRequests:', error);
    if (error.code === 'failed-precondition') {
      console.log('Missing index - create composite index for:', {
        collection: COLLECTION_NAME,
        fields: ['requestType', 'status', 'lastUpdated']
      });
    }
    
    const expiredCache = await cache.get(cacheKey, true);
    if (expiredCache) {
      console.log("⚠️ Serving expired cache due to error");
      return expiredCache;
    }

    throw error;
  }
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

	// Clear user cache
	await invalidateCache("user", username);
	await invalidateCache();	// Clear all cache
	return { success: true };
};

module.exports = {
	handleImageRequest,
	getAllRequests,
	updateRequestStatus,
};
