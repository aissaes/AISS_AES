import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, BrainCircuit, LayoutDashboard,
  ChevronDown, Repeat2, Shield, GraduationCap, Bell, KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { facultyAPI } from '../../api/client';
import { useToast } from '../Toast/Toast';
import ChangePasswordModal from '../ChangePassword/ChangePassword';
import styles from './DashboardLayout.module.css';

/* ──────────────────────────────────────────────────────────
   Role view switching — HOD only
────────────────────────────────────────────────────────── */
const ROLE_VIEWS = {
  collegeAdmin: [],
  hod: [
    { key: 'hod',     label: 'HOD View',    icon: Shield,        base: '/hod'     },
    { key: 'faculty', label: 'Faculty View', icon: GraduationCap, base: '/faculty' },
  ],
  faculty: [],
};

const VIEW_BADGES = {
  collegeAdmin: { label: 'College Admin', cls: 'badgeCA'      },
  hod:        { label: 'HOD',         cls: 'badgeHOD'     },
  faculty:    { label: 'Faculty',     cls: 'badgeFaculty' },
};

const detectViewMode = (pathname) => {
  if (pathname.toLowerCase().startsWith('/collegeadmin')) return 'collegeAdmin';
  if (pathname.toLowerCase().startsWith('/hod'))        return 'hod';
  return 'faculty';
};

/* ──────────────────────────────────────────────────────────
   COMPONENT
────────────────────────────────────────────────────────── */
const DashboardLayout = ({ navItems, children }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user: profile, logout, loading } = useAuth();
  const { toast } = useToast();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const switcherRef = useRef(null);

  const actualRole  = profile?.role || 'faculty';
  const currentView = detectViewMode(location.pathname);
  const availViews  = ROLE_VIEWS[actualRole] || [];
  const canSwitch   = availViews.length > 1;

  /* ── Close switcher on outside click ── */
  useEffect(() => {
    const h = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target))
        setSwitcherOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const handleChangePassword = async (data) => {
    await facultyAPI.changePassword(data);
    toast('Password changed successfully!', 'success');
  };

  const handleSwitchView = (view) => {
    setSwitcherOpen(false);
    navigate(view.base);
  };

  const activeNavItem = navItems.find(n =>
    location.pathname === n.path ||
    (n.path.length > 8 && location.pathname.startsWith(n.path))
  );
  const activeLabel = activeNavItem?.label || navItems[0]?.label || 'Dashboard';

  const roleLabel = {
    collegeAdmin: 'College Admin',
    hod:        'Head of Dept',
    faculty:    'Faculty',
  }[actualRole] || 'User';

  const isViewingOtherRole = currentView !== actualRole;

  /* Total notification count from nav badges */
  const totalBadge = navItems.reduce((sum, n) => sum + (n.badge || 0), 0);

  if (loading && !profile) {
    return (
      <div className={styles.loader}>
        <div className={styles.spinner} />
        <p className={styles.loaderText}>Loading AISS_AES…</p>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* ════ Sidebar ════ */}
      <aside className={styles.sidebar}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <BrainCircuit size={17} strokeWidth={2.3} />
          </div>
          <div>
            <p className={styles.brandName}>AISS_AES</p>
            <p className={styles.brandSub}>Evaluation System</p>
          </div>
        </div>

        {/* Viewing-other-role banner */}
        {isViewingOtherRole && (
          <div className={styles.viewModeBanner}>
            <Repeat2 size={13} />
            <span>Viewing as <strong>{VIEW_BADGES[currentView]?.label}</strong></span>
          </div>
        )}

        {/* Nav */}
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navItems.map((item, i) => {
              const isActive =
                location.pathname === item.path ||
                (item.path.length > 8 && location.pathname.startsWith(item.path));
              return (
                <li key={i}>
                  <button
                    className={`${styles.navItem} ${isActive ? styles.navActive : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                    {item.badge > 0 && (
                      <span className={styles.navBadge} title={`${item.badge} pending`}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                    {isActive && !item.badge && <span className={styles.navPip} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* HOD View Switcher */}
        {canSwitch && (
          <div className={styles.switcherSection} ref={switcherRef}>
            <p className={styles.switcherHeading}>Switch View</p>
            <div className={styles.switchBtns}>
              {availViews.map(view => {
                const Icon   = view.icon;
                const isCurr = currentView === view.key;
                return (
                  <button
                    key={view.key}
                    className={`${styles.switchBtn} ${isCurr ? styles.switchBtnActive : ''}`}
                    onClick={() => handleSwitchView(view)}
                  >
                    <Icon size={13} />
                    <span>{view.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* User + Logout */}
        <div className={styles.sidebarBottom}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {(profile?.name || 'U')[0].toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName} title={profile?.name}>
                {profile?.name || 'User'}
              </span>
              <span className={`${styles.rolePill} ${styles[VIEW_BADGES[actualRole]?.cls]}`}>
                {roleLabel}
              </span>
            </div>
          </div>
          <button className={styles.changePassBtn} onClick={() => setPasswordModalOpen(true)}>
            <KeyRound size={14} strokeWidth={2} />
            <span>Change Password</span>
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={15} strokeWidth={2} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ════ Main ════ */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <LayoutDashboard size={17} className={styles.topbarIcon} />
            <div>
              <span className={styles.pageTitle}>{activeLabel}</span>
              {isViewingOtherRole && (
                <span className={styles.viewingBadge}>
                  viewing as {VIEW_BADGES[currentView]?.label}
                </span>
              )}
              {profile?.collegeId?.collegeName && (
                <span style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginLeft: 16, padding: '4px 10px', 
                  background: 'var(--bg-3)', border: '1px solid var(--border-2)',
                  borderRadius: 12, fontSize: 12, color: 'var(--text-2)',
                  fontWeight: 500
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                  {profile.collegeId.collegeName}
                </span>
              )}
            </div>
          </div>

          <div className={styles.topbarRight}>
            {/* HOD quick-switch dropdown */}
            {canSwitch && (
              <div className={styles.quickSwitch} ref={switcherRef}>
                <button
                  className={styles.quickSwitchBtn}
                  onClick={() => setSwitcherOpen(v => !v)}
                >
                  <Repeat2 size={14} />
                  <span>{VIEW_BADGES[currentView]?.label} View</span>
                  <ChevronDown size={13} className={switcherOpen ? styles.chevronOpen : ''} />
                </button>
                {switcherOpen && (
                  <div className={styles.quickSwitchMenu}>
                    {availViews.map(view => {
                      const Icon   = view.icon;
                      const isCurr = currentView === view.key;
                      return (
                        <button
                          key={view.key}
                          className={`${styles.quickSwitchItem} ${isCurr ? styles.quickSwitchItemActive : ''}`}
                          onClick={() => handleSwitchView(view)}
                        >
                          <Icon size={14} />
                          {view.label}
                          {isCurr && <span className={styles.activeCheck}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notification bell */}
            {totalBadge > 0 && (
              <div className={styles.bellWrap} title={`${totalBadge} pending approval${totalBadge > 1 ? 's' : ''}`}>
                <Bell size={17} />
                <span className={styles.bellBadge}>{totalBadge > 9 ? '9+' : totalBadge}</span>
              </div>
            )}

            <div className={styles.topbarMeta}>
              <span className={styles.topbarName}>{profile?.name}</span>
              <span className={styles.topbarRole}>{roleLabel}</span>
            </div>
            <div className={styles.topbarAvatar}>
              {(profile?.name || 'U')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content} key={location.pathname}>
          {children}
        </main>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSubmit={handleChangePassword}
      />
    </div>
  );
};

export default DashboardLayout;
