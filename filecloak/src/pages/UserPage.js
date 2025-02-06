import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth'; 
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import FileCloak from '../FileCloak.webp';
import './UserPage.css';
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

function UserPage() {
  const navigate = useNavigate();

  const [keyInput, setKeyInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState(''); 
  const [files, setFiles] = useState([]);
  const [fileNames, setFileNames] = useState(''); 
  const [fileNotes, setFileNotes] = useState([]); 

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

    const hexToUint8Array = (hexString) => {
      if (!/^[\da-fA-F]+$/.test(hexString)) {
        throw new Error('Invalid hex string: Contains non-hex characters');
      }
      const byteArray = new Uint8Array(hexString.length / 2);
      for (let i = 0; i < hexString.length; i += 2) {
        byteArray[i / 2] = parseInt(hexString.slice(i, i + 2), 16);
      }
      return byteArray;
    };

const nameCleaner = (encryptedFileName) => {
  const regex = /(.+)-[\w\d]+\.enc$/; // Matches the name before the last hyphen and ".enc"

  if (encryptedFileName.endsWith('.jpeg')) {
    // Find the part before the last hyphen and ".jpeg"
    const jpegMatch = encryptedFileName.match(/(.+)-[\w\d]+\.jpeg$/);
    if (jpegMatch && jpegMatch[1]) {
      return jpegMatch[1]; // Return the trimmed file name
    }
  }

  const match = encryptedFileName.match(regex);
  if (match && match[1]) {
    return match[1]; // Return the extracted original file name
  }
}

const decryptText = async (encryptionToken, keyHex) => {
  try {
    // Extract the IV (last 32 hex characters) and the encrypted note
    const ivHex = encryptionToken.slice(-32); // Last 32 chars = IV
    const encryptedBase64 = encryptionToken.slice(0, -32); // Remaining part = Base64 ciphertext

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

    // Convert decrypted bytes to string
    return new TextDecoder().decode(decryptedTextBytes);
  } catch (error) {
    console.error("Error decrypting text:", error);
    throw new Error("Failed to decrypt text. Check your key and token.");
  }
};  

const handleDecrypt = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    const user = auth.currentUser;
    if (user) {
      if (files.length === 0) {
        throw new Error('No file selected for decryption.');
      }

      const file = files[0]; // Assuming single file decryption
      const fileArrayBuffer = await file.arrayBuffer();

      const cleanedKey = keyInput.trim();

      // Convert hex input to Uint8Array for key and IV
      const keyArray = hexToUint8Array(cleanedKey.trim());
      const ivHex = tokenInput.slice(-32); 
      const ciphertextHex = tokenInput.slice(0, -32); 
      const iv = hexToUint8Array(ivHex.trim());
      // Import the AES key
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyArray,
        { name: "AES-CTR" },
        false,
        ["decrypt"]
      );

      // Decrypt the file content
      const decryptedArrayBuffer = await crypto.subtle.decrypt(
        {
          name: "AES-CTR",
          counter: iv,
          length: 128, // Block size (128 bits for AES-CTR)
        },
        cryptoKey,
        fileArrayBuffer
      );

      // Create a downloadable file
      const decryptedBlob = new Blob([decryptedArrayBuffer], { type: file.type });
      const url = URL.createObjectURL(decryptedBlob);

      const link = document.createElement('a');
      link.href = url;
      const cleanFileName = nameCleaner(file.name)
      console.log("cleanFileName: ", cleanFileName)
      link.download = cleanFileName
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Release object URL after download
      URL.revokeObjectURL(url);
      
            
      // Create and download the `.txt` file with the decrypted fileNote
      const decryptedNote = await decryptText(tokenInput, keyInput);
      const fileNoteBlob = new Blob([decryptedNote], { type: 'text/plain' });
      const fileNoteUrl = URL.createObjectURL(fileNoteBlob);
      const fileNoteLink = document.createElement('a');
      fileNoteLink.href = fileNoteUrl;
      fileNoteLink.download = `${cleanFileName}_note.txt`; // Name the note file
      document.body.appendChild(fileNoteLink);
      fileNoteLink.click();
      document.body.removeChild(fileNoteLink);
      URL.revokeObjectURL(fileNoteUrl);
              
  
      alert('File decrypted successfully!');
    }
    
  } catch (error) {
    console.error('Error during decryption:', error);
    alert('Error during decryption. Please check your key and token.');
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

  const handleFileChange = (event) => {
    const selectedFiles = event.target.files;
    setFiles(selectedFiles);
    
    // Update file names using state
    const fileNamesArray = Array.from(selectedFiles).map(file => file.name).join(', ');
    setFileNames(fileNamesArray);

    // Initialize file notes based on the number of selected files
    setFileNotes(Array.from(selectedFiles).map(() => '')); // Create an array of empty strings
  };

  return (
    <div className="userpage-body">
      <div className="userpage-container">
        <div className="logoutButton">
          <button type="button" className="logout-btn" onClick={logOut}>Logout</button>
          <br />
        </div>
        <header>
          <img src={FileCloak} className="userpage-logo" alt="FileCloak" onClick={() => navigate('/decrypttext')}/>
        </header>
        {role === 'user' && (
          <form className="userpage-decrypt-form" onSubmit={handleDecrypt}>
            <div className="user-panel">
              
              <div className="file-decryption">
                <div>
                  <button
                    type="button"
                    className="decrypt-text-btn"
                    id="decryptTextButton"
                    onClick={() => navigate('/userpagetext')}
                  >
                    Decrypt Text
                  </button>
                  <br />
                </div>
                <h2 className='header2'>Input An Encrypted File</h2>
                <div className="file-input-div">
                  <div className="drop-area" id="dropArea">
                    {!fileNames && <p>Drag and drop file or click to select</p>}
                    <input
                      className="userfile-input"
                      type="file"
                      id="fileInput"
                      name="file"
                      multiple
                      required
                      onChange={handleFileChange}
                    />
                    {fileNames && <p>File Selected: {fileNames}</p>}
                  </div>
              </div>
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
                <button type="submit" className='userdecryptfile-btn' disabled={loading}>
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
        
        {role !== 'user' && (
          <p>You do not belong here.</p>
        )}
      </div>
    </div>
  );
}

export default UserPage;
