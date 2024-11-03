import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CoursesPage from './pages/CoursesPage';
import GalleryPage from './pages/GalleryPage';
import AdminPage from './pages/AdminPage';
import PrivateRoute from './components/PrivateRoute';
import './App.css';
import RequestPage from './pages/RequestPage';
import ManageUsersPage from './pages/ManageUsersPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/courses" element={<PrivateRoute><CoursesPage /></PrivateRoute>} />
        <Route path="/courses/:courseId" element={<PrivateRoute><GalleryPage /></PrivateRoute>} />
        <Route path="/courses/:courseId/request" element={<PrivateRoute><RequestPage /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminPage /></PrivateRoute>} />
        <Route path="/admin/manage" element={<PrivateRoute requiredRole="admin"><ManageUsersPage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;