import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Home, Settings as SettingsIcon, Users, Database, Shield,
  CheckCircle2, Clock, XCircle, Crown, ArrowRightLeft,
  RefreshCw, AlertTriangle, UserCheck, Search, HardHat, Wrench
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import Modal from '../../components/Modal/Modal';
import Settings from '../Settings/Settings';
import { facultyAPI, superAdminAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import styles from './SuperAdminDashboard.module.css';

/* ══════════════════════════════════════════════════════
   UNDER CONSTRUCTION
══════════════════════════════════════════════════════ */
const UnderConstruction = ({ label }) => (
  <div className={styles.underConstruct}>
    <div className={styles.ucIcon}>
      <HardHat size={36} strokeWidth={1.5} />
    </div>
    <h2 className={styles.ucTitle}>{label}</h2>
    <p className={styles.ucText}>
      This section is under active development and will be available soon.
    </p>
    <div className={styles.ucBadge}>
      <Wrench size={13} /> Coming Soon
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════
   SUPER ADMIN HOME
══════════════════════════════════════════════════════ */
const SuperAdminHome = () => {
  const { toast } = useToast();

  const [allFaculty,  setAllFaculty]  = useState([]);
  const [pending,     setPending]     = useState([]);
  const [approved,    setApproved]    = useState([]);
  const [rejected,    setRejected]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('pending');
  const [facultySearch, setFacultySearch] = useState('');

  /* Per-row action states */
  const [approvingId,  setApprovingId]  = useState(null);
  const [makeHODingId, setMakeHODingId] = useState(null);

  /* Modals */
  const [rejectModal,   setRejectModal]   = useState({ open: false, id: null, name: '' });
  const [rejectReason,  setRejectReason]  = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const [makeHODModal,   setMakeHODModal]   = useState({ open: false, id: null, name: '', dept: '' });
  const [makeHODLoading, setMakeHODLoading] = useState(false);

  const [transferModal,  setTransferModal]  = useState({ open: false, id: null, name: '' });
  const [newDept,         setNewDept]         = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [collegeRes, appRes] = await Promise.all([
        superAdminAPI.getCollegeFaculty().catch(() => ({ data: {} })),
        facultyAPI.getApprovals().catch(() => ({ data: { data: {} } })),
      ]);

      setAllFaculty(Array.isArray(collegeRes.data?.faculty) ? collegeRes.data.faculty : []);

      const d = appRes.data?.data || {};
      setPending( Array.isArray(d.pending)  ? d.pending  : []);
      setApproved(Array.isArray(d.approved) ? d.approved : []);
      setRejected(Array.isArray(d.rejected) ? d.rejected : []);
    } catch {
      toast('Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Approve (per-row loading) ── */
  const handleApprove = async (id, name) => {
    setApprovingId(id);
    try {
      await facultyAPI.approve(id);
      setTimeout(() => setPending(p => p.filter(a => a._id !== id)), 400);
      toast(`✓ ${name} approved!`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Approval failed.', 'error');
      setApprovingId(null);
    }
  };

  /* ── Reject ── */
  const confirmReject = async () => {
    if (!rejectReason.trim()) { toast('Rejection reason is required.', 'warning'); return; }
    setRejectLoading(true);
    try {
      await facultyAPI.reject(rejectModal.id, rejectReason.trim());
      setPending(p => p.filter(a => a._id !== rejectModal.id));
      toast(`${rejectModal.name} rejected.`, 'info');
      setRejectModal({ open: false, id: null, name: '' });
      setRejectReason('');
    } catch (err) {
      toast(err.response?.data?.message || 'Rejection failed.', 'error');
    } finally {
      setRejectLoading(false);
    }
  };

  /* ── Make HOD ── */
  const confirmMakeHOD = async () => {
    setMakeHODLoading(true);
    setMakeHODingId(makeHODModal.id);
    try {
      await superAdminAPI.makeHOD(makeHODModal.id);
      toast(`${makeHODModal.name} promoted to HOD!`, 'success');
      setMakeHODModal({ open: false, id: null, name: '', dept: '' });
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Promotion failed.', 'error');
    } finally {
      setMakeHODLoading(false);
      setMakeHODingId(null);
    }
  };

  /* ── Transfer SuperAdmin ── */
  const confirmTransfer = async () => {
    if (!newDept.trim()) { toast('Please enter your new department.', 'warning'); return; }
    setTransferLoading(true);
    try {
      await superAdminAPI.transfer(transferModal.id, newDept.trim());
      toast(`Super Admin role transferred to ${transferModal.name}. Redirecting…`, 'success', 5000);
      setTransferModal({ open: false, id: null, name: '' });
      setTimeout(() => window.location.href = '/login', 2800);
    } catch (err) {
      toast(err.response?.data?.message || 'Transfer failed.', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  /* Derived */
  const listMap     = { pending, approved, rejected };
  const currentList = listMap[tab] || [];
  const filteredFaculty = allFaculty.filter(f =>
    f.name?.toLowerCase().includes(facultySearch.toLowerCase()) ||
    f.email?.toLowerCase().includes(facultySearch.toLowerCase()) ||
    f.department?.toLowerCase().includes(facultySearch.toLowerCase())
  );
  const deptGroups = filteredFaculty.reduce((acc, f) => {
    const dept = f.department || 'Other';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(f);
    return acc;
  }, {});

  return (
    <div className={styles.pageWrap}>
      {/* Header */}
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Super Admin Dashboard</h2>
          <p className={styles.pageSub}>Full college oversight — faculty, approvals & roles</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchAll} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { icon: Users,        label: 'Total Verified Faculty', value: allFaculty.length,  color: 'blue'   },
          { icon: Clock,        label: 'Pending Approvals',      value: pending.length,     color: 'amber'  },
          { icon: CheckCircle2, label: 'Approved',               value: approved.length,    color: 'green'  },
          { icon: XCircle,      label: 'Rejected',               value: rejected.length,    color: 'red'    },
          { icon: Crown,        label: 'HODs',                   value: allFaculty.filter(f => f.role === 'hod').length, color: 'violet' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`${styles.statCard} ${styles[color]}`}>
            <div className={styles.statIconWrap}><Icon size={20} /></div>
            <div>
              <p className={styles.statValue}>{loading ? '…' : value}</p>
              <p className={styles.statLabel}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Approvals */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <UserCheck size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Faculty Approvals</h3>
              <p className={styles.cardSub}>Manage registration requests across all departments</p>
            </div>
          </div>
          <div className={styles.tabBar}>
            {['pending', 'approved', 'rejected'].map(t => (
              <button
                key={t}
                className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                <span className={styles.tabCount}>{listMap[t].length}</span>
              </button>
            ))}
          </div>
        </div>

        {loading
          ? <div className={styles.tableLoader}><div className={styles.spinner} /></div>
          : currentList.length === 0
            ? <Empty text={`No ${tab} approvals at this time.`} />
            : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      {tab !== 'rejected' && <th>Email</th>}
                      <th>Department</th>
                      {tab === 'rejected' && <th>Reason</th>}
                      <th>Status</th>
                      {tab === 'pending' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.map((item, idx) => {
                      const isApproving = approvingId === item._id;
                      return (
                        <tr key={item._id || idx} className={isApproving ? styles.rowApproving : ''}>
                          <td>
                            <div className={styles.nameCell}>
                              <div className={styles.miniAvatar}>{(item.name||'U')[0].toUpperCase()}</div>
                              {item.name}
                            </div>
                          </td>
                          {tab !== 'rejected' && <td className={styles.mutedCell}>{item.email}</td>}
                          <td className={styles.mutedCell}>{item.department || '—'}</td>
                          {tab === 'rejected' && (
                            <td className={styles.reasonCell}>{item.rejectedReason || 'N/A'}</td>
                          )}
                          <td>
                            {isApproving
                              ? <span className={`${styles.badge} ${styles.badgeApproving}`}><span className={styles.dotSpinner} /> Approving…</span>
                              : <span className={`${styles.badge} ${
                                  tab === 'pending'  ? styles.badgeWarning :
                                  tab === 'approved' ? styles.badgeSuccess : styles.badgeDanger
                                }`}>
                                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </span>
                            }
                          </td>
                          {tab === 'pending' && (
                            <td>
                              <div className={styles.actionBtns}>
                                <button
                                  className={`${styles.actionBtn} ${styles.approveBtn} ${isApproving ? styles.approving : ''}`}
                                  onClick={() => handleApprove(item._id, item.name)}
                                  disabled={!!approvingId}
                                >
                                  {isApproving
                                    ? <><span className={styles.btnSpinner} /> Approving…</>
                                    : <><CheckCircle2 size={13} /> Approve</>}
                                </button>
                                <button
                                  className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                  onClick={() => { setRejectReason(''); setRejectModal({ open: true, id: item._id, name: item.name }); }}
                                  disabled={!!approvingId}
                                >
                                  <XCircle size={13} /> Reject
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
      </div>

      {/* All College Faculty */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Database size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>All College Faculty</h3>
              <p className={styles.cardSub}>Manage roles — {allFaculty.length} verified members</p>
            </div>
          </div>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search name, email, dept…"
              value={facultySearch}
              onChange={e => setFacultySearch(e.target.value)}
            />
          </div>
        </div>

        {loading
          ? <div className={styles.tableLoader}><div className={styles.spinner} /></div>
          : filteredFaculty.length === 0
            ? <Empty text="No faculty members found." />
            : Object.entries(deptGroups).map(([dept, members]) => (
              <div key={dept}>
                <div className={styles.deptLabel}>{dept}</div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(f => {
                        const isMakingHOD = makeHODingId === f._id;
                        return (
                          <tr key={f._id} className={isMakingHOD ? styles.rowApproving : ''}>
                            <td>
                              <div className={styles.nameCell}>
                                <div className={styles.miniAvatar}>{(f.name||'U')[0].toUpperCase()}</div>
                                <p style={{color:'var(--text-1)',fontWeight:500}}>{f.name}</p>
                              </div>
                            </td>
                            <td className={styles.mutedCell}>{f.email}</td>
                            <td>
                              <span className={`${styles.badge} ${
                                f.role === 'superAdmin' ? styles.badgeSA :
                                f.role === 'hod'        ? styles.badgeHOD : styles.badgeFaculty
                              }`}>
                                {isMakingHOD ? <><span className={styles.dotSpinner} /> Promoting…</> :
                                 f.role === 'superAdmin' ? <><Crown size={11} /> Super Admin</> :
                                 f.role === 'hod'        ? <><Shield size={11} /> HOD</> : 'Faculty'}
                              </span>
                            </td>
                            <td>
                              <div className={styles.actionBtns}>
                                {f.role === 'faculty' && (
                                  <button
                                    className={`${styles.actionBtn} ${styles.hodBtn}`}
                                    onClick={() => setMakeHODModal({ open: true, id: f._id, name: f.name, dept: f.department })}
                                    disabled={!!makeHODingId}
                                  >
                                    {isMakingHOD
                                      ? <><span className={styles.btnSpinner} /> Promoting…</>
                                      : <><Crown size={12} /> Make HOD</>}
                                  </button>
                                )}
                                {f.role !== 'superAdmin' && (
                                  <button
                                    className={`${styles.actionBtn} ${styles.transferBtn}`}
                                    onClick={() => { setNewDept(''); setTransferModal({ open: true, id: f._id, name: f.name }); }}
                                  >
                                    <ArrowRightLeft size={12} /> Transfer SA
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
      </div>

      {/* ── Reject Modal ── */}
      <Modal
        isOpen={rejectModal.open}
        onClose={() => !rejectLoading && setRejectModal({ open: false, id: null, name: '' })}
        title={`Reject — ${rejectModal.name}`}
        footer={
          <>
            <button className={styles.cancelModalBtn}
              onClick={() => setRejectModal({ open: false, id: null, name: '' })}
              disabled={rejectLoading}>Cancel</button>
            <button className={styles.dangerModalBtn} onClick={confirmReject} disabled={rejectLoading}>
              {rejectLoading
                ? <><span className={styles.btnSpinner} /> Rejecting…</>
                : 'Confirm Rejection'}
            </button>
          </>
        }
      >
        <div className={styles.modalAlertWarn}>
          <AlertTriangle size={16} />
          This will permanently delete the registration and email the applicant.
        </div>
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Rejection Reason <span style={{color:'var(--danger)'}}>*</span></label>
          <textarea
            className={styles.modalTextarea} rows={3}
            placeholder="e.g. Credentials incomplete, duplicate record…"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            disabled={rejectLoading}
          />
        </div>
      </Modal>

      {/* ── Make HOD Modal ── */}
      <Modal
        isOpen={makeHODModal.open}
        onClose={() => !makeHODLoading && setMakeHODModal({ open: false, id: null, name: '', dept: '' })}
        title="Promote to HOD"
        footer={
          <>
            <button className={styles.cancelModalBtn}
              onClick={() => setMakeHODModal({ open: false, id: null, name: '', dept: '' })}
              disabled={makeHODLoading}>Cancel</button>
            <button className={styles.successModalBtn} onClick={confirmMakeHOD} disabled={makeHODLoading}>
              {makeHODLoading
                ? <><span className={styles.btnSpinner} /> Promoting…</>
                : <><Crown size={15} /> Confirm Promotion</>}
            </button>
          </>
        }
      >
        <div className={styles.modalConfirmBox}>
          <div className={styles.modalConfirmIcon}><Crown size={28} /></div>
          <p className={styles.modalConfirmText}>
            Promote <strong>{makeHODModal.name}</strong> to{' '}
            <strong>Head of Department</strong>
            {makeHODModal.dept ? ` — ${makeHODModal.dept}` : ''}.
          </p>
          <p className={styles.modalConfirmSub}>
            They will become the Head of Department for {makeHODModal.dept}.
            If a current HOD exists in that department, they retain their role until transferred.
          </p>
        </div>
      </Modal>

      {/* ── Transfer Super Admin Modal ── */}
      <Modal
        isOpen={transferModal.open}
        onClose={() => !transferLoading && setTransferModal({ open: false, id: null, name: '' })}
        title="Transfer Super Admin Role"
        footer={
          <>
            <button className={styles.cancelModalBtn}
              onClick={() => setTransferModal({ open: false, id: null, name: '' })}
              disabled={transferLoading}>Cancel</button>
            <button className={styles.dangerModalBtn} onClick={confirmTransfer} disabled={transferLoading}>
              {transferLoading
                ? <><span className={styles.btnSpinner} /> Transferring…</>
                : 'Transfer & Demote Myself'}
            </button>
          </>
        }
      >
        <div className={styles.modalAlertDanger}>
          <AlertTriangle size={16} />
          <div>
            <strong>Irreversible.</strong>
            <p style={{marginTop:'4px',fontWeight:400}}>
              <strong>{transferModal.name}</strong> becomes the new Super Admin.
              You will lose all admin privileges.
            </p>
          </div>
        </div>
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Your new department <span style={{color:'var(--danger)'}}>*</span></label>
          <select
            className={styles.modalInput}
            value={newDept}
            onChange={e => setNewDept(e.target.value)}
            disabled={transferLoading}
          >
            <option value="" disabled>Select your new department...</option>
            {[
              "Computer Science and Engineering","Electronics and Communication Engineering",
              "Electrical Engineering","Mechanical Engineering","Civil Engineering",
              "Information Technology","Chemical Engineering","Aerospace Engineering",
              "Biotechnology","Metallurgical Engineering","Mathematics","Physics",
              "Management Studies","Architecture",
            ].map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </div>
      </Modal>
    </div>
  );
};

/* ── Empty state ── */
const Empty = ({ text }) => (
  <div className={styles.empty}>
    <span className={styles.emptyIcon}>📭</span>
    <p className={styles.emptyText}>{text}</p>
  </div>
);

/* ══ Dashboard shell ══ */
const SuperAdminDashboard = () => {
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending count at shell level — auto-refreshes every 2 min
  useEffect(() => {
    const fetch = () =>
      facultyAPI.getApprovals()
        .then(r => {
          const d = r.data?.data || {};
          setPendingCount(Array.isArray(d.pending) ? d.pending.length : 0);
        })
        .catch(() => {});

    fetch();
    const id = setInterval(fetch, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const navItems = [
    { path: '/superadmin',          label: 'Overview',  icon: <Home         size={18} />, badge: pendingCount },
    { path: '/superadmin/settings', label: 'Settings',  icon: <SettingsIcon size={18} /> },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <Routes>
        <Route path="/"         element={<SuperAdminHome />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
