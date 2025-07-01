import React from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username'); // Get name from storage

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      {username && <h2>Welcome, {username} </h2>} {/* Greeting if name exists */}
      
      <h1>🔗 Supply Chain Dashboard</h1>
      <p>Select your role to continue:</p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        maxWidth: '300px',
        margin: '2rem auto'
      }}>
        <button onClick={() => navigate('/supplier')}>Supplier</button>
        <button onClick={() => navigate('/transporter')}>Transporter</button>
        <button onClick={() => navigate('/retailer')}>Retailer</button>
        <button onClick={() => navigate('/consumer')}>Consumer</button>
      </div>
    </div>
  );
}

export default Dashboard;
