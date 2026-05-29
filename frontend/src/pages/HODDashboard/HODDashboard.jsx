import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Home, Settings as SettingsIcon, Users, BookOpen,
  CheckCircle2, Clock, XCircle, ArrowRightLeft,
  UserCheck, AlertTriangle, RefreshCw, FileText,
  UserPlus, Upload, Trash2, Search, FileSpreadsheet, AlertCircle
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


/* ══════════════════════════════════════════════════════
   HOD MANAGE STUDENTS TAB (WITH CSV BULK UPLOAD)
══════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════
   HOD MANAGE STUDENTS TAB (ASSIGNMENT & COURSE ENROLLMENT)
══════════════════════════════════════════════════════ */
const HODStudents = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Course & Department locked from HOD info
  const [hodInfo, setHodInfo] = useState(null);

  // Assign modal state
  const [assignModal, setAssignModal] = useState(false);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Unassign modal state
  const [unassignModal, setUnassignModal] = useState({ open: false, id: null, name: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await hodAPI.getStudents();
      setStudents(Array.isArray(data.students) ? data.students : []);
    } catch {
      toast('Error loading student directory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchHODInfo = useCallback(async () => {
    try {
      const { data } = await facultyAPI.getMe();
      setHodInfo(data.faculty || null);
    } catch {}
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchHODInfo();
  }, [fetchStudents, fetchHODInfo]);

  // Load students not currently assigned to this course
  const fetchUnassignedStudents = async () => {
    setAssignLoading(true);
    try {
      const { data } = await hodAPI.getStudents({ unassigned: true });
      setUnassignedStudents(Array.isArray(data.students) ? data.students : []);
    } catch (err) {
      toast('Error loading unassigned college students.', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  const openAssignModal = () => {
    setSelectedIds([]);
    setAssignSearch('');
    setAssignModal(true);
    fetchUnassignedStudents();
  };

  const handleToggleSelect = (studentId) => {
    setSelectedIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleAssignSubmit = async () => {
    if (selectedIds.length === 0) {
      toast('Please select at least one student to assign.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const res = await hodAPI.assignStudents(selectedIds);
      toast(res.data.message || `Successfully assigned ${selectedIds.length} students to ${hodInfo?.course}!`, 'success');
      setAssignModal(false);
      fetchStudents(); // Refresh main list
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to assign students.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnassignSubmit = async () => {
    setActionLoading(true);
    try {
      const res = await hodAPI.unassignStudents([unassignModal.id]);
      toast(res.data.message || `Student ${unassignModal.name} unassigned successfully.`, 'info');
      setUnassignModal({ open: false, id: null, name: '' });
      fetchStudents(); // Refresh main list
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to unassign student.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Search filtering for active HOD student list
  const filteredStudents = students.filter(s => {
    const term = search.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(term) ||
      (s.rollNumber || '').toLowerCase().includes(term) ||
      (s.email || '').toLowerCase().includes(term)
    );
  });

  // Search filtering for unassigned students checklist
  const filteredUnassigned = unassignedStudents.filter(s => {
    const term = assignSearch.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(term) ||
      (s.rollNumber || '').toLowerCase().includes(term) ||
      (s.email || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className={styles.pageWrap}>
      {/* Page Header */}
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Course Enrollment</h2>
          <p className={styles.pageSub}>
            Overview and manage student registrations for {hodInfo?.course} ({hodInfo?.department} HOD).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={styles.refreshBtn} onClick={fetchStudents} disabled={loading}>
            <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
          </button>
          <button className={styles.refreshBtn} onClick={openAssignModal} style={{ background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 2px 8px var(--accent-glow)' }}>
            <UserPlus size={15} /> Assign Students
          </button>
        </div>
      </div>

      {/* Analytics Banner */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.statIconWrap}><Users size={20} /></div>
          <div>
            <p className={styles.statValue}>{loading ? '…' : students.length}</p>
            <p className={styles.statLabel}>Total Enrolled Students</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.statIconWrap}><BookOpen size={20} /></div>
          <div>
            <p className={styles.statValue} style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
              {hodInfo?.course || '—'}
            </p>
            <p className={styles.statLabel}>Active Course Jurisdiction</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.amber}`}>
          <div className={styles.statIconWrap}><Clock size={20} /></div>
          <div>
            <p className={styles.statValue} style={{ fontSize: '1.25rem' }}>
              {hodInfo?.department || '—'}
            </p>
            <p className={styles.statLabel}>Department Branch</p>
          </div>
        </div>
      </div>

      {/* Directory Search & List */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Users size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Student Database Directory</h3>
              <p className={styles.cardSub}>List of all registered students inside your course group</p>
            </div>
          </div>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-3)' }} />
            <input
              type="text"
              className={styles.formInput}
              style={{ paddingLeft: 32, height: 38, background: 'rgba(0,0,0,0.18)' }}
              placeholder="Search name, roll, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.tableLoader}><div className={styles.spinner} /></div>
        ) : filteredStudents.length === 0 ? (
          <Empty text={search ? "No students matching your search criteria." : "No students assigned to your course yet. Click Assign Students to register them."} />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll Number</th>
                  <th>Email</th>
                  <th>Semester</th>
                  <th>Enrolled Courses</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student._id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.miniAvatar} style={{ background: 'linear-gradient(135deg, var(--warning), var(--danger))' }}>
                          {(student.name || 'S')[0].toUpperCase()}
                        </div>
                        {student.name}
                      </div>
                    </td>
                    <td><strong>{student.rollNumber}</strong></td>
                    <td className={styles.mutedCell}>{student.email}</td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>
                        Sem {student.semester}
                      </span>
                    </td>
                    <td className={styles.mutedCell}>
                      {Array.isArray(student.courses) && student.courses.length > 0
                        ? student.courses.join(', ')
                        : (student.course || '—')}
                    </td>
                    <td>
                      <div className={styles.actionBtns} style={{ justifyContent: 'flex-end' }}>
                        <button 
                          className={`${styles.actionBtn} ${styles.rejectBtn}`}
                          onClick={() => setUnassignModal({ open: true, id: student._id, name: student.name })}
                        >
                          <Trash2 size={13} /> Unassign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ASSIGN STUDENTS */}
      <Modal
        isOpen={assignModal}
        onClose={() => !actionLoading && setAssignModal(false)}
        title={`Enroll Students into ${hodInfo?.course || 'Course'}`}
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setAssignModal(false)} disabled={actionLoading}>
              Cancel
            </button>
            <button className={styles.successModalBtn} onClick={handleAssignSubmit} disabled={actionLoading || selectedIds.length === 0}>
              {actionLoading ? 'Assigning...' : `Confirm Enrollment (${selectedIds.length})`}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.modalAlertWarn} style={{ margin: 0 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <div>
              Enroll college students into the active course group <strong>({hodInfo?.course})</strong>. These students will then gain access to syllabus, timetables, and question script uploads.
            </div>
          </div>

          {/* Search bar inside check-list */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-3)' }} />
            <input
              type="text"
              className={styles.formInput}
              style={{ paddingLeft: 32, height: 38, background: 'rgba(0,0,0,0.18)' }}
              placeholder="Search college students by name, roll, email..."
              value={assignSearch}
              onChange={e => setAssignSearch(e.target.value)}
              disabled={actionLoading}
            />
          </div>

          {/* Check-list container */}
          {assignLoading ? (
            <div className={styles.tableLoader}><div className={styles.spinner} /></div>
          ) : filteredUnassigned.length === 0 ? (
            <Empty text="No eligible students found in the college roster for enrollment." />
          ) : (
            <div 
              style={{
                border: '1px solid var(--border-base)',
                borderRadius: '8px',
                maxHeight: '260px',
                overflowY: 'auto',
                background: 'rgba(0,0,0,0.22)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {filteredUnassigned.map(student => {
                const isSelected = selectedIds.includes(student._id);
                return (
                  <div 
                    key={student._id}
                    onClick={() => !actionLoading && handleToggleSelect(student._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      background: isSelected ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                      disabled={actionLoading}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '13px' }}>
                        {student.name} <span style={{ fontWeight: 500, color: 'var(--text-3)', fontSize: '11px', marginLeft: 6 }}>(Sem {student.semester})</span>
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        Roll: <strong style={{ color: 'var(--text-2)' }}>{student.rollNumber}</strong> · {student.email}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL: UNASSIGN CONFIRMATION */}
      <Modal
        isOpen={unassignModal.open}
        onClose={() => !actionLoading && setUnassignModal({ open: false, id: null, name: '' })}
        title="Unenroll Student from Course"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setUnassignModal({ open: false, id: null, name: '' })} disabled={actionLoading}>
              Cancel
            </button>
            <button className={styles.dangerModalBtn} onClick={handleUnassignSubmit} disabled={actionLoading}>
              {actionLoading ? 'Unenrolling...' : 'Confirm Unenrollment'}
            </button>
          </>
        }
      >
        <div className={styles.modalAlertWarn} style={{ margin: 0 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>Are you sure you want to unenroll {unassignModal.name} from {hodInfo?.course || 'this course'}?</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: 400, color: '#fca5a5' }}>
              The student's record will remain in the college system, but they will be removed from your active course group immediately.
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

  useEffect(() => {
    const fetch = () => facultyAPI.getApprovals().then(r => setPendingCount(r.data?.data?.pending?.length || 0)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const navItems = [
    { path: '/hod',            label: 'Overview',        icon: <Home         size={18} />, badge: pendingCount },
    { path: '/hod/faculty',    label: 'Manage Faculty',  icon: <Users        size={18} /> },
    { path: '/hod/students',   label: 'Manage Students', icon: <Users        size={18} /> },
    { path: '/hod/timetables', label: 'Timetables',      icon: <BookOpen     size={18} /> },
    { path: '/hod/papers',     label: 'Question Papers', icon: <FileText     size={18} /> },
    { path: '/hod/settings',   label: 'Settings',        icon: <SettingsIcon size={18} /> },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <Routes>
        <Route path="/"           element={<HODHome />} />
        <Route path="/faculty"    element={<HODFaculty />} />
        <Route path="/students"   element={<HODStudents />} />
        <Route path="/timetables" element={<Timetables />} />
        <Route path="/papers"     element={<QuestionPapers />} />
        <Route path="/settings"   element={<Settings />} />
      </Routes>
    </DashboardLayout>
  );
};

export default HODDashboard;
