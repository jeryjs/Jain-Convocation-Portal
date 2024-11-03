import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, requiredRole }) => {
  const userdata = JSON.parse(localStorage.getItem('userdata'));
  const isAuthenticated = !!userdata;
  const hasRequiredRole = userdata?.role === requiredRole;

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && !hasRequiredRole) {
    return <Navigate to="/courses" />;
  }

  return children;
};

export default PrivateRoute;