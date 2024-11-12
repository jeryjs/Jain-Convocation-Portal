import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../config/AuthContext';

function PrivateRoute({ children, requiredRole, username }) {
  const { userData } = useAuth();

  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userData.role !== requiredRole) {
    return <Navigate to="/courses" replace />;
  }

  if (username && userData.username !== username) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export default PrivateRoute;