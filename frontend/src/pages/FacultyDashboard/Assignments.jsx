import React, { useEffect, useState } from 'react';
import { FileText, BookOpen, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { questionPaperAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import QuestionPaperBuilder from '../../components/QuestionPaperBuilder/QuestionPaperBuilder';
import styles from './FacultyDashboard.module.css';

const Assignments = () => {
  const { toast } = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Draft Modal state ── */
  const [draftModal, setDraftModal] = useState({ open: false, examId: null, examName: '', paperId: null, isRevision: false });
  const [builderData, setBuilderData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  /* ── Fetch ── */
  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await questionPaperAPI.getAssignments();
      setExams(res.data.exams || []);
    } catch {
      toast('Failed to load your assignments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Open draft modal (new or revision) ── */
  const openDraft = async (exam, isRevision = false) => {
    let paperData = null;

    if (isRevision && exam.questionPaper?._id) {
      try {
        toast('Loading previous paper data...', 'info');
        const res = await questionPaperAPI.getById(exam.questionPaper._id);
        paperData = { paper: res.data.paper, isRevision: true };
      } catch {
        toast('Failed to load paper details for revision.', 'error');
        return;
      }
    }

    setBuilderData(paperData);
    setDraftModal({
      open: true,
      examId: exam._id,
      examName: `${exam.subjectName} (${exam.subjectCode})`,
      paperId: exam.questionPaper?._id || null,
      isRevision
    });
  };

  /* ── Submit paper ── */
  const handleSubmit = async (payload) => {
    const hasContent = payload.sections.some(sec => sec.some(q => q.text.trim()));
    if (!hasContent) { toast('Please add at least one question.', 'warning'); return; }

    setSubmitting(true);
    try {
      if (draftModal.isRevision && draftModal.paperId) {
        await questionPaperAPI.update(draftModal.paperId, payload);
        toast('Paper revised and resubmitted for review!', 'success');
      } else {
        await questionPaperAPI.upload({ examId: draftModal.examId, ...payload });
        toast('Question paper submitted for HOD review!', 'success');
      }

      closeDraftModal();
      fetchExams();
    } catch (err) {
      toast(err.response?.data?.message || 'Submission failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const closeDraftModal = () => {
    setDraftModal({ open: false, examId: null, examName: '', paperId: null, isRevision: false });
    setBuilderData(null);
  };

  const getStatusInfo = (exam) => {
    if (!exam.questionPaper) return { label: 'Not Submitted', color: '', canDraft: true, canRevise: false };
    const s = exam.questionPaper.status;
    if (s === 'Approved') return { label: 'Approved', color: styles.badgeApproved, canDraft: false, canRevise: false };
    if (s === 'Rejected') return { label: 'Rejected', color: styles.badgeDanger, canDraft: false, canRevise: true, feedback: exam.questionPaper.feedback };
    return { label: 'Pending Review', color: styles.badgePending, canDraft: false, canRevise: false };
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <div>
            <h2 className={styles.bannerTitle}>Question Paper Assignments</h2>
            <p className={styles.bannerRole}>Draft, submit, and track your assigned examination papers</p>
          </div>
        </div>
        <button className={styles.ghostBtn} onClick={fetchExams} disabled={loading}>
          <RefreshCw size={14} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft || ''}>
            <BookOpen size={18} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>My Exam Assignments</h3>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? <div className={styles.spinner} style={{ margin: 'auto' }} /> : exams.length === 0 ? (
            <div className={styles.emptyCenter}>
              <span className={styles.emptyIcon}>📋</span>
              <p className={styles.emptyText}>You have no assigned exams yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {exams.map(exam => {
                const status = getStatusInfo(exam);
                return (
                  <div key={exam._id} className={styles.examItem}>
                    <div style={{ flex: 1 }}>
                      <h4 className={styles.examTitle}>
                        {exam.subjectName} <span className={styles.examCode}>{exam.subjectCode}</span>
                      </h4>
                      <p className={styles.examMeta}>
                        <Clock size={13} /> {new Date(exam.date).toLocaleDateString()} · Max Marks: {exam.maxMarks}
                      </p>
                      {status.feedback && (
                        <div className={styles.modalAlertDanger} style={{ marginTop: 10, marginBottom: 0, padding: '8px 12px' }}>
                          <AlertTriangle size={14} />
                          <p style={{ margin: 0 }}><strong>HOD Feedback:</strong> {status.feedback}</p>
                        </div>
                      )}
                    </div>
                    <div className={styles.actionBtns || ''} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`${styles.badge || ''} ${status.color}`} style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{status.label}</span>
                      {status.canDraft && (
                        <button className={styles.primaryBtn} onClick={() => openDraft(exam)}>
                          <FileText size={14} /> Draft Paper
                        </button>
                      )}
                      {status.canRevise && (
                        <button className={styles.primaryBtn} onClick={() => openDraft(exam, true)} style={{ background: 'var(--warning)' }}>
                          <FileText size={14} /> Revise Paper
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Draft Modal ── */}
      <Modal
        isOpen={draftModal.open}
        onClose={() => !submitting && closeDraftModal()}
        title={draftModal.isRevision ? `Revise: ${draftModal.examName}` : `Draft: ${draftModal.examName}`}
        className={styles.wideModal}
      >
        <QuestionPaperBuilder
          initialData={builderData}
          onCancel={closeDraftModal}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </Modal>
    </div>
  );
};

export default Assignments;