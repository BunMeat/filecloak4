import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth'; // Firebase auth functions
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import FileCloak from '../FileCloak.webp';
import './UserPage.css';
import { initializeApp } from 'firebase/app';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp); // Firestore instance

function AdminPageDecrypt() {
  const navigate = useNavigate();

  // States to store the inputs and decrypted data
  const [keyInput, setKeyInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [decryptedURL, setDecryptedURL] = useState('');
  const [decryptedNote, setDecryptedNote] = useState('');
  const [role, setRole] = useState(''); // State to store user role

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Get the user's email
          const userEmail = user.email;
          
          // Fetch the user's Firestore document based on email
          const userDocRef = doc(db, 'users', userEmail); // Assuming user documents are stored by email
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role); // Assuming 'role' field exists in the user document
          } else {
            console.log('No such user document found');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      } else {
        console.log('No user authenticated, redirecting to login');
        navigate('/login');
      }
    });

    return () => unsubscribe();})

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigate('/login');
      })
      .catch((error) => {
        setError('Failed to log out: ' + error.message);
      });
  };

  const handleDecrypt = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken(); // Get the Firebase ID token

        const response = await fetch('https://filecloak4.vercel.app/api/decrypt', {
        // const response = await fetch('http://localhost:4000/api/decrypt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`, // Include ID token in the header
          },
          body: JSON.stringify({
            keyInput: keyInput.trim(),
            tokenInput: tokenInput.trim(),
          }),
        });

        const data = await response.json();
        setLoading(false);

        if (response.ok) {
          setDecryptedURL(data.decryptedURL || '');
          setDecryptedNote(data.decryptedNote || '');

          if (data.decryptedURL && data.decryptedNote) {
            exportToTxt(data.decryptedURL, data.decryptedNote);
          } else if (data.decryptedNote) {
            exportToTxt2(data.decryptedNote);
          }
        } else {
          alert(data.message);
        }
      } else {
        alert('User is not authenticated.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error during decryption:', error);
      alert('Error during decryption.');
      setLoading(false);
    }
  };

  const exportToTxt = (decryptedURL, decryptedNote) => {
    const text = `Decrypted URL: ${decryptedURL}\n\nDecrypted Note: ${decryptedNote}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'decrypted_data.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToTxt2 = (decryptedText) => {
    const text = `Decrypted Text: ${decryptedText}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'decrypted_text.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="userpage-body">
      <div className="userpage-container">
        <div className="logoutButton">
          <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
        <header>
          <img src={FileCloak} className="userpage-logo" alt="FileCloak" />
        </header>
        {role === 'user' && (
          <form className="userpage-form" onSubmit={handleDecrypt}>
            <div className="userpage-panel">
              <div className="file-decryption">
                <h2 className='header2'>Input Key</h2>
                <input
                  type="text"
                  className='user-key-input'
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  required
                />
                <h2 className='header2'>Input Token</h2>
                <input
                  type="text"
                  className='user-token-input'
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  required
                />
                <button type="submit" className='decrypt-btn' disabled={loading}>
                  {loading ? 'Decrypting...' : 'Decrypt'}
                </button>
              </div>
            </div>
          </form>
        )}
        
        {role !== 'user' && (
          <p>You do not belong here.</p>
        )}
      </div>
    </div>
  );
}

export default AdminPageDecrypt;
