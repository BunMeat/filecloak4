require('dotenv').config();

var express = require('express');
var router = express.Router();
var { initializeApp } = require('firebase/app');
var { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
var { getFirestore, collection, doc, setDoc } = require('firebase/firestore');

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
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

console.log("1");

// Registration API endpoint
router.post('/', async (req, res) => {
  const { email, password, repeatPassword } = req.body;

  if (password !== repeatPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userCollection = collection(firestore, "users");
    const userRefDoc = doc(userCollection, email);
    const userData = {
      uid: user.uid,
      role: "user",
      email: email,
      isBlocked: false,
      attemptNo: 0
    };

    await setDoc(userRefDoc, userData);
    res.status(201).json({ message: 'User registered successfully' });
    res.send("signup is active");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
