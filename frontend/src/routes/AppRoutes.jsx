import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';

// Public pages
import Landing   from '../pages/Landing/Landing';
import Login     from '../pages/Login/Login';
import Register  from '../pages/Register/Register';
import AdminLogin from '../pages/AdminLogin/AdminLogin';

// Dashboard shells
import FacultyDashboard    from '../pages/FacultyDashboard/FacultyDashboard';
import HODDashboard        from '../pages/HODDashboard/HODDashboard';
import CollegeAdminDashboard from '../pages/CollegeAdminDashboard/CollegeAdminDashboard';
import OverallAdminDashboard from '../pages/OverallAdminDashboard/OverallAdminDashboard';
import StudentLogin        from '../pages/StudentLogin/StudentLogin';
import StudentDashboard    from '../pages/StudentDashboard/StudentDashboard';

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<Landing />} />
    
    <Route path="/login" element={
      <PublicOnlyRoute><Login /></PublicOnlyRoute>
    } />
    
    <Route path="/register" element={
      <PublicOnlyRoute><Register /></PublicOnlyRoute>
    } />

    <Route path="/student/login" element={
      <PublicOnlyRoute><StudentLogin /></PublicOnlyRoute>
    } />

    <Route path="/admin/login" element={<AdminLogin />} />

    {/* Faculty Dashboard — accessible by faculty, hod, collegeAdmin */}
    <Route path="/faculty/*" element={
      <ProtectedRoute allowedRoles={['faculty', 'hod', 'collegeAdmin']}>
        <FacultyDashboard />
      </ProtectedRoute>
    } />

    {/* HOD Dashboard — accessible by hod */}
    <Route path="/hod/*" element={
      <ProtectedRoute allowedRoles={['hod']}>
        <HODDashboard />
      </ProtectedRoute>
    } />

    {/* College Admin Dashboard — accessible by collegeAdmin */}
    <Route path="/collegeadmin/*" element={
      <ProtectedRoute allowedRoles={['collegeAdmin']}>
        <CollegeAdminDashboard />
      </ProtectedRoute>
    } />

    {/* Overall Admin Dashboard — accessible by overallAdmin */}
    <Route path="/admin/*" element={
      <ProtectedRoute allowedRoles={['overallAdmin']}>
        <OverallAdminDashboard />
      </ProtectedRoute>
    } />

    {/* Student Dashboard — accessible by students */}
    <Route path="/student/*" element={
      <ProtectedRoute allowedRoles={['student']}>
        <StudentDashboard />
      </ProtectedRoute>
    } />

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
