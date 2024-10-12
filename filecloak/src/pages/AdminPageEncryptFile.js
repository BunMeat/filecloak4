import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth'; // Import Firebase auth functions
import FileCloak from '../FileCloak.webp';
import './AdminPageEncryptFile.css';
import CryptoJS from 'crypto-js';
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

function AdminPageEncryptFile() {
  const navigate = useNavigate();
  const [encryptionKey, setEncryptionKey] = useState('');
  const [note, setNote] = useState(''); // State for a single note input
  const [files, setFiles] = useState([]);
  const [zipFiles, setZipFiles] = useState(false);
  const [encryptedLinks, setEncryptedLinks] = useState([]);
  const [error, setError] = useState('');
  const [fileNames, setFileNames] = useState(''); // State for displaying file names
  const [fileNotes, setFileNotes] = useState([]); // State to hold notes for each file

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

  // Function to handle file change and update file names in state
  const handleFileChange = (event) => {
    const selectedFiles = event.target.files;
    setFiles(selectedFiles);
    
    // Update file names using state
    const fileNamesArray = Array.from(selectedFiles).map(file => file.name).join(', ');
    setFileNames(fileNamesArray);

    // Initialize file notes based on the number of selected files
    setFileNotes(Array.from(selectedFiles).map(() => '')); // Create an array of empty strings
  };

  const handleEncrypt = async (event) => {
    event.preventDefault();
  
    if (!files || files.length === 0) {
      setError('Please select files to upload.');
      return;
    }
  
    if (!encryptionKey) {
      setError('Please provide an encryption key.');
      return;
    }
  
    try {
      const user = auth.currentUser; // Get the current user
      if (user) {
        const idToken = await user.getIdToken(); // Get the ID token
  
        const formData = new FormData();
        for (const file of files) {
          formData.append('files', file);
        }
        formData.append('key', encryptionKey);
        formData.append('zipFiles', zipFiles);
  
        // Include file notes in the form data
        fileNotes.forEach((note, index) => {
          formData.append(`note_${index}`, note); // Append each note with a unique key
        });
  
        const response = await fetch('https://filecloak.vercel.app/api/encryptfile', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`, // Include ID token in the Authorization header
          },
          body: formData,
        });
        const data = await response.json();
  
        if (response.ok) {
          setEncryptedLinks(data.encryptedLinks);
          setError('');
        } else {
          setError(data.message);
        }
      } else {
        setError('User is not authenticated.');
      }
    } catch (error) {
      setError('An error occurred: ' + error.message);
    }
  };

  const handleKeyChange = (event) => {
    const key = event.target.value.slice(0, 64);
    setEncryptionKey(key);
  };

  const handleZipCheckboxChange = () => {
    setZipFiles(!zipFiles); // Toggle the checkbox state
  };

  const exportToTxt = () => {
    const fileData = encryptedLinks.map((link, index) => {
      const fileName = files[index]?.name || `File ${index + 1}`;
      return `File Name: ${fileName}\nEncrypted Token: ${link}\n`;
    }).join('\n');
    
    const exportContent = `Encryption Key: ${encryptionKey}\n\n${fileData}`;
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'encryptedFilesInfo.txt';
    link.click();
  };

  const handleNoteChange = (index, value) => {
    const newFileNotes = [...fileNotes];
    newFileNotes[index] = value; // Update the note for the specific file
    setFileNotes(newFileNotes);
  };

  return (
    <div className='encrypt-file-body'>
      <div className="encrypt-file-container" id="encryptForm">
        <div className="logoutButton">
          <button
            type="button"
            className="logout-btn"
            id="logoutButton"
            onClick={handleLogout}
          >
            Logout
          </button>
          <br />
        </div>
        <header>
          <img src={FileCloak} className="encrypt-file-logo" alt="FileCloak" />
        </header>
        <form className="encrypt-file-form" onSubmit={handleEncrypt}>
          <div className="encrypt-file-panel">
            <div className="file-encryption">
              <h2 className='header2'>Input File</h2>
              <div>
                <button
                  type="button"
                  className="encrypt-text-btn"
                  id="encryptTextButton"
                  onClick={() => navigate('/encrypttext')}
                >
                  Encrypt Text
                </button>
                <br />
              </div>
              <div className="file-input-div">
                <div className="drop-area" id="dropArea">
                  {!fileNames && <p>Drag and drop files or click to select</p>}
                  <input
                    className="file-input"
                    type="file"
                    id="fileInput"
                    name="file"
                    multiple
                    required
                    onChange={handleFileChange}
                  />
                  {fileNames && <p>Files Selected: {fileNames}</p>}
                </div>

                <div className="zip-checkbox-container">
                  <label>
                    <input
                      className="checkbox"
                      type="checkbox"
                      id="zipFilesCheckbox"
                      checked={zipFiles}
                      onChange={handleZipCheckboxChange}
                    />{' '}
                    Zip Files
                  </label>
                </div>
              </div>
              <div>
                <textarea
                  type='text'
                  className='counter'
                  id="keyGen"
                  rows="3"
                  cols="60"
                  placeholder="You can also input a 64 character long key"
                  maxLength="64"
                  value={encryptionKey}
                  onChange={handleKeyChange}
                ></textarea>
                <br />
                <p className='counter-tracker'>
                  <span id="counter">{encryptionKey.length}</span> / 64 characters
                </p>
                <button
                  className='keygen-btn'
                  id="keyGenButton"
                  type="button"
                  onClick={() => setEncryptionKey(CryptoJS.lib.WordArray.random(64).toString())}
                >
                  Generate Key
                </button>
                <br />
                <button
                  className='copy-btn'
                  id="copyButton"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(encryptionKey)}
                >
                  Copy to Clipboard
                </button>
              </div>
              
              {/* Render textareas for notes based on the number of files */}
              {files.length > 0 && (
                <div>
                  <h3>Notes for Files</h3>
                  {Array.from(files).map((_, index) => (
                    <div key={index}>
                      <label>Note for {files[index].name}:</label>
                      <textarea
                        rows="3"
                        cols="50"
                        value={fileNotes[index]}
                        onChange={(e) => handleNoteChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" className="encrypt-btn" id="encryptButton">
                Encrypt
              </button>
              {error && <p className="error-message">{error}</p>}
              {encryptedLinks.length > 0 && (
                <div>
                  {encryptedLinks.map((link, index) => (
                    <div key={index}>
                      <textarea
                        rows="3"
                        cols="80"
                        value={link}
                        readOnly
                        className="encrypted-links-textarea"
                      />
                      <button
                        className="copy-btn"
                        type="button"
                        onClick={() => navigator.clipboard.writeText(link)}
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  ))}

                  {/* Export to TXT button */}
                  <button className="export-btn" type="button" onClick={exportToTxt}>
                    Export to .txt
                  </button>
                </div>
              )}
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
  );
}

export default AdminPageEncryptFile;