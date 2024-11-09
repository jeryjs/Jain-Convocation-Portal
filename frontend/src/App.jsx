import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from '@vercel/speed-insights/react';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './config/AuthContext';
import LoginPage from './pages/LoginPage';
import CoursesPage from './pages/CoursesPage';
import GalleryPage from './pages/GalleryPage';
import RequestPage from './pages/RequestPage';
import AdminPage from './pages/admin/AdminPage';
import ManagePage from './pages/admin/ManagePage';
import SettingsPage from './pages/admin/SettingsPage';
import FAQPage from './pages/FAQPage';
import AboutPage from './pages/AboutPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sessions" element={<PrivateRoute><CoursesPage /></PrivateRoute>} />
          <Route path="/gallery/:sessionId" element={<PrivateRoute><GalleryPage /></PrivateRoute>} />
          <Route path="/gallery/:sessionId/request" element={<PrivateRoute><RequestPage /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminPage /></PrivateRoute>} />
          <Route path="/admin/manage" element={<PrivateRoute requiredRole="admin"><ManagePage /></PrivateRoute>} />
          <Route path="/admin/settings" element={<PrivateRoute requiredRole="admin"><SettingsPage /></PrivateRoute>} />
          <Route path='/faq' element={<FAQPage />} />
          <Route path='/about' element={<AboutPage />} />
        </Routes>
        <Analytics />
        <SpeedInsights />
      </Router>
    </AuthProvider>
  );
}

export default App;