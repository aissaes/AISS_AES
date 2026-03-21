import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Home, Settings as SettingsIcon, Users, BookOpen,
  CheckCircle2, Clock, XCircle, ArrowRightLeft,
  UserCheck, AlertTriangle, RefreshCw, HardHat, Wrench
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import Modal from '../../components/Modal/Modal';
import Settings from '../Settings/Settings';
import { facultyAPI, hodAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import styles from './HODDashboard.module.css';

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
   HOD HOME
══════════════════════════════════════════════════════ */
const HODHome = () => {
  const { toast } = useToast();

  const [faculty,  setFaculty]  = useState([]);
  const [pending,  setPending]  = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab, setTab]           = useState('pending');

  /* Per-row action loading states */
  const [approvingId, setApprovingId] = useState(null);

  /* Modals */
  const [rejectModal,   setRejectModal]   = useState({ open: false, id: null, name: '' });
  const [rejectReason,  setRejectReason]  = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const [transferModal,   setTransferModal]   = useState({ open: false, id: null, name: '' });
  const [transferLoading, setTransferLoading] = useState(false);

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, appRes] = await Promise.all([
        facultyAPI.getDeptFaculty().catch(() => ({ data: {} })),
        facultyAPI.getApprovals().catch(() => ({ data: { data: {} } })),
      ]);

      setFaculty(Array.isArray(deptRes.data?.faculty) ? deptRes.data.faculty : []);

      const d = appRes.data?.data || {};
      setPending( Array.isArray(d.pending)  ? d.pending  : []);
      setApproved(Array.isArray(d.approved) ? d.approved : []);
      setRejected(Array.isArray(d.rejected) ? d.rejected : []);
    } catch {
      toast('Error loading dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Approve (with per-row loading state) ── */
  const handleApprove = async (id, name) => {
    setApprovingId(id);
    try {
      await facultyAPI.approve(id);
      /* Animate removal — keep row briefly then filter */
      setTimeout(() => setPending(p => p.filter(a => a._id !== id)), 400);
      toast(`✓ ${name} has been approved!`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Approval failed.', 'error');
      setApprovingId(null);
    }
  };

  /* ── Reject ── */
  const openReject = (id, name) => {
    setRejectReason('');
    setRejectModal({ open: true, id, name });
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) { toast('Please provide a rejection reason.', 'warning'); return; }
    setRejectLoading(true);
    try {
      await facultyAPI.reject(rejectModal.id, rejectReason.trim());
      setPending(p => p.filter(a => a._id !== rejectModal.id));
      toast(`${rejectModal.name}'s registration rejected.`, 'info');
      setRejectModal({ open: false, id: null, name: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Rejection failed.', 'error');
    } finally {
      setRejectLoading(false);
    }
  };

  /* ── HOD Transfer ── */
  const openTransfer = (id, name) => setTransferModal({ open: true, id, name });

  const confirmTransfer = async () => {
    setTransferLoading(true);
    try {
      await hodAPI.transfer(transferModal.id);
      toast(`HOD role transferred to ${transferModal.name}. Logging out…`, 'success', 5000);
      setTransferModal({ open: false, id: null, name: '' });
      setTimeout(() => window.location.href = '/login', 2800);
    } catch (err) {
      toast(err.response?.data?.message || 'Transfer failed.', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  const listMap     = { pending, approved, rejected };
  const currentList = listMap[tab] || [];

  return (
    <div className={styles.pageWrap}>
      {/* Header */}
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>HOD Dashboard</h2>
          <p className={styles.pageSub}>Manage your department's faculty and approvals</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchAll} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { icon: Users,        label: 'Total Faculty',     value: faculty.length,  color: 'blue'  },
          { icon: Clock,        label: 'Pending Approvals', value: pending.length,  color: 'amber' },
          { icon: CheckCircle2, label: 'Approved',          value: approved.length, color: 'green' },
          { icon: XCircle,      label: 'Rejected',          value: rejected.length, color: 'red'   },
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

      {/* Department Faculty */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Users size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Department Faculty</h3>
              <p className={styles.cardSub}>Active, approved faculty in your department</p>
            </div>
          </div>
        </div>
        {loading
          ? <div className={styles.tableLoader}><div className={styles.spinner} /></div>
          : faculty.length === 0
            ? <Empty text="No approved faculty found in your department." />
            : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faculty.map(f => (
                      <tr key={f._id}>
                        <td>
                          <div className={styles.nameCell}>
                            <div className={styles.miniAvatar}>{(f.name||'U')[0].toUpperCase()}</div>
                            {f.name}
                          </div>
                        </td>
                        <td className={styles.mutedCell}>{f.email}</td>
                        <td>
                          <span className={`${styles.badge} ${f.role === 'hod' ? styles.badgeHOD : styles.badgeFaculty}`}>
                            {f.role === 'hod' ? 'HOD' : 'Faculty'}
                          </span>
                        </td>
                        <td>
                          {f.role === 'faculty' && (
                            <button
                              className={styles.actionBtn}
                              onClick={() => openTransfer(f._id, f.name)}
                            >
                              <ArrowRightLeft size={13} /> Transfer HOD
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </div>

      {/* Approvals */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <UserCheck size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Faculty Approvals</h3>
              <p className={styles.cardSub}>Review registration requests for your department</p>
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
            ? <Empty text={`No ${tab} approvals right now.`} />
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
                        <tr
                          key={item._id || idx}
                          className={isApproving ? styles.rowApproving : ''}
                        >
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
                                  onClick={() => openReject(item._id, item.name)}
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

      {/* ── Reject Modal ── */}
      <Modal
        isOpen={rejectModal.open}
        onClose={() => !rejectLoading && setRejectModal({ open: false, id: null, name: '' })}
        title={`Reject — ${rejectModal.name}`}
        footer={
          <>
            <button className={styles.cancelModalBtn}
              onClick={() => setRejectModal({ open: false, id: null, name: '' })}
              disabled={rejectLoading}>
              Cancel
            </button>
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
          This will permanently remove the registration and notify the applicant.
        </div>
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Reason for Rejection <span style={{color:'var(--danger)'}}>*</span></label>
          <textarea
            className={styles.modalTextarea}
            rows={3}
            placeholder="e.g. Incomplete credentials, duplicate application…"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            disabled={rejectLoading}
          />
        </div>
      </Modal>

      {/* ── Transfer HOD Modal ── */}
      <Modal
        isOpen={transferModal.open}
        onClose={() => !transferLoading && setTransferModal({ open: false, id: null, name: '' })}
        title="Transfer HOD Role"
        footer={
          <>
            <button className={styles.cancelModalBtn}
              onClick={() => setTransferModal({ open: false, id: null, name: '' })}
              disabled={transferLoading}>
              Cancel
            </button>
            <button className={styles.dangerModalBtn} onClick={confirmTransfer} disabled={transferLoading}>
              {transferLoading
                ? <><span className={styles.btnSpinner} /> Transferring…</>
                : 'Yes, Transfer HOD'}
            </button>
          </>
        }
      >
        <div className={styles.modalAlertDanger}>
          <AlertTriangle size={16} />
          <div>
            <strong>This action is irreversible.</strong>
            <p style={{marginTop:'4px',fontWeight:400}}>
              You will permanently transfer HOD authority to <strong>{transferModal.name}</strong>.
              You will be demoted to standard faculty and logged out.
            </p>
          </div>
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

/* ── Dashboard shell ── */
const HODDashboard = () => {
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
    { path: '/hod',          label: 'Department Overview', icon: <Home         size={18} />, badge: pendingCount },
    { path: '/hod/faculty',  label: 'Manage Faculty',      icon: <Users        size={18} /> },
    { path: '/hod/subjects', label: 'Subjects Mapping',    icon: <BookOpen     size={18} /> },
    { path: '/hod/settings', label: 'Settings',            icon: <SettingsIcon size={18} /> },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <Routes>
        <Route path="/"         element={<HODHome />} />
        <Route path="/faculty"  element={<UnderConstruction label="Manage Faculty" />} />
        <Route path="/subjects" element={<UnderConstruction label="Subjects Mapping" />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </DashboardLayout>
  );
};

export default HODDashboard;
