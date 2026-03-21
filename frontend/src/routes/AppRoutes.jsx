import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login     from '../pages/Login/Login';
import Register  from '../pages/Register/Register';
import SuperAdminDashboard from '../pages/SuperAdminDashboard/SuperAdminDashboard';
import HODDashboard        from '../pages/HODDashboard/HODDashboard';
import FacultyDashboard    from '../pages/FacultyDashboard/FacultyDashboard';

const AppRoutes = () => (
  <Routes>
    <Route path="/"           element={<Navigate to="/login" replace />} />
    <Route path="/login"      element={<Login />} />
    <Route path="/register"   element={<Register />} />
    <Route path="/superadmin/*" element={<SuperAdminDashboard />} />
    <Route path="/hod/*"        element={<HODDashboard />} />
    <Route path="/faculty/*"    element={<FacultyDashboard />} />
    <Route path="*"           element={<Navigate to="/login" replace />} />
  </Routes>
);

export default AppRoutes;
