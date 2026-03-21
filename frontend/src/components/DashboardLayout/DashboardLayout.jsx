import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, BrainCircuit, LayoutDashboard,
  ChevronDown, Repeat2, Shield, GraduationCap, Bell
} from 'lucide-react';
import { facultyAPI, authAPI } from '../../api/client';
import { useToast } from '../Toast/Toast';
import { secureStorage } from '../../utils/secureStorage';
import styles from './DashboardLayout.module.css';

/* ──────────────────────────────────────────────────────────
   Role view switching — HOD only
────────────────────────────────────────────────────────── */
const ROLE_VIEWS = {
  superAdmin: [], // Full access — no view switching needed
  hod: [
    { key: 'hod',     label: 'HOD View',    icon: Shield,        base: '/hod'     },
    { key: 'faculty', label: 'Faculty View', icon: GraduationCap, base: '/faculty' },
  ],
  faculty: [],
};

const VIEW_BADGES = {
  superAdmin: { label: 'Super Admin', cls: 'badgeSA'      },
  hod:        { label: 'HOD',         cls: 'badgeHOD'     },
  faculty:    { label: 'Faculty',     cls: 'badgeFaculty' },
};

const detectViewMode = (pathname) => {
  if (pathname.startsWith('/superadmin')) return 'superAdmin';
  if (pathname.startsWith('/hod'))        return 'hod';
  return 'faculty';
};

/* ──────────────────────────────────────────────────────────
   COMPONENT
────────────────────────────────────────────────────────── */
const DashboardLayout = ({ navItems, children }) => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { toast }  = useToast();

  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(false);
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

  /* ── Cache-first profile load ──
       1. Read the role stored on login → know which encrypted bucket to open
       2. Instantly show cached profile (if valid & < 30 min old)
       3. Fetch fresh profile in background → update UI + refresh cache
       4. If fresh fetch fails AND no cache → redirect to login
  ── */
  useEffect(() => {
    let alive = true;

    const load = async () => {
      // Step 1 — try encrypted cache
      const cachedRole = secureStorage.getRole();
      if (cachedRole) {
        const cached = await secureStorage.get(cachedRole);
        if (cached?.profile && alive) {
          setProfile(cached.profile);
          setLoading(false); // show UI instantly from cache
        }
      }

      // Step 2 — always refresh from server in background
      try {
        const r   = await facultyAPI.getMe();
        const prof = r.data.profile;
        if (!alive) return;
        setProfile(prof);
        setLoading(false);
        // Update encrypted cache
        secureStorage.setRole(prof.role);
        await secureStorage.set(prof.role, { profile: prof, cachedAt: Date.now() });
      } catch {
        if (!alive) return;
        // Only redirect if we had no cached profile either
        if (!profile) {
          toast('Session expired. Please log in again.', 'error');
          secureStorage.clear();
          navigate('/login');
        }
        setLoading(false);
      }
    };

    load();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Logout — clear all encrypted caches ── */
  const handleLogout = async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    secureStorage.clear();             // wipe all role caches
    navigate('/login');
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
    superAdmin: 'Super Admin',
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
                    {/* Pending badge dot */}
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
                const Icon    = view.icon;
                const isCurr  = currentView === view.key;
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

            {/* Notification bell (shows total pending badge count) */}
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
    </div>
  );
};

export default DashboardLayout;
