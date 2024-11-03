const admin = require('firebase-admin');

// Parse the JSON string from the environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_ACCOUNT_KEY_JSON);

// Initialize the Firebase app with the parsed service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
module.exports = db;