import React, { useState } from 'react';

export default function Retailer() {
  const [productId, setProductId] = useState('');
  const [status, setStatus] = useState('');

  const handleDelivery = async () => {
    try {
      setStatus('⏳ Updating...');
      // TODO: Connect to backend function like: mark_as_delivered(productId)
      console.log('Retailer marked delivered:', productId);
      setStatus('✅ Product marked as delivered (mock)');
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to mark as delivered.');
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>🏪 Retailer: Confirm Product Delivery</h2>

      <input
        type="text"
        placeholder="Enter Product ID"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        style={{ padding: '0.8rem', width: '250px', marginBottom: '1rem' }}
      /><br />

      <button
        onClick={handleDelivery}
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
        Mark as Delivered
      </button>

      <p>{status}</p>
    </div>
  );
}
