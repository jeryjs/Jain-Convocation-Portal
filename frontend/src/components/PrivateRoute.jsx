import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../config/AuthContext';

function PrivateRoute({ children, requiredRole }) {
  const { userData } = useAuth();

  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userData.role !== requiredRole) {
    return <Navigate to="/courses" replace />;
  }

  return children;
}

export default PrivateRoute;