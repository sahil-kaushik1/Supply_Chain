import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function FrontPage() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <h1>🌐 Welcome to Supply Chain App</h1>
      <p>This app provides transparency and traceability in product delivery.</p>

      <button
        style={{
          marginTop: '2rem',
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
        onClick={() => navigate('/login')}
      >
        Get Started →
      </button>
    </div>
  );
}
