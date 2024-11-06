const admin = require('firebase-admin');
const db = require('../config/firebase');
const { getImageLinks } = require('./onedrive');
const { sendEmail } = require('./email');
const { REQUEST_TYPES } = require('../constants');
const { cache, TTL } = require('../config/cache');
const { updateSettingsCache } = require('../config/settings');

const COLLECTION_NAME = '2024';

// Function to authenticate a user
const authenticateUser = async (username, password) => {
  try {
    const userDoc = await db.collection(COLLECTION_NAME).doc(username).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    if (userData.password == password) {
      // Don't send password back to client
      const { password: _, ...userDataWithoutPassword } = userData;
      return {
        ...userDataWithoutPassword,
        username, // Include username explicitly
      };
    }
    return null;
  } catch (error) {
    console.error('Auth error:', error);
    throw error;
  }
};

// Update the getUserData function to handle new image format
const getUserData = async (username) => {
  const cacheKey = `user_${username}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) return cachedData;

  const snapshot = await db.collection(COLLECTION_NAME).doc(username).get();
  if (!snapshot.exists) return null;
  
  const data = {
    ...snapshot.data(),
    username,
    requestedImages: snapshot.data().requestedImages || {}
  };
  
  cache.set(cacheKey, data, TTL.USER_DATA);
  return data;
};

// Add new function for student management
const importUsers = async (students) => {
  try {
    const batch = db.batch();
    
    students.forEach(student => {
      const docRef = db.collection(COLLECTION_NAME).doc(student.username);
      batch.set(docRef, {
        ...student,
        requestType: 0, // Default to no request
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Import students error:', error);
    throw error;
  }
};

// Modify the updateRequest function
const updateRequest = async (username, requestedImages, type, paymentProof = null) => {
  const dataToUpdate = {
    requestedImages,
    requestType: type,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  };
  
  if ([1, 3].includes(type) && paymentProof) { // for HARDCOPY and BOTH
    dataToUpdate.paymentProof = paymentProof;
  }

  await db.collection(COLLECTION_NAME).doc(username).update(dataToUpdate);
  invalidateCache('user', username);
  invalidateCache('requests');
  return 'Request updated successfully';
};

const handleImageRequest = async (userdata, course, requestedImages, requestType, paymentProof = null) => {
  try {
    return await db.runTransaction(async (transaction) => {
      const userRef = db.collection(COLLECTION_NAME).doc(userdata.username);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists) {
        throw new Error('User not found');
      }

      const userData = userSnap.data();
      const currentRequestType = userData?.requestType || REQUEST_TYPES.NONE;

      // Validate request
      if (requestType === REQUEST_TYPES.HARDCOPY && 
          userData.status === 'pending' && 
          (currentRequestType === REQUEST_TYPES.HARDCOPY || currentRequestType === REQUEST_TYPES.BOTH)) {
        throw new Error('You already have an active hardcopy request');
      }

      // Determine new request type
      const newRequestType = (currentRequestType !== REQUEST_TYPES.NONE && 
                            currentRequestType !== requestType) 
        ? REQUEST_TYPES.BOTH 
        : requestType;

      // Prepare update data in one go
      const updateData = {
        course,
        requestType: newRequestType,
        requestedImages,
        status: userData.status == "approved" ? userData.status : newRequestType == REQUEST_TYPES.SOFTCOPY ? 'completed' : 'pending',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        email: userdata.email??'',
        phone: userdata.phone??'',
      };

      // Add hardcopy image if applicable
      if (requestType === REQUEST_TYPES.HARDCOPY && userdata.hardcopyImages) {
        updateData.hardcopyImages = userdata.hardcopyImages;
      }

      if (paymentProof) {
        updateData.paymentProof = paymentProof;
      }

      // Single update operation
      transaction.update(userRef, updateData);

      // Handle notifications outside transaction to not slow it down
      setImmediate(async () => {
        try {
          if (requestType === REQUEST_TYPES.SOFTCOPY) {
            const imageNames = Object.keys(requestedImages);
            const imageLinks = await getImageLinks(course, imageNames);
            await sendEmail(
              userdata.email,
              'Your Requested Images',
              `Dear ${userdata.name},\n\nPlease find your requested images attached.\n\nBest regards,\nJain Convocation Team`,
              imageLinks
            );
          } else if (requestType === REQUEST_TYPES.HARDCOPY) {
            await sendEmail(
              userdata.email,
              'Hardcopy Request Confirmation',
              `Dear ${userdata.name},\n\nYour request for hardcopies has been received. Our team will contact you within 24 hours regarding the collection process.\n\nBest regards,\nJain Convocation Team`
            );
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Don't throw here as the main operation succeeded
        }
      });

      return {
        success: true,
        requestType: newRequestType,
        status: updateData.status
      };
    });

  } catch (error) {
    console.error('Error handling image request:', error);
    throw error;
  }
};

const getAllRequests = async () => {
  const cacheKey = 'all_requests';
  const cachedRequests = cache.get(cacheKey);
  
  if (cachedRequests) {
    console.log('📦 Serving cached requests');
    return cachedRequests;
  }

  console.log(`🔍 [${new Date().toISOString()}] Getting all requests from Firestore...`);
  
  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .where('requestType', '>', 0) // Only get documents with a requestType
      .get();

    // Log the raw data for debugging
    console.log(`📦 Raw request count: ${snapshot.size}`);
    if (snapshot.size > 0) {
      const firstDoc = snapshot.docs[0].data();
      console.log(`📄 Sample request data:`, {
        id: snapshot.docs[0].id,
        username: firstDoc.username,
        timestamp: firstDoc.lastUpdated?.toDate?.(),
        status: firstDoc.status
      });
    }

    const requests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.lastUpdated?.toMillis?.() || data.lastUpdated,
      };
    });

    cache.set(cacheKey, requests, TTL.REQUESTS);
    console.log(`✅ Processed ${requests.length} requests`);
    return requests;

  } catch (error) {
    console.error(`❌ Error fetching requests:`, error);
    throw error;
  }
};

const updateRequestStatus = async (username, status) => {
  console.log(`📝 Updating request ${username} to ${status}...`);
  
  try {
    const timestamp = admin.firestore.Timestamp.now();

    // Use transaction for consistency
    await db.runTransaction(async (transaction) => {
      const requestRef = db.collection(COLLECTION_NAME).doc(username);
      const requestDoc = await transaction.get(requestRef);

      if (!requestDoc.exists) {
        throw new Error(`Request ${username} not found`);
      }

      // Update request status
      transaction.update(requestRef, {
        status: status,
        lastUpdated: timestamp
      });
    });

    invalidateCache('user', username);
    invalidateCache('requests');
    console.log(`✅ Successfully updated request ${username}`);
    return { success: true };

  } catch (error) {
    console.error(`❌ Error updating request:`, error);
    throw error;
  }
};

// Add new function to get all students
const getAllUsers = async () => {
  try {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      username: doc.id,
      id: doc.id // For DataGrid compatibility
    }));
  } catch (error) {
    console.error('Get students error:', error);
    throw error;
  }
};

// Update these functions

const getSettings = async (category = 'all') => {
  const cacheKey = `settings_${category}`;
  const cachedSettings = cache.get(cacheKey);

  if (cachedSettings) {
    console.log(`📦 Serving cached settings for category: ${category}`);
    return cachedSettings;
  }

  try {
    if (category === 'all') {
      const snapshot = await db.collection('settings').get();
      const settings = {};
      snapshot.forEach(doc => {
        settings[doc.id] = doc.data();
      });
      cache.set(cacheKey, settings, TTL.SETTINGS);
      return settings;
    } else {
      const doc = await db.collection('settings').doc(category).get();
      const settings = { [category]: doc.exists ? doc.data() : {} };
      cache.set(cacheKey, settings, TTL.SETTINGS);
      return settings;
    }
  } catch (error) {
    console.error('Error getting settings:', error);
    throw error;
  }
};

const updateSettings = async (settings) => {
  try {
    const batch = db.batch();
    
    // Update each category
    Object.entries(settings).forEach(([category, categorySettings]) => {
      const docRef = db.collection('settings').doc(category);
      batch.set(docRef, categorySettings);
    });

    await batch.commit();
    updateSettingsCache(settings); // Update cache after successful save
    invalidateCache('settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

// Add cache invalidation for updates
const invalidateCache = (type, key = '') => {
  switch (type) {
    case 'user':
      cache.del(`user_${key}`);
      break;
    case 'requests':
      cache.del('all_requests');
      break;
    case 'settings':
      cache.del(`settings_${key}`);
      cache.del('settings_all');
      break;
    default:
      // For major changes, flush all cache
      cache.flushAll();
  }
};

module.exports = { 
  authenticateUser, 
  getUserData, 
  updateRequest, 
  handleImageRequest,
  getAllRequests,
  updateRequestStatus,
  importUsers,
  getAllUsers,
  getSettings,
  updateSettings,
  invalidateCache
};
