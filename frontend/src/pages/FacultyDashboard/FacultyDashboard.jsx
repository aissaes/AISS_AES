import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Home, Settings as SettingsIcon, FileText, BarChart2, User, Building2, BookOpen, CheckCircle2, Clock } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import { facultyAPI } from '../../api/client';
import Settings from '../Settings/Settings';
import Assignments from './Assignments';
import FacultyTimetables from './Timetables';
import styles from './FacultyDashboard.module.css';

/* ── Stat Card ── */
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className={`${styles.statCard} ${styles[color]}`}>
    <div className={styles.statIconWrap}>
      <Icon size={22} strokeWidth={1.8} />
    </div>
    <div>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
    </div>
  </div>
);

/* ── Profile Row ── */
const ProfileRow = ({ icon: Icon, label, value }) => (
  <div className={styles.profRow}>
    <div className={styles.profIcon}><Icon size={16} /></div>
    <div>
      <p className={styles.profLabel}>{label}</p>
      <p className={styles.profValue}>{value || '—'}</p>
    </div>
  </div>
);

/* ── Faculty Home ── */
const FacultyHome = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    facultyAPI.getMe()
      .then(r => setProfile(r.data.profile))
      .catch(() => setError('Failed to load profile data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className={styles.emptyCenter}>
      <div className={styles.spinner} />
      <span className={styles.loadingText}>Loading your profile…</span>
    </div>
  );

  if (error) return (
    <div className={styles.alertError}>{error}</div>
  );

  if (!profile) return null;

  const paperCount = profile.questionPapersPrepared?.length || 0;
  const roleLabel  = profile.role === 'hod' ? 'Head of Dept.' : 'Faculty';

  return (
    <div className={styles.pageWrap}>
      {/* Welcome Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerAvatar}>{(profile.name || 'U')[0].toUpperCase()}</div>
          <div>
            <p className={styles.bannerGreeting}>Good day,</p>
            <h2 className={styles.bannerName}>{profile.name}</h2>
            <p className={styles.bannerRole}>{roleLabel} · {profile.department}</p>
          </div>
        </div>
        <div className={`${styles.bannerBadge} ${profile.isApproved ? styles.badgeApproved : styles.badgePending}`}>
          {profile.isApproved ? <><CheckCircle2 size={14} /> Approved</> : <><Clock size={14} /> Pending</>}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <StatCard icon={FileText}   label="Papers"           value={paperCount}         color="blue"  />
        <StatCard icon={CheckCircle2} label="Status"         value={profile.isApproved ? 'Approved' : 'Pending'} color="green" />
        <StatCard icon={BookOpen}   label="Department"       value={profile.department} color="violet"/>
        <StatCard icon={Building2}  label="Account Level"    value={roleLabel}          color="amber" />
      </div>

      {/* Profile Details Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <User size={18} className={styles.cardHeaderIcon} />
          <h3 className={styles.cardTitle}>My Profile</h3>
        </div>
        <div className={styles.profGrid}>
          <ProfileRow icon={User}      label="Full Name"   value={profile.name} />
          <ProfileRow icon={FileText}  label="Email"       value={profile.email} />
          <ProfileRow icon={FileText}  label="Role"        value={roleLabel} />
          <ProfileRow icon={FileText}  label="Phone"       value={profile.phone} />
          <ProfileRow icon={BookOpen}  label="Department"  value={profile.department} />
        </div>
      </div>
    </div>
  );
};

/* ── Dashboard shell ── */
const FacultyDashboard = () => {
  const navItems = [
    { path: '/faculty',          label: 'My Overview',    icon: <Home      size={18} /> },
    { path: '/faculty/assignments',  label: 'Assignments', icon: <FileText  size={18} /> },
    { path: '/faculty/timetables',  label: 'Timetables',        icon: <BookOpen size={18} /> },
    { path: '/faculty/settings', label: 'Settings',       icon: <SettingsIcon size={18} /> },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <Routes>
        <Route path="/"         element={<FacultyHome />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/assignments"  element={<Assignments />} />
        <Route path="/timetables"  element={<FacultyTimetables />} />
      </Routes>
    </DashboardLayout>
  );
};

export default FacultyDashboard;
