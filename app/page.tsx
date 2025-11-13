'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowLogin(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <main style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: '#ffffff'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2.5rem'
      }}>
        {/* Logo */}
        <img 
          src="/SOJIO_LOGO.png"
          alt="SOJIO"
          className="fade-in-down"
          style={{
            width: '280px',
            height: 'auto',
            marginBottom: '1rem',
            animation: 'fadeInDown 1s ease-out'
          }}
        />

        {/* Slogan */}
        <h1 
          className="fade-in-down"
          style={{
            fontSize: '1.125rem',
            fontWeight: '500',
            color: '#498AC6',
            letterSpacing: '0.1em',
            margin: 0,
            marginTop: '-30px',
            marginLeft: '40px',
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif',
            animation: 'fadeInDown 1s ease-out 0.2s',
            animationFillMode: 'both'
          }}
        >
          MANAGE CLEANING EASIER
        </h1>

        {/* Login Link */}
        <a 
          href="/login" 
          className="login-link"
          style={{ 
            fontSize: '1.125rem',
            fontWeight: '500',
            color: '#498AC6',
            fontFamily: 'Arial, sans-serif',
            letterSpacing: '0.05em',
            padding: '0.5rem 0',
            marginTop: '-30px',
            marginLeft: '10px',
            opacity: showLogin ? 1 : 0,
            transition: 'opacity 0.5s ease',
            pointerEvents: showLogin ? 'auto' : 'none'
          }}
        >
          LOG IN
        </a>
      </div>
    </main>
  );
}
