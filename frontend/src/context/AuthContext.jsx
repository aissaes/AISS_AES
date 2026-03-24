import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { facultyAPI, authAPI, overallAdminAuthAPI } from '../api/client';
import { storage } from '../utils/storage';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const ROLE_ROUTES = {
  faculty:      '/faculty',
  hod:          '/hod',
  collegeAdmin: '/collegeadmin',
  overallAdmin: '/admin',
};

export const getRoleRoute = (role) => ROLE_ROUTES[role] || '/faculty';

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOverallAdmin, setIsOverallAdmin] = useState(false);

  // Check if user is already authenticated on mount
  const checkAuth = useCallback(async () => {
    const cachedRole = storage.getRole();

    // For overallAdmin, we don't have /me endpoint — they just stay if cookie valid
    if (cachedRole === 'overallAdmin') {
      setIsOverallAdmin(true);
      setUser({ role: 'overallAdmin', name: 'Overall Admin' });
      setLoading(false);
      return;
    }

    // Always verify with server — profile lives ONLY in React memory
    try {
      const res = await facultyAPI.getMe();
      const profile = res.data.profile;
      setUser(profile);
      setIsOverallAdmin(false);
      storage.setRole(profile.role);
    } catch {
      // Not authenticated or token expired — clear everything
      setUser(null);
      setIsOverallAdmin(false);
      storage.clear();
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = useCallback((profile, isOA = false) => {
    if (isOA) {
      setUser({ role: 'overallAdmin', name: 'Overall Admin', ...profile });
      setIsOverallAdmin(true);
      storage.setRole('overallAdmin');
    } else {
      setUser(profile);
      setIsOverallAdmin(false);
      storage.setRole(profile.role);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (isOverallAdmin) {
        await overallAdminAuthAPI.logout();
      } else {
        await authAPI.logout();
      }
    } catch { /* ignore */ }
    storage.clear();
    setUser(null);
    setIsOverallAdmin(false);
    navigate('/login');
  }, [isOverallAdmin, navigate]);

  const refreshProfile = useCallback(async () => {
    if (isOverallAdmin) return;
    try {
      const res = await facultyAPI.getMe();
      setUser(res.data.profile);
    } catch { /* ignore */ }
  }, [isOverallAdmin]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isOverallAdmin,
    role: user?.role || null,
    login,
    logout,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
