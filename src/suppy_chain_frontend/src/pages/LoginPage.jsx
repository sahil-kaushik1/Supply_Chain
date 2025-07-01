import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
  if (username.trim() !== '') {
    localStorage.setItem('username', username.trim());
    navigate('/dashboard');
  } else {
    alert('Please enter your name!');
  }
};


  return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <h2>👤 Login</h2>
      <p>Please enter your name to continue</p>

      <input
        type="text"
        placeholder="Enter your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{
          padding: '0.8rem',
          fontSize: '1rem',
          width: '250px',
          borderRadius: '5px',
          border: '1px solid #ccc'
        }}
      /><br /><br />

      <button
        onClick={handleLogin}
        style={{
          padding: '0.8rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        Login →
      </button>
    </div>
  );
}
