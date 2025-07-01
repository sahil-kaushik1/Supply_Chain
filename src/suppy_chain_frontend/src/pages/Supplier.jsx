import { suppy_chain_backend } from "../../../declarations/suppy_chain_backend";
import React, { useState } from 'react';

export default function Supplier() {
  const [productName, setProductName] = useState('');
  const [origin, setOrigin] = useState('');
  const [certs, setCerts] = useState('');
  const [status, setStatus] = useState('');

const handleRegister = async () => {
  try {
    setStatus(' Sending to backend...');

    // TEMP: call greet() instead of register_product
    const response = await suppy_chain_backend.greet(productName);

    setStatus('✅ Backend says: ' + response);
  } catch (err) {
    console.error(err);
    setStatus(' Failed to contact backend.');
  }
};

  return (
    <div style={{ padding: '2rem' }}>
      <h2>📝 Supplier: Register Product</h2>

      <label>
        Product Name:
        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} />
      </label><br /><br />

      <label>
        Origin:
        <input type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} />
      </label><br /><br />

      <label>
        Certifications:
        <input type="text" value={certs} onChange={(e) => setCerts(e.target.value)} />
      </label><br /><br />

      <button onClick={handleRegister}>Register Product</button>

      <p>{status}</p>
    </div>
  );
}
