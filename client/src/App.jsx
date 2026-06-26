import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Meeting from './pages/Meeting';
import MeetingPlayer from './pages/MeetingPlayer';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

// A simple client-side protection component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();
  if (!token) {
    // Save the intended path so Login can redirect back after auth
    localStorage.setItem('redirectPath', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected MERN App Paths */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meeting/:roomId"
          element={
            <ProtectedRoute>
              <Meeting />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meeting/player/:meetingId"
          element={
            <ProtectedRoute>
              <MeetingPlayer />
            </ProtectedRoute>
          }
        />

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
