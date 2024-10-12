require('dotenv').config();
const express = require('express');
const JSZip = require('jszip');
const CryptoJS = require('crypto-js');
const router = express.Router();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseAdmin = require('firebase-admin');

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

// Initialize Firebase Admin (if not already initialized elsewhere)
if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert({
      type: process.env.TYPE,
      project_id: process.env.PROJECT_ID,
      private_key_id: process.env.PRIVATE_KEY_ID,
      private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.CLIENT_EMAIL,
      client_id: process.env.CLIENT_ID,
      auth_uri: process.env.AUTH_URI,
      token_uri: process.env.TOKEN_URI,
      auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
    }),
  });
}

// AES Decrypt function
function decrypt(encryptedText, key) {
  const encryptKey = CryptoJS.enc.Utf8.parse(key);
  const ivString = encryptedText.slice(-24); // Extract the IV
  const encryptIV = CryptoJS.enc.Base64.parse(ivString);
  encryptedText = encryptedText.slice(0, -24); // Remove IV part

  const decrypted = CryptoJS.AES.decrypt(encryptedText, encryptKey, { iv: encryptIV });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

// Firebase Admin token verification
async function verifyIdToken(idToken) {
  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Route for decryption
router.post('/', async (req, res) => {
  const { keyInput, tokenInput } = req.body;

  if (!keyInput || !tokenInput) {
    return res.status(400).json({ message: 'Missing encryption token or key.' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized. No token provided.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    await verifyIdToken(idToken); // Verify Firebase token

    const encryptedFilesCollection = collection(firestore, "encryptedFiles");
    const querySnapshot = await getDocs(encryptedFilesCollection);
    let foundFile = null;

    querySnapshot.forEach((doc) => {
      if (doc.data().encryptUrl === tokenInput) {
        foundFile = doc.data();
      }
    });

    if (foundFile) {
      const decryptedNote = decrypt(foundFile.encryptNote, keyInput);
      return res.status(200).json({ decryptedURL: foundFile.decryptUrl, decryptedNote });
    } else {
      const decryptedNote = decrypt(tokenInput, keyInput); // Decrypt directly if not found
      return res.status(200).json({ decryptedURL: null, decryptedNote });
    }
  } catch (error) {
    console.error('Error during decryption:', error);
    return res.status(500).json({ message: 'Error during decryption: ' + error.message });
  }
});

module.exports = router;
