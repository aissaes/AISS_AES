import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Plus, RefreshCw, Edit, ShieldAlert, Archive, Check } from 'lucide-react';
import { hodAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './HODDashboard.module.css';

const Semesters = () => {
  const { toast } = useToast();
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, id: null, semesterName: '', academicYear: '', semesterNumber: 1 });
  const [submitting, setSubmitting] = useState(false);

  // Form states for creation
  const [semesterNumber, setSemesterNumber] = useState(1);
  const [semesterName, setSemesterName] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');

  const fetchSemesters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hodAPI.getSemesters();
      setSemesters(res.data.semesters || []);
    } catch {
      toast('Failed to load semesters.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  const handleCreate = async () => {
    if (!semesterName.trim() || !academicYear.trim()) {
      toast('All fields are required.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await hodAPI.createSemester({ semesterNumber, semesterName, academicYear });
      toast('Semester created successfully!', 'success');
      setCreateModal(false);
      setSemesterName('');
      setSemesterNumber(1);
      fetchSemesters();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create semester.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editModal.semesterName.trim() || !editModal.academicYear.trim()) {
      toast('All fields are required.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await hodAPI.updateSemester(editModal.id, {
        semesterName: editModal.semesterName,
        academicYear: editModal.academicYear,
      });
      toast('Semester updated successfully!', 'success');
      setEditModal({ open: false, id: null, semesterName: '', academicYear: '', semesterNumber: 1 });
      fetchSemesters();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update semester.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (semesterId, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await hodAPI.toggleSemester(semesterId, nextStatus);
      toast(`Semester set to ${nextStatus}.`, 'success');
      fetchSemesters();
    } catch (err) {
      toast('Failed to toggle semester status.', 'error');
    }
  };

  const handleArchive = async (semesterId) => {
    try {
      await hodAPI.toggleSemester(semesterId, 'Archived');
      toast('Semester archived successfully.', 'info');
      fetchSemesters();
    } catch (err) {
      toast('Failed to archive semester.', 'error');
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Semester Management</h2>
          <p className={styles.pageSub}>Manage academic semesters, status logs, and active semesters</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={styles.refreshBtn} onClick={fetchSemesters} disabled={loading}>
            <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
          </button>
          <button className={styles.refreshBtn} onClick={() => setCreateModal(true)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 2px 8px var(--accent-glow)' }}>
            <Plus size={15} /> Create Semester
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Calendar size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Academic Semesters</h3>
              <p className={styles.cardSub}>Listing semesters configured in your department branch</p>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div className={styles.tableLoader}><div className={styles.spinner} /></div>
          ) : semesters.length === 0 ? (
            <div className={styles.empty}>
              <Calendar size={36} style={{ color: 'var(--text-3)', display: 'block', margin: '0 auto 12px auto' }} />
              <p className={styles.emptyText}>No semesters configured yet. Create one to begin course mapping.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Semester Number</th>
                    <th>Semester Name</th>
                    <th>Academic Year</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {semesters.map(sem => (
                    <tr key={sem._id}>
                      <td><strong>Sem {sem.semesterNumber}</strong></td>
                      <td style={{ color: 'var(--text-1)', fontWeight: 600 }}>{sem.semesterName}</td>
                      <td className={styles.mutedCell}>{sem.academicYear}</td>
                      <td>
                        <span className={`${styles.badge} ${sem.status === 'Active' ? styles.badgeSuccess : styles.badgeDanger}`}>
                          {sem.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionBtns} style={{ justifyContent: 'flex-end' }}>
                          <button
                            className={styles.actionBtn}
                            onClick={() => setEditModal({ open: true, id: sem._id, semesterName: sem.semesterName, academicYear: sem.academicYear, semesterNumber: sem.semesterNumber })}
                          >
                            <Edit size={13} /> Edit
                          </button>
                          <button
                            className={`${styles.actionBtn} ${sem.status === 'Active' ? styles.rejectBtn : styles.approveBtn}`}
                            onClick={() => handleToggle(sem._id, sem.status)}
                          >
                            {sem.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.rejectBtn}`}
                            onClick={() => handleArchive(sem._id)}
                            style={{ background: 'rgba(239, 68, 68, 0.04)' }}
                          >
                            <Archive size={13} /> Archive
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
      </div>

      {/* ── Create Semester Modal ── */}
      <Modal
        isOpen={createModal}
        onClose={() => !submitting && setCreateModal(false)}
        title="Configure Academic Semester"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setCreateModal(false)} disabled={submitting}>Cancel</button>
            <button className={styles.successModalBtn} onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Semester'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={styles.formRow}>
            <label>Semester Number (1 to 8)</label>
            <select className={styles.formInput} value={semesterNumber} onChange={e => setSemesterNumber(Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}
            </select>
          </div>
          <div className={styles.formRow}>
            <label>Semester Title Name</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. Semester 5 (Fall 2026)"
              value={semesterName}
              onChange={e => setSemesterName(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <label>Academic Year</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. 2026-2027"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* ── Edit Semester Modal ── */}
      <Modal
        isOpen={editModal.open}
        onClose={() => !submitting && setEditModal({ open: false, id: null, semesterName: '', academicYear: '', semesterNumber: 1 })}
        title={`Edit Sem ${editModal.semesterNumber}`}
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setEditModal({ open: false, id: null, semesterName: '', academicYear: '', semesterNumber: 1 })} disabled={submitting}>Cancel</button>
            <button className={styles.successModalBtn} onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={styles.formRow}>
            <label>Semester Title Name</label>
            <input
              type="text"
              className={styles.formInput}
              value={editModal.semesterName}
              onChange={e => setEditModal(prev => ({ ...prev, semesterName: e.target.value }))}
            />
          </div>
          <div className={styles.formRow}>
            <label>Academic Year</label>
            <input
              type="text"
              className={styles.formInput}
              value={editModal.academicYear}
              onChange={e => setEditModal(prev => ({ ...prev, academicYear: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Semesters;
