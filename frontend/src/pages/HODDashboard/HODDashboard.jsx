import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Home, Settings as SettingsIcon, Users, BookOpen,
  CheckCircle2, Clock, XCircle, ArrowRightLeft,
  UserCheck, AlertTriangle, RefreshCw, FileText
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import Modal from '../../components/Modal/Modal';
import Settings from '../Settings/Settings';
import { facultyAPI, hodAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Timetables from './Timetables';
import QuestionPapers from './QuestionPapers';
import styles from './HODDashboard.module.css';

/* ══════════════════════════════════════════════════════
   HOD MANAGE FACULTY TAB
══════════════════════════════════════════════════════ */
const HODFaculty = () => {
  const { toast } = useToast();
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  const [transferModal, setTransferModal] = useState({ open: false, id: null, name: '' });
  const [transferLoading, setTransferLoading] = useState(false);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await facultyAPI.getDeptFaculty();
      setFaculty(Array.isArray(data.faculty) ? data.faculty : []);
    } catch {
      toast('Error loading faculty list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);

  const confirmTransfer = async () => {
    setTransferLoading(true);
    try {
      await hodAPI.transfer(transferModal.id);
      toast(`HOD role transferred to ${transferModal.name}. Logging out…`, 'success', 5000);
      setTransferModal({ open: false, id: null, name: '' });
      setTimeout(() => window.location.href = '/login', 2500);
    } catch (err) {
      toast(err.response?.data?.message || 'Transfer failed.', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div><h2 className={styles.pageTitle}>Manage Faculty</h2><p className={styles.pageSub}>Oversee approved faculty members within your department</p></div>
        <button className={styles.refreshBtn} onClick={fetchFaculty} disabled={loading}><RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh</button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}><Users size={17} className={styles.cardHeaderIcon} /><h3 className={styles.cardTitle}>Department Faculty Directory</h3></div>
        </div>
        {loading ? <div className={styles.tableLoader}><div className={styles.spinner} /></div> :
        faculty.length === 0 ? <Empty text="No approved faculty found in your department." /> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {faculty.map(f => (
                  <tr key={f._id}>
                    <td><div className={styles.nameCell}><div className={styles.miniAvatar}>{(f.name||'U')[0].toUpperCase()}</div>{f.name}</div></td>
                    <td className={styles.mutedCell}>{f.email}</td>
                    <td><span className={`${styles.badge} ${f.role === 'hod' ? styles.badgeHOD : styles.badgeFaculty}`}>{f.role === 'hod' ? 'HOD' : 'Faculty'}</span></td>
                    <td>
                      {f.role === 'faculty' && (
                        <button className={`${styles.actionBtn} ${styles.transferBtn}`} onClick={() => setTransferModal({ open: true, id: f._id, name: f.name })}>
                          <ArrowRightLeft size={13} /> Transfer HOD Power
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

      <Modal isOpen={transferModal.open} onClose={() => !transferLoading && setTransferModal({ open: false, id: null, name: '' })} title="Transfer HOD Role" footer={<><button className={styles.cancelModalBtn} onClick={() => setTransferModal({ open: false, id: null, name: '' })} disabled={transferLoading}>Cancel</button><button className={styles.dangerModalBtn} onClick={confirmTransfer} disabled={transferLoading}>{transferLoading ? 'Transferring...' : 'Yes, Transfer HOD'}</button></>}>
        <div className={styles.modalAlertDanger}><AlertTriangle size={16} /><div><strong>This action is irreversible.</strong><p style={{marginTop:'4px',fontWeight:400}}>You will permanently transfer HOD authority to <strong>{transferModal.name}</strong>. You will be demoted to standard faculty and logged out automatically.</p></div></div>
      </Modal>
    </div>
  );
};


/* ══════════════════════════════════════════════════════
   HOD HOME (OVERVIEW)
══════════════════════════════════════════════════════ */
const HODHome = () => {
  const { toast } = useToast();

  const [pending,  setPending]  = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab, setTab]           = useState('pending');
  const [approvingId, setApprovingId] = useState(null);

  const [rejectModal,   setRejectModal]   = useState({ open: false, id: null, name: '' });
  const [rejectReason,  setRejectReason]  = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await facultyAPI.getApprovals();
      const d = data?.data || {};
      setPending(Array.isArray(d.pending) ? d.pending : []);
      setApproved(Array.isArray(d.approved) ? d.approved : []);
      setRejected(Array.isArray(d.rejected) ? d.rejected : []);
    } catch {
      toast('Error loading dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleApprove = async (id, name) => {
    setApprovingId(id);
    try {
      await facultyAPI.approve(id);
      setTimeout(() => setPending(p => p.filter(a => a._id !== id)), 400);
      toast(`✓ ${name} has been approved!`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Approval failed.', 'error');
      setApprovingId(null);
    }
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

  const listMap = { pending, approved, rejected };
  const currentList = listMap[tab] || [];

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div><h2 className={styles.pageTitle}>Dashboard Overview</h2><p className={styles.pageSub}>Monitor incoming faculty requests and actions required</p></div>
        <button className={styles.refreshBtn} onClick={fetchApprovals} disabled={loading}><RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh</button>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.amber}`}><div className={styles.statIconWrap}><Clock size={20} /></div><div><p className={styles.statValue}>{loading ? '…' : pending.length}</p><p className={styles.statLabel}>Pending Approvals</p></div></div>
        <div className={`${styles.statCard} ${styles.green}`}><div className={styles.statIconWrap}><CheckCircle2 size={20} /></div><div><p className={styles.statValue}>{loading ? '…' : approved.length}</p><p className={styles.statLabel}>Approved</p></div></div>
        <div className={`${styles.statCard} ${styles.red}`}><div className={styles.statIconWrap}><XCircle size={20} /></div><div><p className={styles.statValue}>{loading ? '…' : rejected.length}</p><p className={styles.statLabel}>Rejected</p></div></div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}><UserCheck size={17} className={styles.cardHeaderIcon} /><div><h3 className={styles.cardTitle}>Faculty Registration Queue</h3><p className={styles.cardSub}>Review registration requests strictly for your department</p></div></div>
          <div className={styles.tabBar}>
            {['pending', 'approved', 'rejected'].map(t => (
              <button key={t} className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)} <span className={styles.tabCount}>{listMap[t].length}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className={styles.tableLoader}><div className={styles.spinner} /></div> :
        currentList.length === 0 ? <Empty text={`No ${tab} approvals right now.`} /> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  {tab !== 'rejected' && <th>Email</th>}
                  {tab === 'rejected' && <th>Reason</th>}
                  <th>Status</th>
                  {tab === 'pending' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {currentList.map(item => {
                  const isApproving = approvingId === item._id;
                  return (
                    <tr key={item._id} className={isApproving ? styles.rowApproving : ''}>
                      <td><div className={styles.nameCell}><div className={styles.miniAvatar}>{(item.name||'U')[0].toUpperCase()}</div>{item.name}</div></td>
                      {tab !== 'rejected' && <td className={styles.mutedCell}>{item.email}</td>}
                      {tab === 'rejected' && <td className={styles.reasonCell}>{item.rejectedReason || 'N/A'}</td>}
                      <td>
                        {isApproving ? <span className={`${styles.badge} ${styles.badgeApproving}`}><span className={styles.dotSpinner} /> Approving…</span> : <span className={`${styles.badge} ${tab === 'pending' ? styles.badgeWarning : tab === 'approved' ? styles.badgeSuccess : styles.badgeDanger}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>}
                      </td>
                      {tab === 'pending' && (
                        <td>
                          <div className={styles.actionBtns}>
                            <button className={`${styles.actionBtn} ${styles.approveBtn} ${isApproving ? styles.approving : ''}`} onClick={() => handleApprove(item._id, item.name)} disabled={!!approvingId}>
                              {isApproving ? <><span className={styles.btnSpinner} /> Approving…</> : <><CheckCircle2 size={13} /> Approve</>}
                            </button>
                            <button className={`${styles.actionBtn} ${styles.rejectBtn}`} onClick={() => { setRejectReason(''); setRejectModal({ open: true, id: item._id, name: item.name }); }} disabled={!!approvingId}>
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

      <Modal isOpen={rejectModal.open} onClose={() => !rejectLoading && setRejectModal({ open: false, id: null, name: '' })} title={`Reject — ${rejectModal.name}`} footer={<><button className={styles.cancelModalBtn} onClick={() => setRejectModal({ open: false, id: null, name: '' })} disabled={rejectLoading}>Cancel</button><button className={styles.dangerModalBtn} onClick={confirmReject} disabled={rejectLoading}>{rejectLoading ? 'Rejecting...' : 'Confirm Rejection'}</button></>}>
        <div className={styles.modalAlertWarn}><AlertTriangle size={16} /> This will permanently remove the registration and notify the applicant.</div>
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Reason for Rejection <span style={{color:'var(--danger)'}}>*</span></label>
          <textarea className={styles.modalTextarea} rows={3} placeholder="e.g. Credentials unverifiable, not from our department…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} disabled={rejectLoading} />
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

  useEffect(() => {
    const fetch = () => facultyAPI.getApprovals().then(r => setPendingCount(r.data?.data?.pending?.length || 0)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const navItems = [
    { path: '/hod',            label: 'Overview',        icon: <Home         size={18} />, badge: pendingCount },
    { path: '/hod/faculty',    label: 'Manage Faculty',  icon: <Users        size={18} /> },
    { path: '/hod/timetables', label: 'Timetables',      icon: <BookOpen     size={18} /> },
    { path: '/hod/papers',     label: 'Question Papers', icon: <FileText     size={18} /> },
    { path: '/hod/settings',   label: 'Settings',        icon: <SettingsIcon size={18} /> },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <Routes>
        <Route path="/"           element={<HODHome />} />
        <Route path="/faculty"    element={<HODFaculty />} />
        <Route path="/timetables" element={<Timetables />} />
        <Route path="/papers"     element={<QuestionPapers />} />
        <Route path="/settings"   element={<Settings />} />
      </Routes>
    </DashboardLayout>
  );
};

export default HODDashboard;
