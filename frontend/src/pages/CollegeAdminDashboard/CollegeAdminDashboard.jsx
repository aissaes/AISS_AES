import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Home, Settings as SettingsIcon, Users, Database, Shield,
  CheckCircle2, Clock, XCircle, Crown, ArrowRightLeft,
  RefreshCw, AlertTriangle, UserCheck, Search, Building2, Plus, GripVertical
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import Modal from '../../components/Modal/Modal';
import Settings from '../Settings/Settings';
import { facultyAPI, collegeAdminAPI, collegeAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast/Toast';
import styles from './CollegeAdminDashboard.module.css';

/* ══════════════════════════════════════════════════════
   Departments Tab Component
══════════════════════════════════════════════════════ */
const CollegeAdminDepartments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.collegeId) {
      const colId = typeof user.collegeId === 'object' ? user.collegeId._id : user.collegeId;
      collegeAPI.getDepartments(colId)
        .then(res => setDepartments(res.data.departments || []))
        .catch(err => toast('Failed to load departments', 'error'))
        .finally(() => setLoading(false));
    }
  }, [user, toast]);

  const handleSave = async (updatedList) => {
    setSaving(true);
    try {
      const res = await collegeAdminAPI.updateDepartments(updatedList);
      setDepartments(res.data.departments);
      toast('Departments updated successfully!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newDept.trim()) return;
    if (departments.some(d => d.toLowerCase() === newDept.trim().toLowerCase())) {
      toast('Department already exists', 'warning');
      return;
    }
    const updated = [...departments, newDept.trim()];
    handleSave(updated);
    setNewDept('');
  };

  const handleRemove = (deptToRemove) => {
    if (window.confirm(`Are you sure you want to remove ${deptToRemove}? This will not delete faculty, but limits future registrations.`)) {
      const updated = departments.filter(d => d !== deptToRemove);
      handleSave(updated);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Manage Departments</h2>
          <p className={styles.pageSub}>Add or remove academic departments for your institution</p>
        </div>
      </div>

      <div className={styles.card} style={{ maxWidth: '600px' }}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Building2 size={17} className={styles.cardHeaderIcon} />
            <h3 className={styles.cardTitle}>Academic Departments</h3>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input 
              type="text" 
              value={newDept}
              onChange={e => setNewDept(e.target.value)}
              placeholder="E.g., Computer Science..." 
              className={styles.searchInput}
              style={{ flex: 1 }}
              required
            />
            <button type="submit" disabled={saving || !newDept.trim()} className={styles.successModalBtn} style={{ padding: '0 16px', height: 'auto', borderRadius: '8px' }}>
              {saving ? '...' : <><Plus size={16} /> Add</>}
            </button>
          </form>

          {loading ? (
             <div className={styles.tableLoader}><div className={styles.spinner} /></div>
          ) : departments.length === 0 ? (
             <Empty text="No departments configured yet." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {departments.map((dept, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <GripVertical size={14} color="var(--text-3)" />
                    <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{dept}</span>
                  </div>
                  <button onClick={() => handleRemove(dept)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }} title="Remove department">
                    <XCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   Faculty Roles Tab Component
══════════════════════════════════════════════════════ */
const CollegeAdminFaculty = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [allFaculty, setAllFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [makeHODModal, setMakeHODModal] = useState({ open: false, id: null, name: '', dept: '' });
  const [makeHODLoading, setMakeHODLoading] = useState(false);

  const [transferModal, setTransferModal] = useState({ open: false, id: null, name: '' });
  const [newDept, setNewDept] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const res = await collegeAdminAPI.getCollegeFaculty();
      setAllFaculty(Array.isArray(res.data?.faculty) ? res.data.faculty : []);
      if (user?.collegeId) {
        const colId = typeof user.collegeId === 'object' ? user.collegeId._id : user.collegeId;
        const dRes = await collegeAPI.getDepartments(colId);
        setDepartments(dRes.data.departments || []);
      }
    } catch {
      toast('Failed to load faculty list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);

  const confirmMakeHOD = async () => {
    setMakeHODLoading(true);
    try {
      await collegeAdminAPI.makeHOD(makeHODModal.id);
      toast(`${makeHODModal.name} promoted to HOD!`, 'success');
      setMakeHODModal({ open: false, id: null, name: '', dept: '' });
      fetchFaculty();
    } catch (err) {
      toast(err.response?.data?.message || 'Promotion failed.', 'error');
    } finally {
      setMakeHODLoading(false);
    }
  };

  const confirmTransfer = async () => {
    if (!newDept.trim()) { toast('Please enter your new department.', 'warning'); return; }
    setTransferLoading(true);
    try {
      await collegeAdminAPI.transfer(transferModal.id, newDept.trim());
      toast(`Admin role transferred! You have been logged out securely.`, 'success', 5000);
      setTransferModal({ open: false, id: null, name: '' });
      setTimeout(() => window.location.href = '/login', 2500);
    } catch (err) {
      toast(err.response?.data?.message || 'Transfer failed.', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  const filtered = allFaculty.filter(f =>
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.email?.toLowerCase().includes(search.toLowerCase()) ||
    f.department?.toLowerCase().includes(search.toLowerCase())
  );

  const deptGroups = filtered.reduce((acc, f) => {
    const d = f.department || 'Other';
    if (!acc[d]) acc[d] = [];
    acc[d].push(f);
    return acc;
  }, {});

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Faculty & Roles</h2>
          <p className={styles.pageSub}>Assign HODs and manage administrative hierarchy</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchFaculty} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Database size={17} className={styles.cardHeaderIcon} />
            <h3 className={styles.cardTitle}>All College Faculty</h3>
          </div>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input type="text" className={styles.searchInput} placeholder="Search faculty..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? <div className={styles.tableLoader}><div className={styles.spinner} /></div> :
        filtered.length === 0 ? <Empty text="No faculty found." /> :
        Object.entries(deptGroups).map(([dept, members]) => (
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
                  {members.map(f => (
                    <tr key={f._id}>
                      <td>
                        <div className={styles.nameCell}>
                          <div className={styles.miniAvatar}>{(f.name||'U')[0].toUpperCase()}</div>
                          <p style={{color:'var(--text-1)',fontWeight:500}}>{f.name}</p>
                        </div>
                      </td>
                      <td className={styles.mutedCell}>{f.email}</td>
                      <td>
                        <span className={`${styles.badge} ${f.role === 'collegeAdmin' ? styles.badgeCA : f.role === 'hod' ? styles.badgeHOD : styles.badgeFaculty}`}>
                           {f.role === 'collegeAdmin' ? <><Crown size={11} /> College Admin</> : f.role === 'hod' ? <><Shield size={11} /> HOD</> : 'Faculty'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionBtns}>
                          {f.role === 'faculty' && (
                            <button className={`${styles.actionBtn} ${styles.hodBtn}`} onClick={() => setMakeHODModal({ open: true, id: f._id, name: f.name, dept: f.department })}>
                              <Crown size={12} /> Make HOD
                            </button>
                          )}
                          {f.role !== 'collegeAdmin' && (
                            <button className={`${styles.actionBtn} ${styles.transferBtn}`} onClick={() => { setNewDept(''); setTransferModal({ open: true, id: f._id, name: f.name }); }}>
                              <ArrowRightLeft size={12} /> Transfer Admin
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Prompts exactly as before */}
      <Modal isOpen={makeHODModal.open} onClose={() => !makeHODLoading && setMakeHODModal({ open: false, id: null, name: '', dept: '' })} title="Promote to HOD" footer={<><button className={styles.cancelModalBtn} onClick={() => setMakeHODModal({ open: false, id: null, name: '', dept: '' })} disabled={makeHODLoading}>Cancel</button><button className={styles.successModalBtn} onClick={confirmMakeHOD} disabled={makeHODLoading}>{makeHODLoading ? 'Promoting...' : 'Confirm Promotion'}</button></>}>
        <div className={styles.modalConfirmBox}>
          <Crown size={28} color="var(--success)" style={{marginBottom:10}}/>
          <p className={styles.modalConfirmText}>Promote <strong>{makeHODModal.name}</strong> to <strong>Head of Department</strong>{makeHODModal.dept ? ` — ${makeHODModal.dept}` : ''}.</p>
          <p className={styles.modalConfirmSub}>They will receive an email notification indicating their new administrative scope.</p>
        </div>
      </Modal>

      <Modal isOpen={transferModal.open} onClose={() => !transferLoading && setTransferModal({ open: false, id: null, name: '' })} title="Transfer College Admin Role" footer={<><button className={styles.cancelModalBtn} onClick={() => setTransferModal({ open: false, id: null, name: '' })} disabled={transferLoading}>Cancel</button><button className={styles.dangerModalBtn} onClick={confirmTransfer} disabled={transferLoading}>{transferLoading ? 'Transferring...' : 'Transfer & Demote Myself'}</button></>}>
        <div className={styles.modalAlertDanger}>
          <AlertTriangle size={16} />
          <div><strong>Irreversible.</strong><p style={{marginTop:'4px',fontWeight:400}}><strong>{transferModal.name}</strong> becomes the new College Admin. You will lose all admin privileges.</p></div>
        </div>
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Your new department <span style={{color:'var(--danger)'}}>*</span></label>
          <select className={styles.modalInput} value={newDept} onChange={e => setNewDept(e.target.value)} disabled={transferLoading}>
            <option value="" disabled>Select your new department...</option>
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </div>
      </Modal>
    </div>
  );
};


/* ══════════════════════════════════════════════════════
   College Admin OVERVIEW (Includes Approvals)
══════════════════════════════════════════════════════ */
const CollegeAdminHome = () => {
  const { toast } = useToast();
  const [pending, setPending] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [approvingId, setApprovingId] = useState(null);
  
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, name: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const appRes = await facultyAPI.getApprovals();
      const d = appRes.data?.data || {};
      setPending(Array.isArray(d.pending) ? d.pending : []);
      setRejected(Array.isArray(d.rejected) ? d.rejected : []);
    } catch {
      toast('Failed to load dashboard data.', 'error');
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
      toast(`✓ ${name} approved!`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Approval failed.', 'error');
      setApprovingId(null);
    }
  };

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

  const listMap = { pending, rejected };
  const currentList = listMap[tab] || [];

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Admin Overview</h2>
          <p className={styles.pageSub}>Action required on incoming faculty registrations</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchApprovals} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.amber}`}>
          <div className={styles.statIconWrap}><Clock size={20} /></div>
          <div><p className={styles.statValue}>{loading ? '…' : pending.length}</p><p className={styles.statLabel}>Pending Approvals</p></div>
        </div>
        <div className={`${styles.statCard} ${styles.red}`}>
          <div className={styles.statIconWrap}><XCircle size={20} /></div>
          <div><p className={styles.statValue}>{loading ? '…' : rejected.length}</p><p className={styles.statLabel}>Rejected Registrations</p></div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <UserCheck size={17} className={styles.cardHeaderIcon} />
            <h3 className={styles.cardTitle}>Faculty Registration Queue</h3>
          </div>
          <div className={styles.tabBar}>
            {['pending', 'rejected'].map(t => (
              <button key={t} className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)} <span className={styles.tabCount}>{listMap[t].length}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className={styles.tableLoader}><div className={styles.spinner} /></div> :
        currentList.length === 0 ? <Empty text={`No ${tab} requests at this time.`} /> :
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                {tab !== 'rejected' && <th>Email</th>}
                <th>Department</th>
                {tab === 'rejected' && <th>Reason</th>}
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
                    <td className={styles.mutedCell}>{item.department || '—'}</td>
                    {tab === 'rejected' && <td className={styles.reasonCell}>{item.rejectedReason || 'N/A'}</td>}
                    {tab === 'pending' && (
                      <td>
                        <div className={styles.actionBtns}>
                          <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={() => handleApprove(item._id, item.name)} disabled={!!approvingId}>
                            {isApproving ? <span className={styles.btnSpinner} /> : <CheckCircle2 size={13} />} Approve
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
        </div>}
      </div>

      <Modal isOpen={rejectModal.open} onClose={() => !rejectLoading && setRejectModal({ open: false, id: null, name: '' })} title={`Reject — ${rejectModal.name}`} footer={<><button className={styles.cancelModalBtn} onClick={() => setRejectModal({ open: false, id: null, name: '' })} disabled={rejectLoading}>Cancel</button><button className={styles.dangerModalBtn} onClick={confirmReject} disabled={rejectLoading}>{rejectLoading ? 'Rejecting...' : 'Confirm Rejection'}</button></>}>
        <div className={styles.modalAlertWarn}><AlertTriangle size={16} /> This permanently deletes the request and emails the applicant.</div>
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Rejection Reason <span style={{color:'var(--danger)'}}>*</span></label>
          <textarea className={styles.modalTextarea} rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} disabled={rejectLoading} />
        </div>
      </Modal>
    </div>
  );
};

const Empty = ({ text }) => (
  <div className={styles.empty}>
    <span className={styles.emptyIcon}>📭</span>
    <p className={styles.emptyText}>{text}</p>
  </div>
);

/* ══ Dashboard shell ══ */
const CollegeAdminDashboard = () => {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetch = () => facultyAPI.getApprovals().then(r => setPendingCount(r.data?.data?.pending?.length || 0)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const navItems = [
    { path: '/collegeadmin',             label: 'Overview',    icon: <Home size={18} />, badge: pendingCount },
    { path: '/collegeadmin/departments', label: 'Departments', icon: <Building2 size={18} /> },
    { path: '/collegeadmin/faculty',     label: 'Faculty',     icon: <Users size={18} /> },
    { path: '/collegeadmin/settings',    label: 'Settings',    icon: <SettingsIcon size={18} /> },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <Routes>
        <Route path="/"            element={<CollegeAdminHome />} />
        <Route path="/departments" element={<CollegeAdminDepartments />} />
        <Route path="/faculty"     element={<CollegeAdminFaculty />} />
        <Route path="/settings"    element={<Settings />} />
      </Routes>
    </DashboardLayout>
  );
};

export default CollegeAdminDashboard;
