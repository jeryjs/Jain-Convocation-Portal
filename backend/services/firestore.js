const admin = require('firebase-admin');
const db = require('../config/firebase');
const { getImageLinks } = require('./onedrive');
const { sendEmail } = require('./email');
const { REQUEST_TYPES } = require('../constants');

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
        role: username.endsWith('admin') ? 'admin' : 'student' // Simple role logic
      };
    }
    return null;
  } catch (error) {
    console.error('Auth error:', error);
    throw error;
  }
};

// Function to retrieve user data
const getUserData = async (username) => {
  const snapshot = await db.collection(COLLECTION_NAME).doc(username).get();
  return snapshot.exists ? snapshot.data() : null;
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
  return 'Request updated successfully';
};

const handleImageRequest = async (userdata, course, requestedImages, requestType, paymentProof = '') => {
  try {
    const userRef = db.collection(COLLECTION_NAME).doc(userdata.username);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      throw new Error('User not found');
    }

    const userData = userSnap.data();
    const currentRequestType = userData?.requestType || REQUEST_TYPES.NONE;

    // Determine the new request type
    let newRequestType = requestType;
    
    // If there's an existing different request type, make it BOTH
    if (currentRequestType != REQUEST_TYPES.NONE && currentRequestType != requestType) {
      newRequestType = REQUEST_TYPES.BOTH;
    }

    // If it's a hardcopy request, check if the current status is pending
    if (requestType == REQUEST_TYPES.HARDCOPY && 
        userData.status == 'pending' && 
        (currentRequestType == REQUEST_TYPES.HARDCOPY || currentRequestType == REQUEST_TYPES.BOTH)) {
      throw new Error('You already have an active hardcopy request');
    }

    // Update user document with new request details
    await userRef.update({
      requestType: newRequestType,
      requestedImages,
      course,
      status: 'pending',
      paymentProof: paymentProof || userData.paymentProof,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    // Handle email notifications based on request type
    if (requestType == REQUEST_TYPES.SOFTCOPY) {
      // Get image links and send softcopy email
      const imageLinks = await getImageLinks(course, requestedImages);
      await sendEmail(
        userdata.email,
        'Your Requested Images',
        'Please find your requested images attached.\n\nBest regards,\nJain Convocation Team',
        imageLinks
      );
    } else if (requestType == REQUEST_TYPES.HARDCOPY) {
      // Send hardcopy confirmation email
      await sendEmail(
        userdata.email,
        'Hardcopy Request Confirmation',
        `Dear ${userdata.name},\n\nYour request for hardcopies has been received. Our team will contact you within 24 hours regarding the collection process.\n\nBest regards,\nJain Convocation Team`
      );
    }

    return {
      success: true,
      requestType: newRequestType
    };
  } catch (error) {
    console.error('Error handling image request:', error);
    throw error;
  }
};

const getAllRequests = async () => {
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

      const requestData = requestDoc.data();
      console.log(`📄 Current request data:`, {
        id: username,
        oldStatus: requestData.status,
        newStatus: status,
        username: requestData.username
      });

      // Update request status
      transaction.update(requestRef, {
        status: status,
        lastUpdated: timestamp
      });

      // Update user's request type if completed/rejected
      if (status == 'completed' || status == 'rejected') {
        const userRef = db.collection(COLLECTION_NAME).doc(requestData.username);
        transaction.update(userRef, {
          requestType: REQUEST_TYPES.NONE,
          lastUpdated: timestamp
        });
      }
    });

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

module.exports = { 
  authenticateUser, 
  getUserData, 
  updateRequest, 
  handleImageRequest,
  getAllRequests,
  updateRequestStatus,
  importUsers,
  getAllUsers
};
