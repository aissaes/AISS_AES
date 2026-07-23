import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, Plus, RefreshCw, Edit, Trash2, UserCheck, Calendar } from 'lucide-react';
import { hodAPI, facultyAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './HODDashboard.module.css';

const Courses = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, id: null, courseName: '', credits: 3 });
  const [assignModal, setAssignModal] = useState({ open: false, courseId: null, courseName: '', facultyId: '', academicYear: '2026-2027', isReassign: false });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ open: false, id: null });

  // Form states for creation
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [credits, setCredits] = useState(3);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [crsRes, semRes, facRes] = await Promise.all([
        hodAPI.getCourses(),
        hodAPI.getSemesters(),
        facultyAPI.getDeptFaculty()
      ]);
      setCourses(crsRes.data.courses || []);
      setSemesters(semRes.data.semesters || []);
      setFacultyList(facRes.data.faculty || []);
      
      if (semRes.data.semesters?.length > 0) {
        setSemesterId(semRes.data.semesters[0]._id);
      }
    } catch {
      toast('Failed to load courses data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!courseCode.trim() || !courseName.trim() || !semesterId) {
      toast('All fields are required.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await hodAPI.createCourse({ courseCode, courseName, semesterId, credits });
      toast('Course created successfully!', 'success');
      setCreateModal(false);
      setCourseCode('');
      setCourseName('');
      setCredits(3);
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create course.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editModal.courseName.trim()) {
      toast('Course name is required.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await hodAPI.updateCourse(editModal.id, {
        courseName: editModal.courseName,
        credits: editModal.credits,
      });
      toast('Course updated successfully!', 'success');
      setEditModal({ open: false, id: null, courseName: '', credits: 3 });
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update course.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (courseId) => {
    setDeleteConfirmModal({ open: true, id: courseId });
  };

  const confirmDelete = async () => {
    const courseId = deleteConfirmModal.id;
    setDeleteConfirmModal({ open: false, id: null });
    try {
      await hodAPI.deleteCourse(courseId);
      toast('Course archived successfully.', 'info');
      fetchData();
    } catch (err) {
      toast('Failed to delete course.', 'error');
    }
  };

  const handleAssignSubmit = async () => {
    if (!assignModal.facultyId || !assignModal.academicYear.trim()) {
      toast('Please select a faculty member and academic year.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await hodAPI.assignFacultyToCourse({
        courseId: assignModal.courseId,
        facultyId: assignModal.facultyId,
        academicYear: assignModal.academicYear,
      });
      toast(assignModal.isReassign ? 'Faculty member reassigned successfully!' : 'Faculty member assigned successfully!', 'success');
      setAssignModal({ open: false, courseId: null, courseName: '', facultyId: '', academicYear: '2026-2027', isReassign: false });
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || (assignModal.isReassign ? 'Failed to reassign faculty.' : 'Failed to assign faculty.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Course Management</h2>
          <p className={styles.pageSub}>Configure academic courses, credit weightings, and teaching faculty</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={styles.refreshBtn} onClick={fetchData} disabled={loading}>
            <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
          </button>
          <button className={styles.refreshBtn} onClick={() => setCreateModal(true)} disabled={semesters.length === 0} style={{ background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 2px 8px var(--accent-glow)' }}>
            <Plus size={15} /> Add Course
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <BookOpen size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Academic Courses</h3>
              <p className={styles.cardSub}>List of all structural courses and faculty mappings</p>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div className={styles.tableLoader}><div className={styles.spinner} /></div>
          ) : courses.length === 0 ? (
            <div className={styles.empty}>
              <BookOpen size={36} style={{ color: 'var(--text-3)', display: 'block', margin: '0 auto 12px auto' }} />
              <p className={styles.emptyText}>No courses configured yet. Active semesters are required first.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course Title</th>
                    <th>Active Semester</th>
                    <th>Credits</th>
                    <th>Assigned Faculty</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(course => (
                    <tr key={course._id}>
                      <td><strong>{course.courseCode}</strong></td>
                      <td style={{ color: 'var(--text-1)', fontWeight: 600 }}>{course.courseName}</td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeWarning}`}>
                          Sem {course.semester?.semesterNumber || 'N/A'}
                        </span>
                      </td>
                      <td className={styles.mutedCell}>{course.credits} Credits</td>
                      <td>
                        {course.assignedFaculty ? (
                          <div className={styles.nameCell} style={{ fontSize: '13px' }}>
                            <div className={styles.miniAvatar} style={{ width: 22, height: 22, fontSize: 10 }}>
                              {(course.assignedFaculty.name || 'F')[0].toUpperCase()}
                            </div>
                            {course.assignedFaculty.name}
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'rgba(239, 68, 68, 0.7)', fontStyle: 'italic' }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actionBtns} style={{ justifyContent: 'flex-end' }}>
                          <button
                            className={styles.actionBtn}
                            onClick={() => setAssignModal({ open: true, courseId: course._id, courseName: course.courseName, facultyId: course.assignedFaculty?._id || '', academicYear: '2026-2027', isReassign: !!course.assignedFaculty })}
                          >
                            <UserCheck size={13} /> {course.assignedFaculty ? 'Reassign Teacher' : 'Assign Teacher'}
                          </button>
                          <button
                            className={styles.actionBtn}
                            onClick={() => setEditModal({ open: true, id: course._id, courseName: course.courseName, credits: course.credits })}
                          >
                            <Edit size={13} /> Edit
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.rejectBtn}`}
                            onClick={() => handleDelete(course._id)}
                          >
                            <Trash2 size={13} /> Archive
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

      {/* -- Add Course Modal -- */}
      <Modal
        isOpen={createModal}
        onClose={() => !submitting && setCreateModal(false)}
        title="Register New Course"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setCreateModal(false)} disabled={submitting}>Cancel</button>
            <button className={styles.successModalBtn} onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating…' : 'Add Course'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={styles.formRow}>
            <label>Course Code</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. CS301"
              value={courseCode}
              onChange={e => setCourseCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className={styles.formRow}>
            <label>Course Name / Title</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. Data Structures"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <label>Bind to Semester</label>
            <select className={styles.formInput} value={semesterId} onChange={e => setSemesterId(e.target.value)}>
              {semesters.map(sem => (
                <option key={sem._id} value={sem._id}>
                  Sem {sem.semesterNumber} - {sem.semesterName} ({sem.academicYear})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formRow}>
            <label>Credit Weighting</label>
            <input
              type="number"
              className={styles.formInput}
              min={1}
              max={6}
              value={credits}
              onChange={e => setCredits(Number(e.target.value))}
            />
          </div>
        </div>
      </Modal>

      {/* -- Edit Course Modal -- */}
      <Modal
        isOpen={editModal.open}
        onClose={() => !submitting && setEditModal({ open: false, id: null, courseName: '', credits: 3 })}
        title="Edit Course Meta"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setEditModal({ open: false, id: null, courseName: '', credits: 3 })} disabled={submitting}>Cancel</button>
            <button className={styles.successModalBtn} onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={styles.formRow}>
            <label>Course Name / Title</label>
            <input
              type="text"
              className={styles.formInput}
              value={editModal.courseName}
              onChange={e => setEditModal(prev => ({ ...prev, courseName: e.target.value }))}
            />
          </div>
          <div className={styles.formRow}>
            <label>Credit Weighting</label>
            <input
              type="number"
              className={styles.formInput}
              min={1}
              max={6}
              value={editModal.credits}
              onChange={e => setEditModal(prev => ({ ...prev, credits: Number(e.target.value) }))}
            />
          </div>
        </div>
      </Modal>

      {/* -- Assign Faculty Modal -- */}
      <Modal
        isOpen={assignModal.open}
        onClose={() => !submitting && setAssignModal({ open: false, courseId: null, courseName: '', facultyId: '', academicYear: '2026-2027', isReassign: false })}
        title={assignModal.isReassign ? `Reassign Teacher: ${assignModal.courseName}` : `Assign Teacher: ${assignModal.courseName}`}
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setAssignModal({ open: false, courseId: null, courseName: '', facultyId: '', academicYear: '2026-2027', isReassign: false })} disabled={submitting}>Cancel</button>
            <button className={styles.successModalBtn} onClick={handleAssignSubmit} disabled={submitting}>
              {submitting ? (assignModal.isReassign ? 'Reassigning…' : 'Assigning…') : (assignModal.isReassign ? 'Confirm Reassignment' : 'Confirm Assignment')}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={styles.formRow}>
            <label>Select Teaching Faculty Member</label>
            <select className={styles.formInput} value={assignModal.facultyId} onChange={e => setAssignModal(prev => ({ ...prev, facultyId: e.target.value }))}>
              <option value="">-- Choose Instructor --</option>
              {facultyList.map(fac => (
                <option key={fac._id} value={fac._id}>
                  {fac.name} ({fac.email})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formRow}>
            <label>Academic Year</label>
            <input
              type="text"
              className={styles.formInput}
              value={assignModal.academicYear}
              onChange={e => setAssignModal(prev => ({ ...prev, academicYear: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* -- Delete/Archive Confirmation Modal -- */}
      <Modal
        isOpen={deleteConfirmModal.open}
        onClose={() => setDeleteConfirmModal({ open: false, id: null })}
        title="Archive Course"
        size="sm"
        footer={
          <>
            <button
              style={{ padding: '9px 20px', borderRadius: 8, background: 'none', border: '1px solid var(--border-2)', color: 'var(--text-2)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
              onClick={() => setDeleteConfirmModal({ open: false, id: null })}
            >
              Cancel
            </button>
            <button
              style={{ padding: '9px 20px', borderRadius: 8, background: 'var(--danger)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
              onClick={confirmDelete}
            >
              Archive Course
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-2)', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Are you sure you want to archive this course? This action may affect student enrollments and faculty assignments.
        </p>
      </Modal>
    </div>
  );
};

export default Courses;
