import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import FileCloak from '../FileCloak.webp';
import './AdminPageEncryptText.css';
import { initializeApp } from 'firebase/app';

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
const db = getFirestore(firebaseApp); 

function AdminPageEncryptText() {
  const navigate = useNavigate();
  const [textToEncrypt, setTextToEncrypt] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState(''); 
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Get the user's email
          const userEmail = user.email;
          
          // Fetch the user's Firestore document based on email
          const userDocRef = doc(db, 'users', userEmail); 
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role); 
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

// Function to encrypt text using AES-CTR
const encryptText = async (plaintext, keyHex) => {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const rawKey = new Uint8Array(
    keyHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
  );

  // Import key for AES-CTR
  const key = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-CTR' },
    false,
    ['encrypt']
  );

  // Encrypt text
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-CTR', counter: iv, length: 128 },
    key,
    encoder.encode(plaintext)
  );

  // Convert encrypted data to Base64
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
  const ivHex = Array.from(iv).map(byte => byte.toString(16).padStart(2, '0')).join('');
  const encryptionToken = encryptedBase64 + ivHex
  return encryptionToken;
};

  const handleEncrypt = async (event) => {
    event.preventDefault();
    
    if (!textToEncrypt || !encryptionKey) {
      setError('Please enter both text and key.');
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {      
        const encryptionToken = await encryptText(textToEncrypt, encryptionKey);
        console.log("encryptionToken: ", encryptionToken);
        setOutput(encryptionToken); 
        setError('');
 
      } else {
        setError('User is not authenticated.');
      }
    } catch (error) {
      setError('An error occurred: ' + error.message);
    } finally {
      setLoading(false); 
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
          {role === 'admin' && (
            <form className="encrypt-text-form" onSubmit={handleEncrypt}>
              <div className="encrypt-text-panel">
                <div className="file-encryption">
                  <div>
                    <button
                      type="button"
                      className="encrypt-text-btn"
                      id="encryptTextButton"
                      onClick={() => navigate('/encryptfile')}
                    >
                      Encrypt File
                    </button>
                    <br />
                  </div>
                  <h2 className='firstheader2'>Input Text</h2>
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
                      value={encryptionKey}
                      onChange={(e) => setEncryptionKey(e.target.value)}
                    /><br/>
                    <p className='counter-tracker'><span id="counter">{encryptionKey.length}</span> / 64 characters</p>
                    <button id="keyGenButton" type="button" onClick={() => setEncryptionKey(generateKey())}>Generate Key</button><br/>
                    <button id="copyButton" type="button" onClick={() => navigator.clipboard.writeText(encryptionKey)}>Copy to Clipboard</button>
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
                  <button type="submit" className="encrypttext-btn" id="encryptButton" disabled={loading}>
                    {loading ? (
                      <div className="loading-spinner"></div> 
                    ) : (
                      "Encrypt"
                    )}
                  </button>
                  {error && <p className="error-message">{error}</p>}
                </div>
                <div>
                  <div>
                    <button type="button" className="decrypt-btn" id="decryptButton" onClick={() => navigate('/decrypt')}>Decrypt</button><br />
                  </div>
                  <br />
                  <div>
                    <button type="button" className="list-btn" id="listButton" onClick={() => navigate('/datalist')}>Move to List</button><br />
                  </div>
                </div>
              </div>
            </form>
          )}
          
          {role !== 'admin' && (
            <p>You do not have admin privileges.</p>
          )}
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
