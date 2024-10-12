import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import FileCloak from '../FileCloak.webp';
import './GetDataList.css'

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

function DataList() {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigate('/login');
      })
      .catch((error) => {
        setError('Failed to log out: ' + error.message);
      });
  };

  useEffect(() => {
    // Fetch data from your backend API
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:4000/datalist');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  // Sort users by their most recent file's timestamp
  data.forEach(user => {
    user.files.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  });

  // Sort users based on the most recent file timestamp
  data.sort((a, b) => {
    const aLatest = a.files.length ? new Date(a.files[0].timestamp) : 0;
    const bLatest = b.files.length ? new Date(b.files[0].timestamp) : 0;
    return bLatest - aLatest;
  });

  return (
    <div className='list-body'>
        <div className="list-container" id="listForm">
            <div class="button-row">
                <div class="left-buttons">
                    <button class="encrypt-btn" onClick={() => navigate('/encryptfile')}>Encrypt</button>
                    <button class="decrypt-btn" onClick={() => navigate('/decrypt')}>Decrypt</button>
                </div>
                <div className="right-button">
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
            </div>
        <header>
            <img src={FileCloak} className="list-logo" alt="FileCloak" />
        </header>
        <h1>Data List</h1>
        <ul className='list-ul'>
            {data.map(item => (
            <li className='list-li' key={item.email}>
                <strong>User Email:</strong> {item.email}
                {item.files.length > 0 ? (
                <ul>
                    {item.files.map((file, index) => (
                    <li key={index}>
                        <p>Encryption Token: {file.encryptUrl}</p>
                        <p>Date: {file.timestamp}</p>
                    </li>
                    ))}
                </ul>
                ) : (
                <p>No files found</p>
                )}
            </li>
            ))}
        </ul>
        </div>
    </div>
  );
}

export default DataList;
