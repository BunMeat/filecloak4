import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore'
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

const firebaseApp = initializeApp(firebaseConfig); 
const auth = getAuth(firebaseApp); 
const db = getFirestore(firebaseApp); 

function DataList() {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [role, setRole] = useState(''); 
  const [loading, setLoading] = useState(false);
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

  // Fetch user role when authenticated
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

    return () => unsubscribe();
  }, [navigate]); // Add dependency array to prevent infinite rerendering

  // Fetch data list
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('https://filecloak4.vercel.app/api/datalist');
        // const response = await fetch('http://localhost:4000/api/datalist');
        const result = await response.json();
        
        // Sort users based on their most recent file's timestamp
        result.forEach(user => {
          user.files.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        });

        // Sort users based on the most recent file timestamp
        result.sort((a, b) => {
          const aLatest = a.files.length ? new Date(a.files[0].timestamp) : 0;
          const bLatest = b.files.length ? new Date(b.files[0].timestamp) : 0;
          return bLatest - aLatest;
        });

        setData(result); // Set the sorted data
      } catch (error) {
        console.error("Error fetching data:", error);
        setError('Error fetching data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // Empty array to ensure it runs only once after the first render

  return (
    <div className='list-body'>
        <div className="list-container" id="listForm">
            <div className="button-row"> 
                <div className="left-buttons"> 
                    <button className="encrypt-btn" onClick={() => navigate('/encryptfile')}>Encrypt</button>
                    <button className="decrypt-btn" onClick={() => navigate('/decrypt')}>Decrypt</button>
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
        {role === 'admin' && (
          <>
            {loading ? (
                <div className="loading-container">
                  <div className="big-loading-spinner"></div>
                </div>
              ) : (
                <ul className='list-ul'>
                  {data.map(item => (
                    <li className='list-li' key={item.email}>
                      <strong>User Email:</strong> {item.email}
                      {item.files.length > 0 ? (
                        <ul>
                          {item.files.map((file, index) => (
                            <li key={index} className='individual-list'>
                              <p>File Name: {file.fileName}</p>
                              <p>File URL: {file.fileUrl}</p>
                              <p>Date Uploaded: {file.dateUploaded}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No files found</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
          </>
        )}
        
        {role !== 'admin' && (
          <p>You do not have admin privileges.</p>
        )}
      </div>
    </div>
  );
}

export default DataList;
