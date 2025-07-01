import React, { useState } from 'react';

export default function Transporter() {
  const [productId, setProductId] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('');
  const [status, setStatus] = useState('');

  const handleUpdate = async () => {
    try {
      setStatus('⏳ Updating...');
      // TODO: Connect to backend function like: update_status(productId, statusUpdate)
      console.log('Transporter updated:', productId, statusUpdate);
      setStatus('✅ Status updated (mock)');
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to update status.');
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>🚚 Transporter: Update Product Status</h2>

      <input
        type="text"
        placeholder="Enter Product ID"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        style={{ padding: '0.8rem', width: '250px', marginBottom: '1rem' }}
      /><br />

      <input
        type="text"
        placeholder="Status (e.g. In Transit)"
        value={statusUpdate}
        onChange={(e) => setStatusUpdate(e.target.value)}
        style={{ padding: '0.8rem', width: '250px', marginBottom: '1rem' }}
      /><br />

      <button
        onClick={handleUpdate}
        style={{
          padding: '0.8rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        Update Status
      </button>

      <p>{status}</p>
    </div>
  );
}
