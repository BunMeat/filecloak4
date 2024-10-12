import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth'; // Import Firebase auth functions
import FileCloak from '../FileCloak.webp';
import './AdminPageEncryptText.css';
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

const firebaseApp = initializeApp(firebaseConfig); // Initialize only once
const auth = getAuth(firebaseApp); // Use the firebaseApp for auth

function AdminPageEncryptText() {
  const navigate = useNavigate();
  const [textToEncrypt, setTextToEncrypt] = useState('');
  const [key, setKey] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  // On component mount, check if the user is authenticated
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is authenticated
      } else {
        navigate('/login'); // Redirect to login if user is not authenticated
      }
    });
  
    // Cleanup the subscription on component unmount
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigate('/login');
      })
      .catch((error) => {
        setError('Failed to log out: ' + error.message);
      });
  };

  const handleEncrypt = async (event) => {
    event.preventDefault();
    
    if (!textToEncrypt || !key) {
      setError('Please enter both text and key.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken(); // Get the ID token for auth
      
        const response = await fetch('https://filecloak.vercel.app/api/encrypttext', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}` // Send Firebase auth token
          },
          body: JSON.stringify({ text: textToEncrypt, key }),
        });

        const data = await response.json();

        if (response.ok) {
          setOutput(data.encryptedText); // Set the encrypted text in the output
          setError('');
        } else {
          setError(data.error);
        }
      } else {
        setError('User is not authenticated.');
      }
    } catch (error) {
      setError('An error occurred: ' + error.message);
    }
  };

  return (
    <>
      <div className='encrypt-text-body'>
        <div className="encrypt-text-container" id="encryptForm">
          <div className="logoutButton">
            <button type="button" className="logout-btn" id="logoutButton" onClick={handleLogout}>Logout</button><br/>
          </div>
          <header>
            <img src={FileCloak} className="encrypt-text-logo" alt="FileCloak" />
          </header>
          <form className="encrypt-text-form" onSubmit={handleEncrypt}>
            <div className="encrypt-text-panel">
              <div className="file-encryption">
                <h2>Input Text</h2>
                <div>
                  <textarea
                    id="textToEncrypt"
                    rows="3"
                    cols="50"
                    maxLength="500"
                    placeholder="Input your text"
                    value={textToEncrypt}
                    onChange={(e) => setTextToEncrypt(e.target.value)}
                  /><br/>
                </div>
                <div>
                  <textarea
                    id="keyGen"
                    rows="3"
                    cols="50"
                    maxLength="64"
                    placeholder="You can also input a 64 character long key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                  /><br/>
                  <p className='counter-tracker'><span id="counter">{key.length}</span> / 64 characters</p>
                  <button id="keyGenButton" type="button" onClick={() => setKey(generateKey())}>Generate Key</button><br/>
                  <button id="copyButton" type="button" onClick={() => navigator.clipboard.writeText(key)}>Copy to Clipboard</button>
                </div>
                <div>
                  <textarea
                    id="output"
                    rows="9"
                    cols="50"
                    readOnly
                    value={output}
                  /><br/>
                  <button id="copyButton2" type="button" onClick={() => navigator.clipboard.writeText(output)}>Copy to Clipboard</button>
                </div>
                <button type="submit" className="encrypt-btn">Encrypt</button>
                {error && <p className="error-message">{error}</p>}
              </div>
              <div>
                <div>
                  <button type="button" className="decrypt-btn" id="decryptButton" onClick={() => navigate('/decrypt')}>Decrypt</button><br />
                </div>
                <br />
                <div>
                  <button type="button" className="list-btn" id="listButton" onClick={() => navigate('/datalist')}>List Files</button><br />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Utility function to generate a random 64-character key
function generateKey() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export default AdminPageEncryptText;
