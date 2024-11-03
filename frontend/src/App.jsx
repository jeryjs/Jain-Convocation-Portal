import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CourseListPage from './pages/CourseListPage';
import ImageGalleryPage from './pages/ImageGalleryPage';
import AdminPage from './pages/AdminPage';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/courses" element={<PrivateRoute><CourseListPage /></PrivateRoute>} />
        <Route path="/courses/:courseId" element={<PrivateRoute><ImageGalleryPage /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminPage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;