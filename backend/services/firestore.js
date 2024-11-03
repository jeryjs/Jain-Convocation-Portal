const admin = require('firebase-admin');
const db = require('../config/firebase');
const { getImageLinks } = require('./onedrive');
const { sendEmail } = require('./email');

// Function to authenticate a user
const authenticateUser = async (username, password) => {
  const snapshot = await db.collection('2024').doc(username).get();
  if (snapshot.exists) {
    const userData = snapshot.data();
    return userData.password == password ? userData : null;
  }
  return null;
};

// Function to retrieve user data
const getUserData = async (username) => {
  const snapshot = await db.collection('2024').doc(username).get();
  return snapshot.exists ? snapshot.data() : null;
};

// Function to update user's requested images and request type
const updateRequest = async (username, requestedImages, type, paymentProof = null) => {
  const dataToUpdate = {
    requestedImages,
    [type]: true, // either 'softcopy' or 'hardcopy'
  };
  if (type === 'hardcopy' && paymentProof) {
    dataToUpdate.paymentProof = paymentProof;
  }

  await db.collection('2024').doc(username).update(dataToUpdate);
  return 'Request updated successfully';
};

const handleImageRequest = async (userdata, course, requestedImages, requestType, paymentProof) => {
  if (!userdata?.username) {
    throw new Error('Invalid user data');
  }

  const userData = {
    ...userdata,
    requestedImages,
    requestType,
    course,
    status: requestType === 'softcopy' ? 'completed' : 'pending'
  };

  if (requestType === 'hardcopy' && paymentProof) {
    userData.paymentProof = paymentProof;
  }

  if (requestType === 'softcopy') {
    const imageLinks = await getImageLinks(course, requestedImages);
    const attachments = imageLinks.map(img => ({
      filename: img.name,
      path: img.url
    }));

    await sendEmail(
      userdata.email,
      'Your Requested Images',
      'Please find your requested images attached.',
      attachments
    );
  }

  // Update user document
  await db.collection('2024').doc(userdata.username).set(userData, { merge: true });

  return {
    success: true,
    message: requestType === 'softcopy' 
      ? 'Images have been sent to your email' 
      : 'Request submitted successfully'
  };
};

module.exports = { authenticateUser, getUserData, updateRequest, handleImageRequest };
