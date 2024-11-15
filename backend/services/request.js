const admin = require("firebase-admin");
const db = require("../config/firebase");
const { cache, TTL } = require("../config/cache");
const { REQUEST_TYPES } = require("../constants");
const { invalidateCache } = require("../utils/cache.utils");

const COLLECTION_NAME = "2024";

// Calculate waiting time for hardcopy requests
const calculateWaitingTime = async () => {
  const approvedRequests = await db.collection(COLLECTION_NAME)
    .where("status", "==", "approved")
    .count()
    .get();

  const count = approvedRequests.data().count;
  const baseWaitingTime = 60; // Base waiting time in minutes
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

		invalidateCache("requests", "pending");
		if (newRequestType === REQUEST_TYPES.HARDCOPY) invalidateCache();

		const waitingTime = requestType === REQUEST_TYPES.HARDCOPY ? await calculateWaitingTime() : 0;

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
const getAllRequests = async (statusFilter = ['pending', 'approved', 'printed'], limit = 100) => {
  // Sort statusFilter to ensure consistent cache keys
  const sortedStatuses = [...statusFilter].sort();
  const cacheKey = `requests_${sortedStatuses.join('_')}`;
  const cachedRequests = cache.get(cacheKey);

  if (cachedRequests) {
    console.log("📦 Serving cached requests");
    return cachedRequests;
  }

  // Base query with requestType > 0
  let query = db.collection(COLLECTION_NAME)
    .where("requestType", ">", 0);

  // Add status filter
  if (statusFilter.length === 1) {
    query = query.where("status", "==", statusFilter[0]);
  } else if (statusFilter.length > 1) {
    // Handle multiple statuses with a separate query for each status
    const promises = statusFilter.map(status => 
      db.collection(COLLECTION_NAME)
		.where("requestType", "!=", 2)
        .where("requestType", ">", 0)
        .where("status", "==", status)
        .orderBy("lastUpdated", "desc")
        .limit(limit)
        .get()
    );

    const snapshots = await Promise.all(promises);
    let requests = [];
    snapshots.forEach(snapshot => {
      requests = [...requests, ...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))];
    });

    // Sort combined results by lastUpdated
    requests.sort((a, b) => b.lastUpdated._seconds - a.lastUpdated._seconds);
    
    // Apply limit to final sorted results
    requests = requests.slice(0, limit);
    
    cache.set(cacheKey, requests, TTL.REQUESTS);
    return requests;
  }

  // For single status or no status filter
  query = query.orderBy("lastUpdated", "desc").limit(limit);

  const snapshot = await query.get();
  const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

	// Clear user cache
	invalidateCache("user", username);
	invalidateCache();	// Clear all cache
	return { success: true };
};

module.exports = {
	handleImageRequest,
	getAllRequests,
	updateRequestStatus,
};
