const admin = require('firebase-admin');
const db = require('../config/firebase');

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

module.exports = { authenticateUser, getUserData, updateRequest };
