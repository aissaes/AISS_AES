import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { timetableAPI, facultyAPI, hodAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import TimetableDisplay from '../../components/TimetableDisplay/TimetableDisplay';
import { ExamForm, TimetableMetaForm, AddSubjectButton } from '../../components/TimetableEditor/TimetableEditor';
import styles from './HODDashboard.module.css';

const Timetables = () => {
  const { toast } = useToast();
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptFaculty, setDeptFaculty] = useState([]);

  // Refactored lists
  const [semestersList, setSemestersList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [addExamCoursesList, setAddExamCoursesList] = useState([]);

  // Create timetable modal
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    course: '',
    semester: '',
    examType: 'Mid Semester Examination',
    examDetails: [{
      courseId: '', subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: ''
    }]
  });

  // Add exam to existing timetable modal
  const [addExamModal, setAddExamModal] = useState({ open: false, timetableId: null, timetableName: '' });
  const [addingExam, setAddingExam] = useState(false);
  const [newExam, setNewExam] = useState({
    courseId: '', subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: ''
  });

  const [qrModal, setQrModal] = useState({ open: false, qrUrl: '', title: '', token: '' });
  const [deleteExamConfirm, setDeleteExamConfirm] = useState({ open: false, id: null, subjectName: '' });

  /* -- Fetch data -- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ttRes, facRes, semRes] = await Promise.all([
        timetableAPI.getAll(),
        facultyAPI.getDeptFaculty().catch(() => ({ data: { faculty: [] } })),
        hodAPI.getSemesters().catch(() => ({ data: { semesters: [] } }))
      ]);
      setTimetables(ttRes.data.timetables || []);
      setDeptFaculty(Array.isArray(facRes.data?.faculty) ? facRes.data.faculty : []);
      // Only list Active Semesters
      setSemestersList(Array.isArray(semRes.data?.semesters) ? semRes.data.semesters.filter(s => s.status === 'Active') : []);
    } catch {
      toast('Failed to load timetables.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load courses dynamically when create modal's selected semester changes
  useEffect(() => {
    if (formData.semester) {
      hodAPI.getCourses({ semesterId: formData.semester })
        .then(res => {
          setCoursesList(res.data?.courses || []);
        })
        .catch(() => {
          setCoursesList([]);
        });
    } else {
      setCoursesList([]);
    }
  }, [formData.semester]);

  /* -- Create timetable -- */
  const handleCreate = async () => {
    if (!formData.semester) {
      toast('Please select a semester.', 'warning');
      return;
    }
    const incomplete = formData.examDetails.some(e => !e.courseId || !e.date || !e.startTime || !e.endTime || !e.assignedFaculty);
    if (incomplete) {
      toast('All exam fields including course and assigned faculty are required.', 'warning');
      return;
    }

    setCreating(true);
    try {
      // Find selected semester to send its name as the legacy course fallback if needed
      const activeSem = semestersList.find(s => s._id === formData.semester);
      const payload = {
        semester: formData.semester,
        examType: formData.examType,
        examDetails: formData.examDetails.map(exam => ({
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
      course: '', semester: '', examType: 'Mid Semester Examination',
      examDetails: [{ courseId: '', subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: '' }]
    });
  };

  /* -- Add exam to existing timetable -- */
  const handleAddExam = async () => {
    if (!newExam.courseId || !newExam.date || !newExam.startTime || !newExam.endTime || !newExam.assignedFaculty) {
      toast('All fields including course and assigned faculty are required.', 'warning');
      return;
    }
    setAddingExam(true);
    try {
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
      setNewExam({ courseId: '', subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: '' });
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add exam.', 'error');
    } finally {
      setAddingExam(false);
    }
  };

  /* -- Delete exam -- */
  const handleDeleteExam = async (examId, subjectName) => {
    setDeleteExamConfirm({ open: true, id: examId, subjectName });
  };

  const confirmDeleteExam = async () => {
    const { id: examId, subjectName } = deleteExamConfirm;
    setDeleteExamConfirm({ open: false, id: null, subjectName: '' });
    try {
      await timetableAPI.deleteExam(examId);
      toast(`${subjectName} deleted.`, 'info');
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed.', 'error');
    }
  };

  /* -- Generate Token & QR Code -- */
  const handleGenerateQR = async (examId) => {
    try {
      toast('Generating secure exam token and QR code...', 'info');
      const res = await timetableAPI.generateExamQR(examId);
      toast('Exam Token and QR code generated successfully!', 'success');
      fetchData(); // reload

      setQrModal({
        open: true,
        qrUrl: res.data.qrCode,
        title: 'Exam Script QR Scanner',
        token: res.data.token
      });
    } catch (err) {
      toast(err.response?.data?.message || 'Generation failed.', 'error');
    }
  };

  /* -- Form helpers -- */
  const addExamRow = () => {
    setFormData(d => ({
      ...d,
      examDetails: [...d.examDetails, { courseId: '', subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: '' }]
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

  const handleAddExamClick = (t) => {
    const semId = t.semester?._id || t.semester;
    setNewExam({ courseId: '', subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: '' });
    setAddExamModal({ open: true, timetableId: t._id, timetableName: `${t.examType} - ${t.semester?.semesterName || ''}` });

    if (semId) {
      hodAPI.getCourses({ semesterId: semId })
        .then(res => {
          setAddExamCoursesList(res.data?.courses || []);
        })
        .catch(() => {
          setAddExamCoursesList([]);
        });
    } else {
      setAddExamCoursesList([]);
    }
  };

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
          {loading ? (
            <div className={styles.tableLoader}><div className={styles.spinner} /></div>
          ) : (
            <TimetableDisplay
              timetables={timetables}
              role="HOD"
              onAddExam={handleAddExamClick}
              onDeleteExam={handleDeleteExam}
              onGenerateQR={handleGenerateQR}
              onViewQR={(url, name, tok) => setQrModal({ open: true, qrUrl: url, title: name, token: tok })}
            />
          )}
        </div>
      </div>

      {/* -- Create Timetable Modal -- */}
      <Modal
        isOpen={createModal}
        onClose={() => !creating && setCreateModal(false)}
        title="Create New Timetable"
        className={styles.wideModal}
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
          <TimetableMetaForm formData={formData} onChange={setFormData} semestersList={semestersList} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border-1)', paddingBottom: 8 }}>
              <h4 style={{ color: 'var(--text-1)', fontSize: 14 }}>Exam Subjects ({formData.examDetails.length})</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formData.examDetails.map((exam, i) => (
                <ExamForm
                  key={i}
                  exam={exam}
                  index={i}
                  onChange={(field, value) => updateExamRow(i, field, value)}
                  onRemove={() => removeExamRow(i)}
                  canRemove={formData.examDetails.length > 1}
                  facultyList={deptFaculty}
                  coursesList={coursesList}
                />
              ))}
            </div>

            <AddSubjectButton onClick={addExamRow} />
          </div>
        </div>
      </Modal>

      {/* -- Add Exam to Existing Timetable Modal -- */}
      <Modal
        isOpen={addExamModal.open}
        onClose={() => !addingExam && setAddExamModal({ open: false, timetableId: null, timetableName: '' })}
        title={`Add Exam to ${addExamModal.timetableName}`}
        className={styles.wideModal}
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setAddExamModal({ open: false, timetableId: null, timetableName: '' })} disabled={addingExam}>Cancel</button>
            <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={handleAddExam} disabled={addingExam}>
              {addingExam ? 'Adding…' : 'Add & Notify Faculty'}
            </button>
          </>
        }
      >
        <div style={{ padding: '10px 0' }}>
          <ExamForm
            exam={newExam}
            index={0}
            onChange={(field, value) => setNewExam(prev => ({ ...prev, [field]: value }))}
            onRemove={() => {}}
            canRemove={false}
            facultyList={deptFaculty}
            coursesList={addExamCoursesList}
          />
        </div>
      </Modal>

      {/* -- View QR Code Modal -- */}
      <Modal
        isOpen={qrModal.open}
        onClose={() => setQrModal({ open: false, qrUrl: '', title: '', token: '' })}
        title={qrModal.title}
        footer={
          <button className={styles.cancelModalBtn} onClick={() => setQrModal({ open: false, qrUrl: '', title: '', token: '' })}>Close</button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '20px 0' }}>
          <p style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', maxWidth: 400 }}>
            Students can scan this QR code with their mobile cameras or the AISS mobile app to automatically join and upload their answer scripts!
          </p>
          {qrModal.qrUrl && (
            <div style={{ padding: 16, backgroundColor: 'white', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }}>
              <img src={qrModal.qrUrl} alt="Exam QR Code" style={{ width: 240, height: 240, display: 'block' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-3)', letterSpacing: 0.5 }}>EXAM TOKEN</span>
            <span style={{ fontSize: 24, fontWeight: '900', color: 'var(--primary)', letterSpacing: 1 }}>{qrModal.token}</span>
          </div>
        </div>
      </Modal>

      {/* -- Delete Exam Confirmation Modal -- */}
      <Modal
        isOpen={deleteExamConfirm.open}
        onClose={() => setDeleteExamConfirm({ open: false, id: null, subjectName: '' })}
        title="Delete Exam"
        size="sm"
        footer={
          <>
            <button
              style={{ padding: '9px 20px', borderRadius: 8, background: 'none', border: '1px solid var(--border-2)', color: 'var(--text-2)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
              onClick={() => setDeleteExamConfirm({ open: false, id: null, subjectName: '' })}
            >
              Cancel
            </button>
            <button
              style={{ padding: '9px 20px', borderRadius: 8, background: 'var(--danger)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
              onClick={confirmDeleteExam}
            >
              Delete Exam
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-2)', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Are you sure you want to delete <strong>"{deleteExamConfirm.subjectName}"</strong>? This will also delete any uploaded question paper for this exam.
        </p>
      </Modal>
    </div>
  );
};

export default Timetables;
