import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { timetableAPI, facultyAPI } from '../../api/client';
import client from '../../api/client';
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

  /* ── Manage Exam Access ── */
  const [accessModal, setAccessModal] = useState({ open: false, examId: null, examName: '' });
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [isTokenGenerated, setIsTokenGenerated] = useState(false);

  const handleManageAccess = (exam) => {
    setAccessModal({ open: true, examId: exam._id, examName: exam.subjectName });
    // Initialize state from existing database values if the exam already has them
    setQrCodeUrl(exam.qrCode || null);
    setIsTokenGenerated(!!exam.token);
  };

  const handleGenerateToken = async () => {
    setIsGeneratingToken(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await client.post(
        `/faculty/hod/exams/${accessModal.examId}/generate-token`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast(res.data.message || 'Token generated successfully', 'success');
        setIsTokenGenerated(true);
        fetchData(); // refresh timetable data so next time we open, it persists
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to generate token', 'error');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!isTokenGenerated) {
      toast('Please generate the exam token first.', 'warning');
      return;
    }
    setIsGeneratingQR(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await client.post(
        `/faculty/hod/exams/${accessModal.examId}/generate-qr`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success && res.data.qrCode) {
        toast(res.data.message || 'QR generated successfully', 'success');
        setQrCodeUrl(res.data.qrCode);
        fetchData(); // refresh timetable data so the qr persist
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to generate QR', 'error');
    } finally {
      setIsGeneratingQR(false);
    }
  };

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
    const incomplete = formData.examDetails.some(e => !e.subjectName || !e.subjectCode || !e.date || !e.startTime || !e.endTime || !e.assignedFaculty);
    if (incomplete) {
      toast('All exam fields including assigned faculty are required.', 'warning');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        course: formData.course,
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

  const handleAddExamClick = (t) => {
    setNewExam({ subjectName: '', subjectCode: '', date: '', startTime: '', endTime: '', maxMarks: 30, assignedFaculty: '' });
    setAddExamModal({ open: true, timetableId: t._id, timetableName: `${t.examType} - Sem ${t.semester}` });
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
              onManageAccess={handleManageAccess}
            />
          )}
        </div>
      </div>

      {/* ── Create Timetable Modal ── */}
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
          <TimetableMetaForm formData={formData} onChange={setFormData} />

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
                />
              ))}
            </div>

            <AddSubjectButton onClick={addExamRow} />
          </div>
        </div>
      </Modal>

      {/* ── Add Exam to Existing Timetable Modal ── */}
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
            onChange={(field, value) => setNewExam({ ...newExam, [field]: value })}
            onRemove={() => {}}
            facultyList={deptFaculty}
          />
        </div>
      </Modal>

      {/* ── Manage Exam Access Modal ── */}
      <Modal
        isOpen={accessModal.open}
        onClose={() => !isGeneratingToken && !isGeneratingQR && setAccessModal({ open: false, examId: null, examName: '' })}
        title={`Access Controls: ${accessModal.examName}`}
        footer={<button className={styles.cancelModalBtn} onClick={() => setAccessModal({ open: false, examId: null, examName: '' })}>Close</button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 0' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerateToken}
              disabled={isGeneratingToken}
              className={styles.primaryModalBtn}
              style={{ minWidth: '180px', display: 'flex', justifyContent: 'center' }}
            >
              {isGeneratingToken ? "Generating..." : (isTokenGenerated ? "Regenerate Exam Token" : "Generate Exam Token")}
            </button>
            <button
              onClick={handleGenerateQR}
              disabled={!isTokenGenerated || isGeneratingQR}
              className={styles.successModalBtn}
              style={{ minWidth: '180px', display: 'flex', justifyContent: 'center' }}
            >
              {isGeneratingQR ? "Generating..." : (qrCodeUrl ? "Regenerate QR Code" : "Generate QR Code")}
            </button>
          </div>

          {qrCodeUrl && (
            <div style={{ 
              marginTop: '8px', 
              padding: '24px', 
              border: '1px solid var(--border-base)', 
              borderRadius: '12px', 
              backgroundColor: 'var(--surface-1)', 
              alignSelf: 'stretch',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '16px' }}>
                Scan to Access the Exam
              </p>
              <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <img 
                  src={qrCodeUrl} 
                  alt="Exam Access QR Code" 
                  style={{ width: '180px', height: '180px', display: 'block', objectFit: 'contain' }}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Timetables;
