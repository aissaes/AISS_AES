import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, getRoleRoute } from '../context/AuthContext';

/* Full-page loading state */
const LoadingScreen = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100vh', gap: '16px',
    background: 'var(--bg-1, #0a0a0f)',
  }}>
    <div style={{
      width: '36px', height: '36px', border: '3px solid rgba(99,102,241,0.15)',
      borderTopColor: '#6366f1', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <p style={{ color: 'var(--text-2, #888)', fontSize: '14px' }}>Loading AISS_AES…</p>
  </div>
);

/**
 * ProtectedRoute — guards routes requiring authentication.
 * @param {string[]} allowedRoles — roles permitted to access this route
 */
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to their actual dashboard
    return <Navigate to={getRoleRoute(user.role)} replace />;
  }

  return children;
};

/**
 * PublicOnlyRoute — redirects authenticated users to their dashboard.
 */
export const PublicOnlyRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingScreen />;

  if (isAuthenticated && user) {
    return <Navigate to={getRoleRoute(user.role)} replace />;
  }

  return children;
};
