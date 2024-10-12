import React from 'react';
import { useNavigate } from 'react-router-dom';
import FileCloak from '../FileCloak.webp';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <>
      <div className='homepage-body'>
        <div id="landingPage" className="HomePage">
          <header className='homepage-header'>
            <img src={FileCloak} className="HomePage-logo" alt="FileCloak" />
            <nav className='homepage-nav'>
              <button className="button-login" onClick={() => handleNavigation('/login')}>Login</button>
              <button className="button-signup" onClick={() => handleNavigation('/signup')}>Sign Up</button>
            </nav>
          </header>
          <main>
            <section className="intro">
              <h1 className='homepage-welcome'>Welcome to <span className='homepage-span'>FileCloak</span></h1>
              <p className="tagline">Secure Your Files with Advanced Encryption</p>
              <p className="description">Protect your documents with state-of-the-art encryption technology easily accessible through our platform.</p>
              <div className="features">
                <p className="feature">Fast & Secure Encryption</p>
                <p className="feature">User-friendly interface</p>
              </div>
              <button className="button-encrypt-now" onClick={() => handleNavigation('/login')}>Encrypt Now</button>
            </section>
          </main>
          <footer>
            <div className="contact-us">
              <h2 className='contact-us-h2'>Contact Us</h2>
              <p>Email: support@filecloak.com</p>
              <p>Phone: (021) 660 8291</p>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

export default HomePage;
