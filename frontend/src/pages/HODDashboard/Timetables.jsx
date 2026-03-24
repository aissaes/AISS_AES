import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Plus, Clock, RefreshCw, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { timetableAPI, facultyAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './HODDashboard.module.css';

/* ══════════════════════════════════════════════════════
   HOD TIMETABLE MANAGEMENT

   Workflow:
   1. HOD creates a timetable (course, semester, examType)
   2. HOD adds exams with subject details + assigns a faculty member
   3. Backend emails the assigned faculty automatically
   4. Faculty then sees their assignment in their dashboard
   5. HOD can also add more exams to an existing timetable
══════════════════════════════════════════════════════ */

const Timetables = () => {
  const { toast } = useToast();
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptFaculty, setDeptFaculty] = useState([]);

  // Create timetable modal
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    course: 'B.Tech',
    semester: 1,
    examType: 'Mid Semester Examination',
    examDetails: [{
      subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: ''
    }]
  });

  // Add exam to existing timetable modal
  const [addExamModal, setAddExamModal] = useState({ open: false, timetableId: null, timetableName: '' });
  const [addingExam, setAddingExam] = useState(false);
  const [newExam, setNewExam] = useState({
    subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: ''
  });

  // Expanded timetable tracking
  const [expandedId, setExpandedId] = useState(null);

  /* ── Fetch data ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ttRes, facRes] = await Promise.all([
        timetableAPI.getAll(),
        facultyAPI.getDeptFaculty().catch(() => ({ data: { faculty: [] } }))
      ]);
      setTimetables(ttRes.data.timetables || []);
      setDeptFaculty(Array.isArray(facRes.data?.faculty) ? facRes.data.faculty : []);
    } catch {
      toast('Failed to load timetables.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Create timetable ── */
  const handleCreate = async () => {
    // Validate
    const incomplete = formData.examDetails.some(e => !e.subjectName || !e.subjectCode || !e.date || !e.startTime || !e.endTime || !e.assignedFaculty);
    if (incomplete) {
      toast('All exam fields including assigned faculty are required.', 'warning');
      return;
    }

    setCreating(true);
    try {
      // Create a formatted payload for Mongoose
      const payload = {
        course: formData.course,
        semester: formData.semester,
        examType: formData.examType,
        exams: formData.examDetails.map(exam => ({
          ...exam,
          date: new Date(exam.date),
          startTime: new Date(`${exam.date}T${exam.startTime}:00`),
          endTime: new Date(`${exam.date}T${exam.endTime}:00`),
          maxMarks: Number(exam.maxMarks)
        }))
      };

      await timetableAPI.create(payload);
      toast('Timetable created! Assigned faculty have been notified via email.', 'success');
      setCreateModal(false);
      resetCreateForm();
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Creation failed.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setFormData({
      course: 'B.Tech', semester: 1, examType: 'Mid Semester Examination',
      examDetails: [{ subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: '' }]
    });
  };

  /* ── Add exam to existing timetable ── */
  const handleAddExam = async () => {
    if (!newExam.subjectName || !newExam.subjectCode || !newExam.date || !newExam.startTime || !newExam.endTime || !newExam.assignedFaculty) {
      toast('All fields including assigned faculty are required.', 'warning');
      return;
    }
    setAddingExam(true);
    try {
      // Create a formatted payload for Mongoose
      const payload = {
        ...newExam,
        date: new Date(newExam.date),
        startTime: new Date(`${newExam.date}T${newExam.startTime}:00`),
        endTime: new Date(`${newExam.date}T${newExam.endTime}:00`),
        maxMarks: Number(newExam.maxMarks)
      };

      await timetableAPI.addExam(addExamModal.timetableId, payload);
      toast('Exam added! The assigned faculty has been notified.', 'success');
      setAddExamModal({ open: false, timetableId: null, timetableName: '' });
      setNewExam({ subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: '' });
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add exam.', 'error');
    } finally {
      setAddingExam(false);
    }
  };

  /* ── Delete exam ── */
  const handleDeleteExam = async (examId, subjectName) => {
    if (!window.confirm(`Delete "${subjectName}"? This will also delete any uploaded question paper for this exam.`)) return;
    try {
      await timetableAPI.deleteExam(examId);
      toast(`${subjectName} deleted.`, 'info');
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed.', 'error');
    }
  };

  /* ── Form helpers ── */
  const addExamRow = () => {
    setFormData(d => ({
      ...d,
      examDetails: [...d.examDetails, { subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: '' }]
    }));
  };

  const removeExamRow = (i) => {
    if (formData.examDetails.length <= 1) return;
    setFormData(d => ({ ...d, examDetails: d.examDetails.filter((_, idx) => idx !== i) }));
  };

  const updateExamRow = (i, field, value) => {
    setFormData(d => {
      const next = [...d.examDetails];
      next[i] = { ...next[i], [field]: value };
      return { ...d, examDetails: next };
    });
  };

  /* ── Faculty select component ── */
  const FacultySelect = ({ value, onChange, style = {} }) => (
    <select className={styles.formInput || styles.modalInput} value={value} onChange={e => onChange(e.target.value)} style={{ fontSize: 13, ...style }}>
      <option value="">Select Faculty…</option>
      {deptFaculty.map(f => (
        <option value={f._id} key={f._id}>{f.name} ({f.email})</option>
      ))}
    </select>
  );

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Timetable Management</h2>
          <p className={styles.pageSub}>Create exam timetables and assign faculty to prepare question papers</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={styles.refreshBtn} onClick={fetchData} disabled={loading}>
            <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
          </button>
          <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={() => setCreateModal(true)}>
            <Plus size={15} /> Create Timetable
          </button>
        </div>
      </div>

      {/* Timetable List */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Calendar size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Department Timetables</h3>
              <p className={styles.cardSub}>{timetables.length} timetable{timetables.length !== 1 ? 's' : ''} created</p>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? <div className={styles.tableLoader}><div className={styles.spinner} /></div> :
          timetables.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📅</span>
              <p className={styles.emptyText}>No timetables created yet. Click "Create Timetable" to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {timetables.map(t => {
                const isExpanded = expandedId === t._id;
                return (
                  <div key={t._id} style={{ border: '1px solid var(--border-2)', borderRadius: 10, background: 'var(--surface-2)', overflow: 'hidden' }}>
                    {/* Timetable header */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : t._id)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div>
                        <h4 style={{ color: 'var(--text-0)', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {t.examType}
                          <span className={`${styles.badge} ${styles.badgeHOD}`}>{t.exams?.length || 0} Exams</span>
                        </h4>
                        <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
                          {t.course} — Semester {t.semester}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          className={styles.actionBtn}
                          onClick={e => {
                            e.stopPropagation();
                            setNewExam({ subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: '' });
                            setAddExamModal({ open: true, timetableId: t._id, timetableName: `${t.examType} - Sem ${t.semester}` });
                          }}
                          style={{ fontSize: 12 }}
                        >
                          <Plus size={13} /> Add Exam
                        </button>
                        {isExpanded ? <ChevronUp size={18} color="var(--text-3)" /> : <ChevronDown size={18} color="var(--text-3)" />}
                      </div>
                    </div>

                    {/* Expanded exam list */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border-2)' }}>
                        <div className={styles.tableWrap}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Subject</th>
                                <th>Code</th>
                                <th>Date</th>
                                <th>Marks</th>
                                <th>Assigned To</th>
                                <th>Paper Status</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {t.exams?.map(e => (
                                <tr key={e._id}>
                                  <td style={{ color: 'var(--text-1)', fontWeight: 500 }}>{e.subjectName}</td>
                                  <td className={styles.mutedCell}>
                                    <span style={{ padding: '2px 8px', background: 'var(--bg-3)', borderRadius: 12, fontSize: 12 }}>{e.subjectCode}</span>
                                  </td>
                                  <td className={styles.mutedCell}>{new Date(e.date).toLocaleDateString()}</td>
                                  <td className={styles.mutedCell}>{e.maxMarks}</td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <Users size={13} color="var(--primary)" />
                                      <span style={{ color: 'var(--text-1)', fontSize: 13 }}>{e.assignedFaculty?.name || 'Unassigned'}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`${styles.badge} ${e.isPaperQuestionUploaded ? styles.badgeSuccess : styles.badgeWarning}`}>
                                      {e.isPaperQuestionUploaded ? 'Uploaded' : 'Awaiting'}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      onClick={() => handleDeleteExam(e._id, e.subjectName)}
                                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                                      title="Delete exam"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Timetable Modal ── */}
      <Modal
        isOpen={createModal}
        onClose={() => !creating && setCreateModal(false)}
        title="Create New Timetable"
        size="lg"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => { setCreateModal(false); resetCreateForm(); }} disabled={creating}>Cancel</button>
            <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : 'Create & Notify Faculty'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '10px 0' }}>
          {/* Timetable meta */}
          <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border-base)' }}>
            <h4 style={{ color: 'var(--text-1)', fontSize: 14, marginBottom: 12 }}>Timetable Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className={styles.formRow || styles.modalField}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, display: 'block' }}>Course</label>
                <input className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} value={formData.course} onChange={e => setFormData({ ...formData, course: e.target.value })} />
              </div>
              <div className={styles.formRow || styles.modalField}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, display: 'block' }}>Semester</label>
                <input type="number" min="1" max="8" className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} value={formData.semester} onChange={e => setFormData({ ...formData, semester: Number(e.target.value) })} />
              </div>
              <div className={styles.formRow || styles.modalField} style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, display: 'block' }}>Exam Type</label>
                <select className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} value={formData.examType} onChange={e => setFormData({ ...formData, examType: e.target.value })}>
                  <option>Mid Semester Examination</option>
                  <option>End Semester Examination</option>
                  <option>Special Mid Semester Examination</option>
                  <option>Special End Semester Examination</option>
                </select>
              </div>
            </div>
          </div>

          {/* Exam rows */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border-1)', paddingBottom: 8 }}>
              <h4 style={{ color: 'var(--text-1)', fontSize: 14 }}>Exam Subjects ({formData.examDetails.length})</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formData.examDetails.map((exam, i) => (
                <div key={i} style={{ padding: 18, background: 'var(--surface-1)', borderRadius: 12, border: '1px solid var(--border-base)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Subject {i + 1}</span>
                    {formData.examDetails.length > 1 && (
                      <button onClick={() => removeExamRow(i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button>
                    )}
                  </div>
                  
                  {/* Name and Code */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject Name</label>
                      <input className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} placeholder="e.g. Advanced Networks" value={exam.subjectName} onChange={e => updateExamRow(i, 'subjectName', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject Code</label>
                      <input className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} placeholder="CS401" value={exam.subjectCode} onChange={e => updateExamRow(i, 'subjectCode', e.target.value)} />
                    </div>
                  </div>

                  {/* Time and Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
                        <input type="date" className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} value={exam.date} onChange={e => updateExamRow(i, 'date', e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Time</label>
                        <input type="time" className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} value={exam.startTime} onChange={e => updateExamRow(i, 'startTime', e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Time</label>
                        <input type="time" className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} value={exam.endTime} onChange={e => updateExamRow(i, 'endTime', e.target.value)} />
                    </div>
                  </div>

                  {/* Marks and Assignment */}
                  <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 2.2fr', gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Marks</label>
                        <input type="number" className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} value={exam.maxMarks} onChange={e => updateExamRow(i, 'maxMarks', Number(e.target.value))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}><Users size={13} /> Assign Faculty (Emailed)</label>
                      <FacultySelect value={exam.assignedFaculty} onChange={val => updateExamRow(i, 'assignedFaculty', val)} style={{ padding: '10px 14px', width: '100%', borderRadius: 8, background: 'var(--bg-3)', color: 'var(--text-1)', border: '1px solid var(--border-base)' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addExamRow} style={{
              marginTop: 12, padding: '8px 16px', borderRadius: 8,
              background: 'var(--primary-dim, rgba(99,102,241,0.1))', color: 'var(--primary)',
              border: '1px dashed var(--primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Plus size={14} /> Add Another Subject
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add Exam to Existing Timetable Modal ── */}
      <Modal
        isOpen={addExamModal.open}
        onClose={() => !addingExam && setAddExamModal({ open: false, timetableId: null, timetableName: '' })}
        title={`Add Exam to ${addExamModal.timetableName}`}
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setAddExamModal({ open: false, timetableId: null, timetableName: '' })} disabled={addingExam}>Cancel</button>
            <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={handleAddExam} disabled={addingExam}>
              {addingExam ? 'Adding…' : 'Add & Notify Faculty'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject Name</label>
              <input className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} placeholder="e.g. Algorithms" value={newExam.subjectName} onChange={e => setNewExam({ ...newExam, subjectName: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject Code</label>
              <input className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} placeholder="CS101" value={newExam.subjectCode} onChange={e => setNewExam({ ...newExam, subjectCode: e.target.value })} />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label><input type="date" className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} value={newExam.date} onChange={e => setNewExam({ ...newExam, date: e.target.value })} /></div>
            <div><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start</label><input type="time" className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} value={newExam.startTime} onChange={e => setNewExam({ ...newExam, startTime: e.target.value })} /></div>
            <div><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End</label><input type="time" className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} value={newExam.endTime} onChange={e => setNewExam({ ...newExam, endTime: e.target.value })} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 2.2fr', gap: 12 }}>
            <div><label style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Marks</label><input type="number" className={styles.formInput || styles.modalInput} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)', width: '100%' }} value={newExam.maxMarks} onChange={e => setNewExam({ ...newExam, maxMarks: Number(e.target.value) })} /></div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}><Users size={12} /> Assign Faculty</label>
              <FacultySelect value={newExam.assignedFaculty} onChange={val => setNewExam({ ...newExam, assignedFaculty: val })} style={{ padding: '10px 14px', width: '100%', borderRadius: 8, background: 'var(--bg-3)', color: 'var(--text-1)', border: '1px solid var(--border-base)' }} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Timetables;
