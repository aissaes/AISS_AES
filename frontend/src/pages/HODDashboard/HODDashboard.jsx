import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Home, Settings as SettingsIcon, Users, BookOpen,
  CheckCircle2, Clock, XCircle, ArrowRightLeft,
  UserCheck, AlertTriangle, RefreshCw, FileText,
  UserPlus, Upload, Trash2, Search, FileSpreadsheet, AlertCircle, Calendar, Edit
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import Modal from '../../components/Modal/Modal';
import Settings from '../Settings/Settings';
import { facultyAPI, hodAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Timetables from './Timetables';
import QuestionPapers from './QuestionPapers';
import Semesters from './Semesters';
import Courses from './Courses';
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

const HODStudents = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Course & HOD details
  const [hodInfo, setHodInfo] = useState(null);

  // Semesters & Courses lists for the wizard
  const [semestersList, setSemestersList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);

  // Multi-step Wizard States
  const [assignModal, setAssignModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [wizardStudents, setWizardStudents] = useState([]);
  const [wizardSearch, setWizardSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Unenroll modal states
  const [unenrollModal, setUnenrollModal] = useState({ open: false, studentId: null, studentName: '', courseId: '', courses: [] });

  // Student Edit Modal states
  const [editStudentModal, setEditStudentModal] = useState({
    open: false,
    studentId: null,
    studentName: '',
    semesterId: '',
    academicYear: '',
    selectedCourses: [],
    availableCourses: []
  });

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

  const handleEditClick = async (student) => {
    setActionLoading(true);
    try {
      const semRes = await hodAPI.getSemesters();
      const activeSemesters = (semRes.data.semesters || []).filter(s => s.status === 'Active');
      setSemestersList(activeSemesters);

      const crsRes = await hodAPI.getCourses();
      const allCourses = crsRes.data.courses || [];

      setEditStudentModal({
        open: true,
        studentId: student._id,
        studentName: student.name,
        semesterId: student.semester?._id || student.semester || '',
        academicYear: student.semester?.academicYear || '2026-2027',
        selectedCourses: (student.courses || []).map(c => c._id || c),
        availableCourses: allCourses
      });
    } catch {
      toast('Failed to load edit metadata.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    setActionLoading(true);
    try {
      const payload = {
        studentId: editStudentModal.studentId,
        semesterId: editStudentModal.semesterId,
        courseIds: editStudentModal.selectedCourses,
        academicYear: editStudentModal.academicYear
      };
      await hodAPI.updateStudentAcademics(payload);
      toast('Student academic details updated successfully!', 'success');
      setEditStudentModal(prev => ({ ...prev, open: false }));
      fetchStudents();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update student academic details.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

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

  // Load wizard initial data (semesters)
  const openAssignModal = async () => {
    setWizardStep(1);
    setSelectedSemester('');
    setSelectedCourses([]);
    setSelectedStudentIds([]);
    setWizardSearch('');
    setAssignModal(true);
    setActionLoading(true);
    try {
      const semRes = await hodAPI.getSemesters();
      const activeSemesters = (semRes.data.semesters || []).filter(s => s.status === 'Active');
      setSemestersList(activeSemesters);
    } catch {
      toast('Failed to load active semesters.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Step transitions
  const handleSemesterSelect = async (semId) => {
    setSelectedSemester(semId);
    setSelectedCourses([]);
    setActionLoading(true);
    try {
      const crsRes = await hodAPI.getCourses({ semesterId: semId });
      setCoursesList(crsRes.data.courses || []);
      setWizardStep(2);
    } catch {
      toast('Failed to fetch courses for this semester.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCoursesNext = async () => {
    if (selectedCourses.length === 0) {
      toast('Please select at least one course.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      // Load all students in the department to choose from
      const stdRes = await hodAPI.getStudents();
      setWizardStudents(stdRes.data.students || []);
      setWizardStep(3);
    } catch {
      toast('Failed to fetch department student roster.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCourseSelection = (courseId) => {
    setSelectedCourses(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = (filteredIds) => {
    if (selectedStudentIds.length === filteredIds.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredIds);
    }
  };

  const handleAssignSubmit = async () => {
    if (selectedStudentIds.length === 0) {
      toast('Please select at least one student.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        studentIds: selectedStudentIds,
        semesterId: selectedSemester,
        courseIds: selectedCourses
      };
      await hodAPI.assignStudents(payload);
      toast(`Successfully enrolled ${selectedStudentIds.length} students.`, 'success');
      setAssignModal(false);
      fetchStudents();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to complete assignment.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnenrollClick = (student) => {
    setUnenrollModal({
      open: true,
      studentId: student._id,
      studentName: student.name,
      courseId: '',
      courses: student.courses || []
    });
  };

  const handleUnenrollSubmit = async () => {
    setActionLoading(true);
    try {
      await hodAPI.unassignStudents(
        [unenrollModal.studentId],
        unenrollModal.courseId || undefined
      );
      toast('Student unenrolled successfully.', 'success');
      setUnenrollModal({ open: false, studentId: null, studentName: '', courseId: '', courses: [] });
      fetchStudents();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to unenroll student.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filters
  const filteredStudents = students.filter(s => {
    const term = search.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(term) ||
      (s.rollNumber || '').toLowerCase().includes(term) ||
      (s.email || '').toLowerCase().includes(term)
    );
  });

  const filteredWizardStudents = wizardStudents.filter(s => {
    const term = wizardSearch.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(term) ||
      (s.rollNumber || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className={styles.pageWrap}>
      {/* Page Header */}
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Student Enrollment</h2>
          <p className={styles.pageSub}>
            Overview and manage student course assignments under the {hodInfo?.department} department.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={styles.refreshBtn} onClick={fetchStudents} disabled={loading}>
            <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
          </button>
          <button className={styles.refreshBtn} onClick={openAssignModal} style={{ background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 2px 8px var(--accent-glow)' }}>
            <UserPlus size={15} /> Enroll Students
          </button>
        </div>
      </div>

      {/* Directory Search & List */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Users size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Student Enrollment Directory</h3>
              <p className={styles.cardSub}>Roster of department students and their active relational assignments</p>
            </div>
          </div>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
            <input
              type="text"
              className={styles.formInput}
              style={{ paddingLeft: 36, height: 38, background: 'rgba(0,0,0,0.18)' }}
              placeholder="Search by name or roll number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.tableLoader}><div className={styles.spinner} /></div>
        ) : filteredStudents.length === 0 ? (
          <Empty text={search ? "No students matching your search criteria." : "No students assigned to your department branch yet."} />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll Number</th>
                  <th>Active Semester</th>
                  <th>Enrolled Courses</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student._id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.miniAvatar} style={{ background: 'linear-gradient(135deg, var(--accent), #10b981)' }}>
                          {(student.name || 'S')[0].toUpperCase()}
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{student.name}</span>
                          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><strong style={{ color: 'var(--text-2)', letterSpacing: '0.5px' }}>{student.rollNumber}</strong></td>
                    <td>
                      {student.semester ? (
                        <span className={`${styles.badge} ${styles.badgeWarning}`}>
                          Sem {student.semester.semesterNumber || student.semester}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-3)', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 350 }}>
                        {Array.isArray(student.courses) && student.courses.length > 0 ? (
                          student.courses.map((course, idx) => (
                            <span
                              key={course._id || idx}
                              className={styles.badge}
                              style={{
                                background: 'rgba(99, 102, 241, 0.08)',
                                borderColor: 'rgba(99, 102, 241, 0.25)',
                                color: 'var(--accent-light)',
                                fontSize: '11px',
                                padding: '2px 8px'
                              }}
                              title={course.courseName || course}
                            >
                              {course.courseCode || course}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-3)', fontStyle: 'italic', fontSize: '12px' }}>No enrollments</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.actionBtns} style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleEditClick(student)}
                          style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-1)' }}
                        >
                          <Edit size={13} /> Edit
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.rejectBtn}`}
                          onClick={() => handleUnenrollClick(student)}
                          style={{ padding: '5px 12px' }}
                        >
                          <Trash2 size={13} /> Unenroll
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

      {/* ── MULTI-STEP WIZARD MODAL ── */}
      <Modal
        isOpen={assignModal}
        onClose={() => !actionLoading && setAssignModal(false)}
        title="Student Assignment ERP Wizard"
        className={styles.wideModal}
        footer={
          <div style={{ display: 'flex', justifySelf: 'stretch', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {wizardStep > 1 && (
                <button
                  className={styles.cancelModalBtn}
                  onClick={() => setWizardStep(prev => prev - 1)}
                  disabled={actionLoading}
                >
                  Back
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className={styles.cancelModalBtn}
                onClick={() => setAssignModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              {wizardStep === 2 && (
                <button
                  className={styles.successModalBtn}
                  onClick={handleCoursesNext}
                  disabled={actionLoading || selectedCourses.length === 0}
                >
                  Continue
                </button>
              )}
              {wizardStep === 3 && (
                <button
                  className={styles.successModalBtn}
                  onClick={() => setWizardStep(4)}
                  disabled={actionLoading || selectedStudentIds.length === 0}
                >
                  Review
                </button>
              )}
              {wizardStep === 4 && (
                <button
                  className={styles.successModalBtn}
                  onClick={handleAssignSubmit}
                  disabled={actionLoading}
                  style={{ background: 'var(--accent)', boxShadow: '0 2px 8px var(--accent-glow)' }}
                >
                  {actionLoading ? 'Enrolling...' : 'Confirm & Save'}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: '340px' }}>
          {/* Step Progress Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-base)', margin: '0 10px' }}>
            {[
              { num: 1, label: 'Semester', icon: <Calendar size={14} /> },
              { num: 2, label: 'Courses', icon: <BookOpen size={14} /> },
              { num: 3, label: 'Students', icon: <Users size={14} /> },
              { num: 4, label: 'Review', icon: <CheckCircle2 size={14} /> }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: wizardStep >= step.num ? 1 : 0.4, transition: 'all 0.3s ease' }}>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: wizardStep === step.num ? 'var(--accent)' : wizardStep > step.num ? 'var(--success)' : 'rgba(255,255,255,0.06)',
                    color: wizardStep >= step.num ? '#fff' : 'var(--text-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: wizardStep === step.num ? '0 0 10px var(--accent-glow)' : 'none'
                  }}>
                    {wizardStep > step.num ? '✓' : step.num}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: wizardStep === step.num ? 'bold' : '500', color: wizardStep === step.num ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {step.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    background: wizardStep > step.num ? 'var(--success)' : 'var(--border-base)',
                    margin: '0 10px',
                    opacity: 0.5
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {actionLoading && wizardStep === 1 && (
            <div className={styles.tableLoader}><div className={styles.spinner} /></div>
          )}

          {/* STEP 1: SELECT SEMESTER */}
          {!actionLoading && wizardStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className={styles.modalAlertWarn} style={{ margin: 0 }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <div>
                  Please select the academic semester for student enrollment. Only <strong>Active</strong> configured semesters in your department are listed.
                </div>
              </div>
              {semestersList.length === 0 ? (
                <div style={{ padding: '40px 10px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>No active semesters found. Please configure active semesters in the "Semesters" panel first.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 6 }}>
                  {semestersList.map(sem => (
                    <div
                      key={sem._id}
                      onClick={() => handleSemesterSelect(sem._id)}
                      style={{
                        padding: '16px 20px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-base)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        e.currentTarget.style.borderColor = 'var(--border-base)';
                      }}
                    >
                      <span style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {sem.academicYear}
                      </span>
                      <strong style={{ fontSize: '15px', color: 'var(--text-1)' }}>{sem.semesterName}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Sem Number: {sem.semesterNumber}</span>
                        <span className={`${styles.badge} ${styles.badgeSuccess}`} style={{ fontSize: '10px', padding: '1px 6px' }}>Active</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SELECT COURSES */}
          {wizardStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                Select the course(s) that target students will be registered into:
              </div>
              {coursesList.length === 0 ? (
                <div style={{ padding: '40px 10px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>No courses configured for this semester yet. Map courses in "Courses" panel first.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                  {coursesList.map(crs => {
                    const isSelected = selectedCourses.includes(crs._id);
                    return (
                      <div
                        key={crs._id}
                        onClick={() => toggleCourseSelection(crs._id)}
                        style={{
                          padding: '14px 16px',
                          background: isSelected ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-base)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          boxShadow: isSelected ? '0 0 12px rgba(99,102,241,0.15)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: '11px', color: 'var(--accent-light)', fontWeight: 'bold' }}>{crs.courseCode}</span>
                          <strong style={{ fontSize: '13px', color: isSelected ? 'var(--text-1)' : 'var(--text-2)' }}>{crs.courseName}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{crs.credits} Credits · {crs.assignedFaculty?.name || 'Instructor Unassigned'}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // toggled by card click
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SELECT STUDENTS */}
          {wizardStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>Select students to enroll in selected courses:</span>
                <div style={{ position: 'relative', width: 220 }}>
                  <Search size={12} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-3)' }} />
                  <input
                    type="text"
                    className={styles.formInput}
                    style={{ paddingLeft: 30, height: 32, fontSize: '12px' }}
                    placeholder="Filter roster..."
                    value={wizardSearch}
                    onChange={e => setWizardSearch(e.target.value)}
                  />
                </div>
              </div>

              {wizardStudents.length === 0 ? (
                <Empty text="No student roster found." />
              ) : (
                <div style={{ border: '1px solid var(--border-base)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-base)', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={filteredWizardStudents.length > 0 && selectedStudentIds.length === filteredWizardStudents.length}
                        onChange={() => handleSelectAllStudents(filteredWizardStudents.map(s => s._id))}
                        style={{ cursor: 'pointer', width: 15, height: 15 }}
                      />
                      <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-3)' }}>Select All ({filteredWizardStudents.length} matches)</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: 'bold' }}>{selectedStudentIds.length} Selected</span>
                  </div>

                  <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)' }}>
                    {filteredWizardStudents.map(student => {
                      const isSelected = selectedStudentIds.includes(student._id);
                      return (
                        <div
                          key={student._id}
                          onClick={() => toggleStudentSelection(student._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderBottom: '1px solid rgba(255,255,255,0.02)',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(99,102,241,0.04)' : 'transparent',
                            transition: 'all 0.1s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ cursor: 'pointer', width: 14, height: 14 }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontWeight: 600, fontSize: '12.5px', color: isSelected ? 'var(--text-1)' : 'var(--text-2)' }}>{student.name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Roll: <strong>{student.rollNumber}</strong> · active: {student.semester?.semesterName || 'None'}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{student.email}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {wizardStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className={styles.modalAlertWarn} style={{ margin: 0, background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.22)', color: '#a7f3d0' }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0, color: 'var(--success)' }} />
                <div>
                  Please review the assignment enrollment. Clicking <strong>Confirm & Save</strong> will update the students' active academic semesters and write structural course enrollment mappings in the database.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-base)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-3)', textTransform: 'uppercase' }}>Target Semester</span>
                  <strong style={{ fontSize: '14px', color: 'var(--text-1)' }}>
                    {semestersList.find(s => s._id === selectedSemester)?.semesterName || 'Selected Semester'}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--warning)' }}>
                    Academic Year: {semestersList.find(s => s._id === selectedSemester)?.academicYear}
                  </span>
                </div>

                <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-base)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-3)', textTransform: 'uppercase' }}>Students Selected</span>
                  <strong style={{ fontSize: '18px', color: 'var(--success)' }}>
                    {selectedStudentIds.length} Students
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedStudentIds.map(id => wizardStudents.find(s => s._id === id)?.name).join(', ')}
                  </span>
                </div>
              </div>

              <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-base)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-3)', textTransform: 'uppercase' }}>Courses Mapped</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {selectedCourses.map(cId => {
                    const crs = coursesList.find(c => c._id === cId);
                    return (
                      <span
                        key={cId}
                        className={styles.badge}
                        style={{
                          background: 'rgba(99,102,241,0.08)',
                          borderColor: 'rgba(99,102,241,0.22)',
                          color: 'var(--accent-light)',
                          fontSize: '11.5px',
                          padding: '3px 10px'
                        }}
                      >
                        {crs ? `${crs.courseCode} - ${crs.courseName}` : cId}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* UNENROLL MODAL */}
      <Modal
        isOpen={unenrollModal.open}
        onClose={() => !actionLoading && setUnenrollModal({ open: false, studentId: null, studentName: '', courseId: '', courses: [] })}
        title={`Unenroll — ${unenrollModal.studentName}`}
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setUnenrollModal({ open: false, studentId: null, studentName: '', courseId: '', courses: [] })} disabled={actionLoading}>
              Cancel
            </button>
            <button className={styles.dangerModalBtn} onClick={handleUnenrollSubmit} disabled={actionLoading}>
              {actionLoading ? 'Unenrolling...' : 'Confirm Unenrollment'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={styles.modalAlertWarn} style={{ margin: 0 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <div>
              Specify the course context to unenroll <strong>{unenrollModal.studentName}</strong> from, or leave empty to unenroll from all department courses.
            </div>
          </div>
          <div className={styles.formRow}>
            <label>Choose Unenrollment Target Course</label>
            <select
              className={styles.formInput}
              value={unenrollModal.courseId}
              onChange={e => setUnenrollModal(prev => ({ ...prev, courseId: e.target.value }))}
              disabled={actionLoading}
            >
              <option value="">-- Unenroll From All Department Courses --</option>
              {unenrollModal.courses.map(crs => (
                <option key={crs._id || crs} value={crs._id || crs}>
                  {crs.courseCode || crs} - {crs.courseName || crs}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ── STUDENT EDIT ACADEMIC DETAILS MODAL ── */}
      <Modal
        isOpen={editStudentModal.open}
        onClose={() => !actionLoading && setEditStudentModal(prev => ({ ...prev, open: false }))}
        title={`Edit Student Academics — ${editStudentModal.studentName}`}
        className={styles.wideModal}
        footer={
          <>
            <button
              className={styles.cancelModalBtn}
              onClick={() => setEditStudentModal(prev => ({ ...prev, open: false }))}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              className={styles.successModalBtn}
              onClick={handleEditSubmit}
              disabled={actionLoading}
              style={{ background: 'var(--accent)', boxShadow: '0 2px 8px var(--accent-glow)' }}
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.modalAlertWarn} style={{ margin: 0, background: 'rgba(99, 102, 241, 0.06)', borderColor: 'rgba(99, 102, 241, 0.22)', color: '#c7d2fe' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, color: 'var(--accent-light)' }} />
            <div>
              Manage active academic profiles for <strong>{editStudentModal.studentName}</strong>. 
              Assign semesters, courses, transfer academic semesters, or update active academic years.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className={styles.formRow}>
              <label style={{ fontWeight: 600 }}>Active Semester</label>
              <select
                className={styles.formInput}
                value={editStudentModal.semesterId}
                onChange={e => {
                  const sId = e.target.value;
                  const selectedSemDoc = semestersList.find(s => s._id === sId);
                  setEditStudentModal(prev => ({
                    ...prev,
                    semesterId: sId,
                    academicYear: selectedSemDoc?.academicYear || prev.academicYear
                  }));
                }}
                disabled={actionLoading}
              >
                <option value="">-- Unassigned --</option>
                {semestersList.map(sem => (
                  <option key={sem._id} value={sem._id}>
                    Sem {sem.semesterNumber} - {sem.semesterName}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formRow}>
              <label style={{ fontWeight: 600 }}>Academic Year</label>
              <input
                type="text"
                className={styles.formInput}
                value={editStudentModal.academicYear}
                onChange={e => setEditStudentModal(prev => ({ ...prev, academicYear: e.target.value }))}
                disabled={actionLoading}
                placeholder="e.g. 2026-2027"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Enrolled Courses Mapping</label>
            {editStudentModal.availableCourses.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>No active courses defined in this department yet.</span>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', background: 'rgba(0,0,0,0.18)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-base)' }}>
                {editStudentModal.availableCourses.map(crs => {
                  const isSelected = editStudentModal.selectedCourses.includes(crs._id);
                  return (
                    <div
                      key={crs._id}
                      onClick={() => {
                        setEditStudentModal(prev => {
                          const exists = prev.selectedCourses.includes(crs._id);
                          return {
                            ...prev,
                            selectedCourses: exists
                              ? prev.selectedCourses.filter(id => id !== crs._id)
                              : [...prev.selectedCourses, crs._id]
                          };
                        });
                      }}
                      style={{
                        padding: '10px 12px',
                        background: isSelected ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-base)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '10px', color: 'var(--accent-light)', fontWeight: 'bold' }}>{crs.courseCode}</span>
                        <strong style={{ fontSize: '12px', color: isSelected ? 'var(--text-1)' : 'var(--text-2)' }}>{crs.courseName}</strong>
                        <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Sem {crs.semester?.semesterNumber || 'N/A'} · {crs.credits} Credits</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // toggled by card click
                        style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
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
    { path: '/hod/semesters',  label: 'Semesters',       icon: <Calendar     size={18} /> },
    { path: '/hod/courses',    label: 'Courses',         icon: <BookOpen     size={18} /> },
    { path: '/hod/students',   label: 'Manage Students', icon: <Users        size={18} /> },
    { path: '/hod/timetables', label: 'Timetables',      icon: <FileSpreadsheet size={18} /> },
    { path: '/hod/papers',     label: 'Question Papers', icon: <FileText     size={18} /> },
    { path: '/hod/settings',   label: 'Settings',        icon: <SettingsIcon size={18} /> },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <Routes>
        <Route path="/"           element={<HODHome />} />
        <Route path="/faculty"    element={<HODFaculty />} />
        <Route path="/semesters"  element={<Semesters />} />
        <Route path="/courses"    element={<Courses />} />
        <Route path="/students"   element={<HODStudents />} />
        <Route path="/timetables" element={<Timetables />} />
        <Route path="/papers"     element={<QuestionPapers />} />
        <Route path="/settings"   element={<Settings />} />
      </Routes>
    </DashboardLayout>
  );
};

export default HODDashboard;
