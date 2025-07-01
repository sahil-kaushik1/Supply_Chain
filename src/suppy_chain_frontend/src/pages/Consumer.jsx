import React, { useState } from 'react';

export default function Consumer() {
  const [productId, setProductId] = useState('');
  const [journey, setJourney] = useState('');
  const [status, setStatus] = useState('');

  const handleTrack = async () => {
    try {
      setStatus('⏳ Fetching journey...');
      // TODO: Connect to backend function like: get_product_status(productId)
      console.log('Tracking product:', productId);

      // Mocked journey response
      const mockJourney = `
        Product ID: ${productId}
        - Registered by Supplier
        - Picked up by Transporter
        - Delivered to Retailer
        - Awaiting Consumer Pickup
      `;

      setJourney(mockJourney.trim());
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to fetch journey.');
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>🛒 Consumer: Track Product Journey</h2>

      <input
        type="text"
        placeholder="Enter Product ID"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        style={{ padding: '0.8rem', width: '250px', marginBottom: '1rem' }}
      /><br />

      <button
        onClick={handleTrack}
        style={{
          padding: '0.8rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#17a2b8',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        Track Journey
      </button>

      <p>{status}</p>

      {journey && (
        <pre style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem',
          marginTop: '1rem',
          textAlign: 'left',
          maxWidth: '400px',
          margin: 'auto',
          borderRadius: '6px',
          whiteSpace: 'pre-wrap'
        }}>
          {journey}
        </pre>
      )}
    </div>
  );
}