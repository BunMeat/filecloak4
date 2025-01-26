// Import necessary modules
require('dotenv').config();
var express = require('express');
var multer = require('multer');
var firebaseAdmin = require('firebase-admin');
var CryptoJS = require('crypto-js');
var router = express.Router();
var upload = multer();
var { initializeApp } = require('firebase/app');
var { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const crypto = require('crypto');

const firebaseAdminCredentials = {
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
  universe_domain: process.env.UNIVERSE_DOMAIN,
};

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
};

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(firebaseAdminCredentials),
  storageBucket: process.env.STORAGE_BUCKET, // Your Firebase Storage bucket
});

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const storage = firebaseAdmin.storage();

// // Encrypt function for notes
function encrypt(text, key, IV) {
  // Parse the key and IV from hexadecimal strings
  const encryptKey = CryptoJS.enc.Hex.parse(key);
  const encryptIV = CryptoJS.enc.Hex.parse(IV);

  // Encrypt the text
  const encrypted = CryptoJS.AES.encrypt(text, encryptKey, { iv: encryptIV }).toString();

  // Return the encrypted text (ciphertext only) and IV as a colon-separated string
  return encrypted
}


// Handle note encryption
router.post('/', async (req, res) => {
  const { text, key, iv } = req.body;

  if (!text || !key) {
    return res.status(400).json({ error: 'Text and key are required' });
  }

  try {
    const encryptedText = encrypt(text, key, iv);
    res.status(200).json({ encryptedText });
  } catch (error) {
    console.error('Encryption failed', error);
    res.status(500).json({ error: 'Encryption failed' });
  }
});
module.exports = router;