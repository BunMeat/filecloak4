import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth'; // Import Firebase auth functions
import { getFirestore, doc, getDoc, setDoc, collection } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import FileCloak from '../FileCloak.webp';
import './AdminPageEncryptFile.css';
import { initializeApp } from 'firebase/app';
import CryptoJS from 'crypto-js';
import JSZip from 'jszip';
import pako from 'pako';


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
const db = getFirestore(firebaseApp); // Firestore instance

function AdminPageEncryptFile() {
  const navigate = useNavigate();
  const [encryptionKey, setEncryptionKey] = useState('');
  const [note, setNote] = useState(''); // State for a single note input
  const [files, setFiles] = useState([]);
  const [zipFiles, setZipFiles] = useState(false);
  const [links, setLinks] = useState([]);
  const [encryptionToken, setEncryptionToken] = useState([]);
  const [error, setError] = useState('');
  const [fileNames, setFileNames] = useState(''); // State for displaying file names
  const [uniqueFileName, setUniqueFileName] = useState(''); // State for displaying file names
  const [fileNote, setFileNote] = useState([]); // State to hold notes for each file
  const [encryptedFileNote, setEncryptedFileNote] = useState([]);
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

    const setupStorage = async () => {
      // Initialize storage and validate other preconditions
      const storage = getStorage(firebaseApp); // Ensure firebaseApp is initialized earlier
      return storage;
    };

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
    setFileNote(Array.from(selectedFiles).map(() => '')); // Create an array of empty strings
  };

  const encryptData = async (data, key) => {
    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(16));
    
    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: "AES-CTR",
        counter: iv,
        length: 128, // Counter length (must be 128 bits for AES-CTR)
      },
      key,
      data
    );
    const ivHex = Array.from(iv).map(byte => byte.toString(16).padStart(2, '0')).join('');

    return {encryptedData, iv, ivHex};
  };

  const processFilesForUpload = async (files, zipFiles, encryptionKeyString) => {

    const formData = new FormData();
    const ivs = []; // Array to store IVs for each file
    const ivHexs = []
    const mimeTypes = []; // Array to store MIME types for each file
  
    // Convert encryption key string to CryptoKey
    const rawKey = new Uint8Array(
      encryptionKeyString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );
    const encryptionKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-CTR" },
      false,
      ["encrypt"]
    );
  
    if (zipFiles == true) {
      // Zip files
      const zip = new JSZip();
      Array.from(files).forEach((file) => {
        zip.file(file.name, file);
      });
    
      const zipBlob = await zip.generateAsync({ type: "blob" });

    
      // Convert Blob to ArrayBuffer
      const zipArrayBuffer = await zipBlob.arrayBuffer();

      // Encrypt the zipped file
      const { encryptedData, iv, ivHex } = await encryptData(
        zipArrayBuffer,
        encryptionKey
      );
      ivs.push(iv); // Store the IV for zipped file
      ivHexs.push(ivHex); // Store the IV for zipped file
      mimeTypes.push("application/x-zip-compressed");
      const randomString = Math.random().toString(36).substring(2, 8); // 6-character random string
    
      // Convert the encrypted data to a Blob and append it to the formData
      const encryptedBlob = new Blob([encryptedData]);
      const uniqueFilename = `encrypted_files.zip-${randomString}.enc`;
      formData.append("files", encryptedBlob, uniqueFilename);
      formData.append(
        "iv",
        Array.from(iv)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      );
      formData.append("mimeType", "application/x-zip-compressed");
    } else {
      // Encrypt each file
      for (const file of files) {
        const fileArrayBuffer = await file.arrayBuffer();
        const { encryptedData, iv, ivHex } = await encryptData(
          fileArrayBuffer,
          encryptionKey
        );
        ivs.push(iv); // Store the IV for zipped file
        ivHexs.push(ivHex); // Store the IV for zipped file
        mimeTypes.push(file.type);
        const randomString = Math.random().toString(36).substring(2, 8); // 6-character random string

        // Construct unique file path
        const uniqueFilename = `${file.name}-${randomString}.enc`;

        // Convert encrypted data to a Blob and append it to the formData
        const encryptedBlob = new Blob([encryptedData], { type: file.type });
        formData.append("files", encryptedBlob, uniqueFilename);

        formData.append(`iv-${file.name}`, ivHex); // Append IV for the file
        formData.append(`mimeType-${file.name}`, file.type); // Append MIME type for the file
      }
    }
  
    return { formData, ivs, ivHexs, mimeTypes }; // Return both formData and IVs
  };
  

  const handleEncrypt = async (event) => {
    event.preventDefault();
    const linkArray = []; // Temporary array to hold encrypted links
    const ivHexArray = []
    const uniqueFileNameArray = []
    const encryptionTokens = []
    if (!encryptionKey) {
      setError('Please provide an encryption key.');
      return;
    }
  
    try {
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        const storage = await setupStorage(); // Ensure storage is ready before proceeding
        const filesArray = Array.from(files);
        const { formData, ivs, ivHexs, mimeTypes } = await processFilesForUpload(files, zipFiles, encryptionKey);
        

      // Upload encrypted files to Firebase Storage
      for (const [key, value] of formData.entries()) {
        if (key.startsWith("files")) {
      
          if (value instanceof File || value instanceof Blob) {
            try {
               // Extract original filename and generate random string
                const filePath = `uploads/${user.email}/${value.name}`;
        
                const storageRef = ref(storage, filePath);
        
                // Upload file with MIME type metadata
                const metadata = { contentType: value.type, contentDisposition: 'attachment', };
                const uploadSnapshot = await uploadBytes(storageRef, value, metadata);
        
                const downloadURL = await getDownloadURL(storageRef);
        
                const index = [...formData.keys()].indexOf(key); // Get the current index
                const iv = ivs[index];
                const ivHex = ivHexs[index];
                const mimeType = mimeTypes[index];
                const noteToEncrypt = (typeof fileNote === 'string' && fileNote.trim()) 
                ? fileNote 
                : 'There is no note attached';

                  const response = await fetch('https://filecloak4.vercel.app/api/encryptfile', {
                  // const response = await fetch('http://localhost:4000/api/encryptfile', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${idToken}` // Send Firebase auth token
                    },
                    body: JSON.stringify({ text: noteToEncrypt, key: encryptionKey, iv: ivHex }),
                  });
          
                  const data = await response.json();
          
                  if (response.ok) {
                    linkArray.push(downloadURL); // Add to the array
                    ivHexArray.push(ivHex);
                    const dateUploaded = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace(' ', 'T');// Current timestamp
                    const fileName = value.name; // Assuming `value.name` contains the filename
                    uniqueFileNameArray.push(fileName);
                    // Upload data to Firestore
                    const userFilesCollectionRef = collection(db, "users", user.email, "files"); // Path: users/{user.email}/files

                    const fileDocRef = doc(userFilesCollectionRef, `${ivHex}`); // Document ID: dateUploaded-fileName

                    console.log("EncryptedFileNote: ", data.encryptedText)
                    const encryptedNote = data.encryptedText
                    await setDoc(fileDocRef, {
                      fileUrl: downloadURL,
                      fileName: fileName,
                      fileType: mimeType,
                      dateUploaded: dateUploaded,
                      encryptedNote: encryptedNote,
                      uploadedBy: user.email, // Optionally store the user who uploaded the file
                    });
                    const encryptionToken = encryptedNote + ':' + ivHex
                    encryptionTokens.push(encryptionToken)
                    // Trigger file download after successfully storing data in Firestore
                    // try {
                    //   const response = await fetch(downloadURL); // Fetch the file
                    //   const blob = await response.blob(); // Convert to Blob

                    //   const link = document.createElement("a");
                    //   link.href = URL.createObjectURL(blob);
                    //   link.download = fileName; // Set correct file name
                    //   document.body.appendChild(link);
                    //   link.click();
                    //   document.body.removeChild(link);
                    // } catch (downloadError) {
                    //   console.error("Failed to download the encrypted file:", downloadError);
                    // }
                    setError('');
                  } else {
                    setError(data.error);
                  }             
                
            } catch (error) {
              console.error("Error during upload or encryption. Please refresh the page:", error);
            }
          }
        }
      }

      setLinks(linkArray);
      setEncryptionToken(encryptionTokens);
      setUniqueFileName(uniqueFileNameArray)
      } else {
        setError('User is not authenticated.');
      }
    } catch (error) {
      setError('An error occurred: ' + error.message);
    }
  };
  

  const handleKeyChange = (event) => {
    const key = event.target.value.slice(0, 64); // Limit to 64 characters
    setEncryptionKey(key);
  };

