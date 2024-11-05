import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './config/AuthContext';
import LoginPage from './pages/LoginPage';
import CoursesPage from './pages/CoursesPage';
import GalleryPage from './pages/GalleryPage';
import RequestPage from './pages/RequestPage';
import AdminPage from './pages/admin/AdminPage';
import ManagePage from './pages/admin/ManagePage';
import SettingsPage from './pages/admin/SettingsPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/courses" element={<PrivateRoute><CoursesPage /></PrivateRoute>} />
          <Route path="/courses/:courseId" element={<PrivateRoute><GalleryPage /></PrivateRoute>} />
          <Route path="/courses/:courseId/request" element={<PrivateRoute><RequestPage /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminPage /></PrivateRoute>} />
          <Route path="/admin/manage" element={<PrivateRoute requiredRole="admin"><ManagePage /></PrivateRoute>} />
          <Route path="/admin/settings" element={<PrivateRoute requiredRole="admin"><SettingsPage /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;