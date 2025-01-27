import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import FileCloak from '../FileCloak.webp';
import './Login.css';

// Firebase Configuration (You should hide this using env variables)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const email = event.target.emailLogin.value;
    const revisedEmail = email.toLowerCase()
    const password = event.target.passwordLogin.value;
    const userDocRef = doc(firestore, 'users', revisedEmail);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();

    try {
      if (!userDoc.exists()) {
        setError('Account not found.');
        return;
      }

      // Check if user is blocked
      if (userData.attemptNo >= 3) {
        setError('User is blocked. Please contact support.');
        return;
      }

      // Firebase Auth Sign-In
      const userCredential = await signInWithEmailAndPassword(auth, revisedEmail, password);
      const idToken = await userCredential.user.getIdToken(); // Get ID token if needed

      // Reset attemptNo on successful login
      await updateDoc(userDocRef, { attemptNo: 0 });

      // Store token in localStorage (optional)
      localStorage.setItem('authToken', idToken);

      // Navigate based on user role
      if (userData.role === 'user') {
        alert('Sukses Login');
        handleNavigation('/userpage');
      } else if (userData.role === 'admin') {
        alert('Sukses Login');
        handleNavigation('/encryptfile');
      }
    } catch (error) {
      // Increment attemptNo on failed login
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        const newAttemptNo = userData.attemptNo + 1;
        await updateDoc(userDocRef, { attemptNo: newAttemptNo });

        if (newAttemptNo >= 3) {
          setError('User is blocked. Please contact support.');
        } else {
          setError(`Invalid password. Attempts: ${newAttemptNo}`);
        }
      } else if (error.code === 'auth/user-not-found') {
        setError('Account not found.');
      } else {
        setError('Server error. Please try again later.');
      }
    }
  };

  return (
    <>
      <div className="login-body">
        <div className="login-container" id="loginForm">
          <div className="logo-container">
            <img src={FileCloak} className="login-logo" alt="FileCloak" />
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-input-group">
              <input
                className="login-email"
                type="text"
                id="emailLogin"
                name="emailLogin"
                placeholder="Email"
                required
              />
            </div>
            <div className="login-input-group">
              <input
                className="login-password"
                type="password"
                id="passwordLogin"
                name="passwordLogin"
                placeholder="Password"
                required
              />
            </div>
            <button type="submit" className="login-submit-btn">
              Log In
            </button>
            <button
              className="signup-btn-in-login"
              onClick={(event) => {
                event.preventDefault();
                handleNavigation('/signup');
              }}
            >
              Sign Up
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    </>
  );
}

export default Login;
