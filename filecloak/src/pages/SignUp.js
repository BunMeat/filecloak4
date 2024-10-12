import React from 'react';
import { useNavigate } from 'react-router-dom';
import FileCloak from '../FileCloak.webp';
import './SignUp.css';

function SignUp() {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleSubmit = async (event) => {
    console.log("4")
    event.preventDefault();
    const email = event.target.email.value;
    const password = event.target.password.value;
    const repeatPassword = event.target.repeatPassword.value;

    try {
      console.log("5")
      const response = await fetch('http://localhost:4000/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, repeatPassword }),
      });

      if (response.ok) {
        console.log("6")
        alert('User registered successfully. Please login.');
        handleNavigation('/login');
      } else {
        console.log("7")
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      console.log("8")
      console.error('Error:', error);
      alert('Server error. Please try again later.');
    }
  };

  return (
    <>
      <div className='signup-body'>
        <div className="signup-container" id="registerForm">
          <div className="logo-container">
            <img src={FileCloak} className="logo-container-img" alt="FileCloak" />
          </div>
          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="signup-input-group">
              <input className="signup-email" type="text" id="email" name="email" placeholder="Email" required />
            </div>
            <div className="signup-input-group">
              <input className="signup-password" type="password" id="password" name="password" placeholder="Password" required />
            </div>
            <div className="signup-input-group">
              <input className="signup-repeat-password" type="password" id="repeatPassword" name="repeatPassword" placeholder="Repeat Password" required />
            </div>
            <button type="submit" className="signup-submit">Sign Up</button>
            <button
              className="login-btn-in-signup"
              onClick={(event) => {
                event.preventDefault();
                handleNavigation('/login');
              }}
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default SignUp;
