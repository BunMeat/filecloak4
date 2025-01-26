import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth'; // Firebase auth functions
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import FileCloak from '../FileCloak.webp';
import './AdminPageDecryptText.css';
import { initializeApp } from 'firebase/app';
import { Buffer } from 'buffer';

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
const storage = getStorage(firebaseApp)

function AdminPageDecryptText() {
  const navigate = useNavigate();

  // States to store the inputs and decrypted data
  const [key, setKey] = useState('');
  const [decryptedNote, setDecryptedNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState(''); // State to store user role
  const [textToDecrypt, setTextToDecrypt] = useState('');
  const [output, setOutput] = useState('');

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

const handleDecrypt = async (e) => {
  e.preventDefault();
  if (!textToDecrypt || !key) {
    setError('Please enter both text and key.');
    return;
  }

  try {
    const user = auth.currentUser;
    if (user) {
      const idToken = await user.getIdToken(); // Get the ID token for auth
    
      const response = await fetch('https://filecloak4.vercel.app/api/decrypttext', {
      // const response = await fetch('http://localhost:4000/api/decrypttext', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}` // Send Firebase auth token
        },
        body: JSON.stringify({ encryptedText: textToDecrypt, key }),
      });
      console.log("1");

      const data = await response.json();

      if (response.ok) {
        console.log("2")
        setOutput(data.decryptedText); // Set the encrypted text in the output
        setError('');
      } else {
        console.log("3")
        setError(data.error);
      }
    } else {
      setError('User is not authenticated.');
    }
  } catch (error) {
    setError('An error occurred: ' + error.message);
  }
};


  const logOut = async () => {
    signOut(auth)
    .then(() => {
      navigate('/login');
    })
    .catch((error) => {
      setError('Failed to log out: ' + error.message);
    });
  };

  return (
    <div className="decrypt-body">
      <div className="decrypt-container">
        <div className="logoutButton">
          <button type="button" className="logout-btn" onClick={logOut}>Logout</button>
          <br />
        </div>
        <header>
          <img src={FileCloak} className="decrypt-logo" alt="FileCloak" />
        </header>
        {role === 'admin' && (
          <form className="decrypt-form" onSubmit={handleDecrypt}>
            <div className="decrypt-panel">
              <div>
                  <div>
                    <button type="button" className="encrypt-btn" onClick={() => navigate('/encryptfile')}>Encrypt</button><br/>
                  </div>
                  <br/>
                  <div>
                    <button type="button" className="list-btn" onClick={() => navigate('/datalist')}>Move to List</button><br/>
                  </div>
              </div>
              
              <div className="file-decryption">
                <div>
                  <button
                    type="button"
                    className="decrypt-text-btn"
                    id="decryptTextButton"
                    onClick={() => navigate('/decrypt')}
                  >
                    Decrypt File
                  </button>
                  <br />
                </div>
                <h2 className='header2'>Input Key</h2>
                <input
                  type="text"
                  className='admin-key-input'
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required
                />
                <h2 className='header2'>Input Token</h2>
                <input
                  type="text"
                  className='admin-token-input'
                  value={textToDecrypt}
                  onChange={(e) => setTextToDecrypt(e.target.value)}
                  required
                />
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
                <button type="submit" className='decrypt-btn' disabled={loading}>
                  {loading ? 'Decrypting...' : 'Decrypt'}
                </button>
              </div>
            </div>
          </form>
        )}
        
        {role !== 'admin' && (
          <p>You do not have admin privileges.</p>
        )}
      </div>
    </div>
  );
}

export default AdminPageDecryptText;
