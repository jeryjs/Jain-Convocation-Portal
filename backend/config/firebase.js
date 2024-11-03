const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Path to Firebase service account file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
module.exports = db;