const generateEncryptionKey = async () => {
  // Generate the encryption key
  const key = await crypto.subtle.generateKey(
    { name: "AES-CTR", length: 256 },
    true, // Exportable key
    ["encrypt", "decrypt"]
  );

  // Export the key as raw data
  const exportedKey = await crypto.subtle.exportKey("raw", key);

  // Convert the raw key to a string (e.g., hexadecimal)
  const keyAsHex = Array.from(new Uint8Array(exportedKey))
    .map(byte => byte.toString(16).padStart(2, '0')) // Convert each byte to hex
    .join('');

  return keyAsHex; // Return the key as a string
};

const handleGenerateKey = async () => {
  const generatedKey = await generateEncryptionKey();
  setEncryptionKey(generatedKey); // Update the textarea with the new key
};

  const handleZipCheckboxChange = () => {
    setZipFiles(!zipFiles); // Toggle the checkbox state
  };

  const exportToTxt = () => {
    // Convert FileList to an array
    const fileArray = Array.from(files);
  
    const fileData = fileArray.map((file, index) => {
      const fileName = uniqueFileName || `File ${index + 1}`;
      const encryptedToken = encryptionToken[index] || 'N/A'; // Get the corresponding encryption token
      const fileLink = links[index] || 'N/A'; // Get the corresponding encrypted link
      return `File Name: ${fileName}\nEncryption Token: ${encryptedToken}\nFile Download Link: ${fileLink}\n`;
    }).join('\n');
  
    const exportContent = `Encryption Key: ${encryptionKey}\n\n${fileData}`;
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'encryptedFilesInfo.txt';
    link.click();
  };
  

  const handleNoteChange = (value) => {
    const fileNote = value; // Update the note for the specific file
    setFileNote(fileNote);
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
        {role === 'admin' && (
          <form className="encrypt-file-form" onSubmit={handleEncrypt}>
            <div className="encrypt-file-panel">
              <div className="file-encryption">
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
                <h2 className='firstheader2'>Input File</h2>
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
                <h2 className='header2'>Key Input</h2>
                  <textarea
                    type='text'
                    className='counter'
                    id="keyGen"
                    rows="3"
                    cols="50"
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
                    onClick={handleGenerateKey}
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
                <div className="note-section">
                <h3>Notes for Files</h3>
                    <textarea
                      rows="3"
                      cols="50"
                      value={fileNote}
                      onChange={(e) => handleNoteChange(e.target.value)}
                    />
                </div>

                <button type="submit" className="encrypt-btn" id="encryptButton">
                  Encrypt
                </button>
                {error && <p className="error-message">{error}</p>}
                {encryptionToken.length > 0 && (
                  <div>
                    {encryptionToken.map((iv, index) => (
                      <div>
                        <h2 className='header2'>Encryption Token</h2>
                        <div key={index}>
                          <textarea
                            rows="3"
                            cols="80"
                            value={iv}
                            readOnly
                            className="encrypted-links-textarea"
                          />
                          <button
                            className="copy-btn"
                            type="button"
                            onClick={() => navigator.clipboard.writeText(iv)}
                          >
                            Copy to Clipboard
                          </button>
                        </div>
                      </div>
                    ))}
                    {links.map((link, index) => (
                      <div>
                        <h2 className='header2'>Encrypted File Download Links</h2>
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
  );
}

export default AdminPageEncryptFile;