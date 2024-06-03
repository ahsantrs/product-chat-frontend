import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Login from './pages/Login';
import './App.css';
import ProductPage from './pages/ProductPage';
import Home from './pages/Home';

const PrivateRoute = ({ children }) => {
  const { token } = useSelector((state) => state.authReducer);
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PrivateRoute><ProductPage /></PrivateRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={<PrivateRoute><Home /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
