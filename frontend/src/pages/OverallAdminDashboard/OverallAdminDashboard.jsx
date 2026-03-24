import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Home, Settings as SettingsIcon, Building2, CheckCircle2, Clock,
  RefreshCw, Shield, ArrowRightLeft, AlertTriangle, MapPin,
  Lock, Users, Mail, Phone, Library, Activity
} from 'lucide-react';
import { overallAdminAPI, collegeAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal/Modal';
import styles from './OverallAdminDashboard.module.css';

/* ══════════════ PLATFORM OVERVIEW & PENDING COLLEGES ══════════════ */
const AdminHome = () => {
  const { toast } = useToast();
  const [pendingColleges, setPendingColleges] = useState([]);
  const [activeColleges, setActiveColleges]   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [approvingId, setApprovingId]         = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, activeRes] = await Promise.all([
        overallAdminAPI.getPendingColleges().catch(() => ({ data: { colleges: [] } })),
        collegeAPI.getList().catch(() => ({ data: { colleges: [] } }))
      ]);
      setPendingColleges(Array.isArray(pendingRes.data?.colleges) ? pendingRes.data.colleges : []);
      setActiveColleges(Array.isArray(activeRes.data?.colleges) ? activeRes.data.colleges : []);
    } catch {
      toast('Failed to load platform data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id, name) => {
    setApprovingId(id);
    try {
      await overallAdminAPI.approveCollege(id);
      setPendingColleges(c => c.filter(col => col._id !== id));
      fetchData(); // Refresh active list
      toast(`✓ ${name} approved! Admin credentials emailed.`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Approval failed.', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Platform Administration</h2>
          <p className={styles.pageSub}>Manage college registrations across the AISS platform</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchData} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      {/* High-Level Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.amber}`}>
          <div className={styles.statIconWrap}><Clock size={20} /></div>
          <div><p className={styles.statValue}>{loading ? '…' : pendingColleges.length}</p><p className={styles.statLabel}>Pending Colleges</p></div>
        </div>
        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.statIconWrap}><Library size={20} /></div>
          <div><p className={styles.statValue}>{loading ? '…' : activeColleges.length}</p><p className={styles.statLabel}>Active Institutions</p></div>
        </div>
        <div className={`${styles.statCard} ${styles.violet}`}>
          <div className={styles.statIconWrap}><Activity size={20} /></div>
          <div><p className={styles.statValue}>100%</p><p className={styles.statLabel}>System Uptime</p></div>
        </div>
      </div>

      {/* Pending Approval Requests */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Building2 size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Pending Registrations</h3>
              <p className={styles.cardSub}>Review and approve new institutions wanting to join the platform</p>
            </div>
          </div>
        </div>

        {loading ? <div className={styles.tableLoader}><div className={styles.spinner} /></div> :
        pendingColleges.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>✅</span>
            <p className={styles.emptyText}>No pending college registrations</p>
          </div>
        ) : (
          <div className={styles.collegeGrid}>
            {pendingColleges.map(college => {
              const admin = college.collegeAdminId;
              const isApproving = approvingId === college._id;
              return (
                <div key={college._id} className={styles.collegeCard}>
                  <div className={styles.collegeHeader}>
                    <div className={styles.collegeIcon}><Building2 size={20} /></div>
                    <div>
                      <h4 className={styles.collegeName}>{college.collegeName}</h4>
                      {college.location && <p className={styles.collegeLoc}><MapPin size={12} /> {college.location}</p>}
                    </div>
                  </div>

                  {college.departments?.length > 0 && (
                    <div className={styles.deptTags}>
                      {college.departments.slice(0, 4).map(d => <span key={d} className={styles.deptTag}>{d}</span>)}
                      {college.departments.length > 4 && <span className={styles.deptTag}>+{college.departments.length - 4}</span>}
                    </div>
                  )}

                  {admin && (
                    <div className={styles.adminInfo}>
                      <p className={styles.adminTitle}>Requesting Admin</p>
                      <div className={styles.adminRow}><Users size={13} /> <span>{admin.name}</span></div>
                      <div className={styles.adminRow}><Mail size={13} /> <span>{admin.email}</span></div>
                      {admin.phone && <div className={styles.adminRow}><Phone size={13} /> <span>{admin.phone}</span></div>}
                    </div>
                  )}

                  <button className={`${styles.approveCollegeBtn} ${isApproving ? styles.approving : ''}`} onClick={() => handleApprove(college._id, college.collegeName)} disabled={!!approvingId}>
                    {isApproving ? <><span className={styles.btnSpinner} /> Approving…</> : <><CheckCircle2 size={14} /> Approve College</>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Colleges Directory */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Library size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Active Institutions Directory</h3>
              <p className={styles.cardSub}>Colleges that are currently approved and running on AISS</p>
            </div>
          </div>
        </div>

        {loading ? <div className={styles.tableLoader}><div className={styles.spinner} /></div> :
        activeColleges.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🏫</span>
            <p className={styles.emptyText}>No active colleges yet.</p>
          </div>
        ) : (
          <div className={styles.collegeGrid}>
            {activeColleges.map(college => (
              <div key={college._id} className={styles.collegeCard} style={{ borderColor: 'var(--success-border)', background: 'var(--bg-1)' }}>
                <div className={styles.collegeHeader}>
                  <div className={styles.collegeIcon} style={{ background: 'var(--success-dim)', color: 'var(--success)' }}><Library size={20} /></div>
                  <div>
                    <h4 className={styles.collegeName}>{college.collegeName}</h4>
                    {college.location && <p className={styles.collegeLoc}><MapPin size={12} /> {college.location}</p>}
                  </div>
                </div>
                {college.departments?.length > 0 && (
                  <div className={styles.deptTags}>
                    {college.departments.slice(0, 5).map(d => <span key={d} className={styles.deptTag} style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}>{d}</span>)}
                    {college.departments.length > 5 && <span className={styles.deptTag}>+{college.departments.length - 5}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════ ADMIN SETTINGS ══════════════ */
const AdminSettings = () => {
  const { toast } = useToast();
  const { logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [changingPw, setChangingPw]           = useState(false);

  const [transferModal, setTransferModal] = useState(false);
  const [transferData, setTransferData]   = useState({ currentPassword: '', newAdminName: '', newAdminEmail: '' });
  const [transferring, setTransferring]   = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) { toast('Both fields required.', 'warning'); return; }
    setChangingPw(true);
    try {
      await overallAdminAPI.changePassword({ currentPassword, newPassword });
      toast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed.', 'error');
    } finally {
      setChangingPw(false);
    }
  };

  const handleTransfer = async () => {
    const { currentPassword: cp, newAdminName, newAdminEmail } = transferData;
    if (!cp || !newAdminName || !newAdminEmail) { toast('All fields required.', 'warning'); return; }
    setTransferring(true);
    try {
      await overallAdminAPI.transfer(transferData);
      toast('Admin transferred. Logging out…', 'success', 5000);
      setTransferModal(false);
      setTimeout(() => logout(), 2500);
    } catch (err) {
      toast(err.response?.data?.message || 'Transfer failed.', 'error');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div><h2 className={styles.pageTitle}>Admin Settings</h2><p className={styles.pageSub}>Security and master account management</p></div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}><Lock size={17} className={styles.cardHeaderIcon} /><h3 className={styles.cardTitle}>Change Password</h3></div>
        </div>
        <form className={styles.settingsForm} onSubmit={handleChangePassword}>
          <div className={styles.formRow}><label>Current Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Wait a moment..." className={styles.formInput} /></div>
          <div className={styles.formRow}><label>New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Secure password" className={styles.formInput} /></div>
          <button type="submit" className={styles.formBtn} disabled={changingPw}>{changingPw ? 'Changing…' : 'Update Password'}</button>
        </form>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}><ArrowRightLeft size={17} className={styles.cardHeaderIcon} /><div><h3 className={styles.cardTitle}>Transfer Platform Admin</h3><p className={styles.cardSub}>Irrevocably transfer Overall Admin to a new entity</p></div></div>
        </div>
        <div style={{ padding: '20px' }}>
          <button className={styles.dangerBtn} onClick={() => setTransferModal(true)}><ArrowRightLeft size={14} /> Pass the Torch</button>
        </div>
      </div>

      <Modal isOpen={transferModal} onClose={() => !transferring && setTransferModal(false)} title="Transfer Overall Admin" footer={<><button className={styles.cancelBtn} onClick={() => setTransferModal(false)} disabled={transferring}>Cancel</button><button className={styles.dangerModalBtn} onClick={handleTransfer} disabled={transferring}>{transferring ? <><span className={styles.btnSpinner} /> Transferring…</> : 'Transfer & Log Out'}</button></>}>
        <div className={styles.modalAlertDanger}><AlertTriangle size={16} /><div><strong>This action is irreversible.</strong><p style={{ marginTop: 4, fontWeight: 400 }}>Your account will be functionally deleted. A temporary password will be emailed to the new master admin.</p></div></div>
        <div className={styles.modalFields}>
          <div className={styles.formRow}><label>Your Current Password</label><input type="password" className={styles.formInput} value={transferData.currentPassword} onChange={e => setTransferData(d => ({ ...d, currentPassword: e.target.value }))} placeholder="Verify your identity" /></div>
          <div className={styles.formRow}><label>New Admin Name</label><input type="text" className={styles.formInput} value={transferData.newAdminName} onChange={e => setTransferData(d => ({ ...d, newAdminName: e.target.value }))} placeholder="Full legal name" /></div>
          <div className={styles.formRow}><label>New Admin Email</label><input type="email" className={styles.formInput} value={transferData.newAdminEmail} onChange={e => setTransferData(d => ({ ...d, newAdminEmail: e.target.value }))} placeholder="Email for secure handoff" /></div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════ DASHBOARD SHELL ══════════════ */
const OverallAdminDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const navItems = [
    { path: '/admin',          label: 'Platform Overview', icon: <Home size={18} /> },
    { path: '/admin/settings', label: 'Security & Auth',   icon: <SettingsIcon size={18} /> },
  ];

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon} style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
            <Shield size={17} strokeWidth={2.3} />
          </div>
          <div><p className={styles.brandName}>AISS_AES</p><p className={styles.brandSub}>Platform Admin</p></div>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navItems.map((item, i) => {
              const isActive = location.pathname === item.path || (item.path.length > 6 && location.pathname.startsWith(item.path));
              return (
                <li key={i}>
                  <button className={`${styles.navItem} ${isActive ? styles.navActive : ''}`} onClick={() => navigate(item.path)}>
                    <span className={styles.navIcon}>{item.icon}</span><span className={styles.navLabel}>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar} style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>A</div>
            <div className={styles.userInfo}><span className={styles.userName}>Overall Admin</span><span className={styles.rolePill}>God Mode</span></div>
          </div>
          <button className={styles.logoutBtn} onClick={logout}><Shield size={15} /> Sign Out</button>
        </div>
      </aside>

      <div className={styles.main}>
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/settings" element={<AdminSettings />} />
        </Routes>
      </div>
    </div>
  );
};

export default OverallAdminDashboard;
