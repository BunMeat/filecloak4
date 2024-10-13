require('dotenv').config();
const express = require('express');
const router = express.Router();
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');

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

// Login API endpoint
router.post('/', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Retrieve the user document from Firestore
    const userDocRef = doc(firestore, 'users', email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const userData = userDoc.data();

    // Check if the user is blocked
    if (userData.attemptNo >= 3) {
      return res.status(403).json({ message: 'User is blocked. Please contact support.' });
    }

    // Attempt to log in the user with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken(); // Get the ID token

    // On successful login, reset the attemptNo and update the Firestore
    await updateDoc(userDocRef, { attemptNo: 0 });

    // Respond with the user role
    res.send("login is active");
    return res.status(200).json({ message: 'Login successful', role: userData.role, token: idToken });

  } catch (error) {
    // Handle Firebase authentication errors
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      // If login fails due to invalid credentials, increment the attempt count
      const userDocRef = doc(firestore, 'users', email);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newAttemptNo = userData.attemptNo + 1;

        // Update the user's attemptNo in Firestore
        await updateDoc(userDocRef, { attemptNo: newAttemptNo });

        // If user has reached 3 failed attempts, block the account
        if (newAttemptNo >= 3) {
          return res.status(403).json({ message: 'User is blocked. Please contact support.' });
        }

        return res.status(401).json({ message: `Invalid password. Attempts: ${newAttemptNo}` });
      }
    }

    // Catch other Firebase Auth errors (e.g., network issues)
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ message: 'Account not found.' });
    }

    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

module.exports = router;
