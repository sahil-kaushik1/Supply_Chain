import React from 'react';
import { Routes, Route } from 'react-router-dom';
import FrontPage from './pages/FrontPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Supplier from './pages/Supplier';
import Transporter from './pages/Transporter';
import Retailer from './pages/Retailer';
import Consumer from './pages/Consumer';

function App() {
  return (
    <Routes>
      <Route path="/" element={<FrontPage />} />         {/* FrontPage shown on / */}
      <Route path="/login" element={<LoginPage />} />     {/* LoginPage on /login */}
      <Route path="/dashboard" element={<Dashboard />} /> {/* Dashboard now on /dashboard */}
      <Route path="/supplier" element={<Supplier />} />
      <Route path="/transporter" element={<Transporter />} />
      <Route path="/retailer" element={<Retailer />} />
      <Route path="/consumer" element={<Consumer />} />
    </Routes>
  );
}

export default App;
