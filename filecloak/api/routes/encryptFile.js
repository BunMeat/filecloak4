// Import necessary modules
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const firebaseAdmin = require('firebase-admin');
const JSZip = require('jszip');
const CryptoJS = require('crypto-js');
const router = express.Router();
const upload = multer();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

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

// Encrypt function
function encrypt(text, key) {
  const encryptKey = CryptoJS.enc.Utf8.parse(key);
  const encryptIV = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(text, encryptKey, { iv: encryptIV }).toString();
  return encrypted + ':' + encryptIV.toString(CryptoJS.enc.Base64);
}

// Convert to WIB timezone function
function convertToWIB(isoString) {
  const date = new Date(isoString);
  const WIB_OFFSET = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
  const wibDate = new Date(date.getTime() + WIB_OFFSET);
  return wibDate.toISOString().replace('Z', '+07:00');
}

// Verify ID token using Firebase Admin SDK
async function verifyIdToken(idToken) {
  try {
    console.log("a");
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    console.log("b");
    return decodedToken; // Returns user data if successful
  } catch (error) {
    console.log("c");
    throw new Error('ID token verification failed');
  }
}


// Store metadata in Firestore
async function storeMetadataInFirestore(userId, encryptedLinks, encryptedNote) {
  try {
    const time = new Date().toISOString();
    const convertedTime = convertToWIB(time);
    const userCollection = collection(firestore, "users");
    const userRefDoc = doc(userCollection, userId);
    const filesSubCollection = collection(userRefDoc, "files");
    const filesSubRefDoc = doc(filesSubCollection, convertedTime);

    const encryptedFilesCollection = collection(firestore, "encryptedFiles");
    const encryptedFilesRefDoc = doc(encryptedFilesCollection, convertedTime);

    // Store all encrypted links
    await setDoc(filesSubRefDoc, { encryptedLinks });
    await setDoc(encryptedFilesRefDoc, { encryptedLinks, encryptedNote });
  } catch (error) {
    throw new Error('Error storing metadata in Firestore: ' + error.message);
  }
}


// Initialize Firebase Admin SDK for Storage
const adminStorage = firebaseAdmin.storage().bucket(); // This uses the Admin SDK to access the bucket

// Handle file upload and encryption
router.post('/', upload.array('files'), async (req, res) => {
  try {
    console.log("1");
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization header is malformed' });
    }
    console.log("2");

    const idToken = authHeader.split('Bearer ')[1];
    const userData = await verifyIdToken(idToken);
    const userId = userData.uid;

    console.log("3");

    const files = req.files;
    const { key, note, zipFiles } = req.body;
    const encryptedLinks = [];
    const zip = new JSZip();

    console.log("4");

    if (!files || !key) {
      return res.status(400).json({ message: 'No files or encryption key provided.' });
    }

    if (zipFiles === 'true') {
      console.log("5");
      for (const file of files) {
        zip.file(file.originalname, file.buffer);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = 'encryptedFiles.zip';
      const storageRef = storage.bucket().file(`uploads/${userId}/${zipName}`);
      await storageRef.save(Buffer.from(await zipBlob.arrayBuffer())); 
      
      const downloadLink = await storageRef.getSignedUrl({ action: 'read', expires: '03-01-2500' });
      const encryptedLink = encrypt(downloadLink[0], key);
      encryptedLinks.push(encryptedLink);
    } else {
      console.log("6");
      for (const file of files) {
        const fileRef = adminStorage.file(`uploads/${userId}/${file.originalname}`);
        await fileRef.save(file.buffer); 
        const [downloadLink] = await fileRef.getSignedUrl({ action: 'read', expires: '03-01-2500' });
        const encryptedLink = encrypt(downloadLink, key);
        encryptedLinks.push(encryptedLink);
      }
    }

    console.log("7");

    const encryptedNote = encrypt(note, key);

    console.log("8");

    // Store metadata in Firestore
    await storeMetadataInFirestore(userId, encryptedLinks[0], encryptedNote);

    console.log("9");


    res.status(200).json({ message: 'Files encrypted successfully.', encryptedLinks });
  } catch (error) {
    console.error('Error during encryption process:', error);
    res.status(500).json({ message: 'An error occurred during the encryption process.' });
  }
});

module.exports = router;