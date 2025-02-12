import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import FileCloak from '../FileCloak.webp';
import './AdminPageDecryptText.css';
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
const db = getFirestore(firebaseApp); 

function AdminPageDecryptText() {
  const navigate = useNavigate();

  // States to store the inputs and decrypted data
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState(''); 
  const [textToDecrypt, setTextToDecrypt] = useState('');
  const [output, setOutput] = useState('');

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

    const decryptText = async (encryptionToken, keyHex) => {
    try {
      // Extract the IV (last 32 hex characters) and the encrypted note
      const ivHex = encryptionToken.slice(-32); 
      const encryptedBase64 = encryptionToken.slice(0, -32); 
  
      // Convert key and IV from hex to Uint8Array
      const rawKey = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  
      // Convert Base64 ciphertext to Uint8Array
      const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  
      // Import the AES key
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        rawKey,
        { name: "AES-CTR" },
        false,
        ["decrypt"]
      );
  
      // Decrypt the text
      const decryptedTextBytes = await crypto.subtle.decrypt(
        {
          name: "AES-CTR",
          counter: iv,
          length: 128,
        },
        cryptoKey,
        encryptedBytes
      );
  
      return new TextDecoder().decode(decryptedTextBytes);
    } catch (error) {
      console.error("Error decrypting text:", error);
      throw new Error("Failed to decrypt text. Check your key and token.");
    }
  };  

  const handleDecrypt = async (e) => {
    e.preventDefault();
    if (!textToDecrypt || !key) {
      setError('Please enter both text and key.');
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {      
        const decryptedNote = await decryptText(textToDecrypt, key);
        
          setOutput(decryptedNote); 
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
                <h2 className='firstheader2'>Input Key</h2>
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
                  <button type="submit" className="decrypttext-btn" id="decryptButton" disabled={loading}>
                    {loading ? (
                      <div className="loading-spinner"></div> 
                    ) : (
                      "Decrypt"
                    )}
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
