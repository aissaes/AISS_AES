import React, { useEffect, useState, useCallback } from 'react';
import { FileText, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { questionPaperAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './HODDashboard.module.css';

/* ══════════════════════════════════════════════════════
   HOD QUESTION PAPER REVIEW
   
   Backend endpoints:
   - GET /pending  → { pendingPapers: [...] } (examId + createdBy populated)
   - GET /approved → { approvedPapers: [...] }
   - PUT /review/:paperId → { status: "Approved"|"Rejected", feedback: "..." }
   - GET /:paperId → { paper: {...} } — full paper with sections
══════════════════════════════════════════════════════ */

const QuestionPapers = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState('pending');
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review modal
  const [reviewModal, setReviewModal] = useState({ open: false, id: null, title: '' });
  const [reviewStatus, setReviewStatus] = useState('Approved');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Paper preview modal
  const [previewModal, setPreviewModal] = useState({ open: false, paper: null });
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'pending') {
        // Backend returns { pendingPapers: [...] }
        const res = await questionPaperAPI.getPending();
        setPapers(res.data.pendingPapers || []);
      } else {
        // Backend returns { approvedPapers: [...] }
        const res = await questionPaperAPI.getApproved();
        setPapers(res.data.approvedPapers || []);
      }
    } catch {
      toast(`Failed to load ${tab} question papers.`, 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  /* ── View full paper content ── */
  const handlePreview = async (paperId) => {
    setPreviewLoading(true);
    try {
      const res = await questionPaperAPI.getById(paperId);
      setPreviewModal({ open: true, paper: res.data.paper });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not load paper.', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  /* ── Submit review ── */
  const handleReview = async () => {
    if (reviewStatus === 'Rejected' && !feedback.trim()) {
      toast('Feedback is required when rejecting a paper.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      // Backend expects { status, feedback } — NOT "remarks"
      await questionPaperAPI.review(reviewModal.id, {
        status: reviewStatus,
        feedback: feedback.trim() || undefined
      });
      toast(`Paper ${reviewStatus.toLowerCase()} successfully.`, 'success');
      setReviewModal({ open: false, id: null, title: '' });
      fetchPapers();
    } catch (err) {
      toast(err.response?.data?.message || 'Review failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Question Paper Review</h2>
          <p className={styles.pageSub}>Review papers submitted by faculty for your department's exams</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchPapers} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <FileText size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Department Papers</h3>
              <p className={styles.cardSub}>Papers linked to your department's examination timetables</p>
            </div>
          </div>
          <div className={styles.tabBar}>
            {['pending', 'approved'].map(t => (
              <button
                key={t}
                className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'pending' ? '⏳ Pending' : '✅ Approved'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? <div className={styles.tableLoader}><div className={styles.spinner} /></div> :
          papers.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>{tab === 'pending' ? '📋' : '📁'}</span>
              <p className={styles.emptyText}>No {tab} question papers found.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Prepared By</th>
                    <th>Exam Date</th>
                    <th>Paper</th>
                    <th>Status</th>
                    {tab === 'pending' && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {papers.map(p => (
                    <tr key={p._id}>
                      <td>
                        <div style={{ color: 'var(--text-1)' }}>
                          {p.examId?.subjectName || 'Unknown'}
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)' }}>
                            {p.examId?.subjectCode}
                          </span>
                        </div>
                      </td>
                      <td className={styles.mutedCell}>
                        {p.createdBy?.name || 'Unknown'}
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)' }}>
                          {p.createdBy?.email}
                        </span>
                      </td>
                      <td className={styles.mutedCell}>
                        {p.examId?.date ? new Date(p.examId.date).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <button
                          onClick={() => handlePreview(p._id)}
                          disabled={previewLoading}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}
                        >
                          <Eye size={14} /> View Paper
                        </button>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${
                          p.status === 'Approved' ? styles.badgeSuccess :
                          p.status === 'Rejected' ? styles.badgeDanger : styles.badgeWarning
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      {tab === 'pending' && (
                        <td>
                          <button
                            className={`${styles.actionBtn} ${styles.approveBtn}`}
                            onClick={() => {
                              setReviewModal({ open: true, id: p._id, title: p.examId?.subjectName || 'Paper' });
                              setReviewStatus('Approved');
                              setFeedback('');
                            }}
                          >
                            <CheckCircle2 size={13} /> Review
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Review Modal ── */}
      <Modal
        isOpen={reviewModal.open}
        onClose={() => !submitting && setReviewModal({ open: false, id: null, title: '' })}
        title={`Review: ${reviewModal.title}`}
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setReviewModal({ open: false, id: null, title: '' })} disabled={submitting}>Cancel</button>
            <button className={reviewStatus === 'Approved' ? (styles.successModalBtn || styles.approveBtn) : styles.dangerModalBtn} onClick={handleReview} disabled={submitting}>
              {submitting ? 'Submitting…' : `Confirm ${reviewStatus === 'Approved' ? 'Approval' : 'Rejection'}`}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className={styles.formRow}>
            <label>Decision</label>
            <select className={styles.formInput || styles.modalInput} value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}>
              <option value="Approved">✅ Approve — Paper is ready</option>
              <option value="Rejected">❌ Reject — Needs revision</option>
            </select>
          </div>
          {reviewStatus === 'Rejected' && (
            <div className={styles.formRow}>
              <label>Feedback for Faculty <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea
                className={styles.formInput || styles.modalInput}
                rows={3}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Explain what needs to be changed (e.g. fix Q3 marks, add diagram for Q5...)"
              />
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>This feedback will be emailed to the faculty member.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Paper Preview Modal ── */}
      <Modal
        isOpen={previewModal.open}
        onClose={() => setPreviewModal({ open: false, paper: null })}
        title={previewModal.paper ? `${previewModal.paper.examId?.subjectName || 'Question Paper'}` : 'Loading…'}
        size="lg"
        footer={<button className={styles.cancelModalBtn} onClick={() => setPreviewModal({ open: false, paper: null })}>Close</button>}
      >
        {previewModal.paper && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Instructions */}
            {previewModal.paper.instructions?.length > 0 && (
              <div style={{ padding: 20, background: 'var(--surface-1)', borderRadius: 14, border: '1px solid var(--border-base)' }}>
                <h5 style={{ color: 'var(--text-1)', marginBottom: 12, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>General Instructions</h5>
                <ol style={{ color: 'var(--text-2)', fontSize: 14, paddingLeft: 22, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {previewModal.paper.instructions.map((inst, i) => (
                    <li key={i} style={{ lineHeight: 1.5 }}>{inst}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {previewModal.paper.sections?.map((section, sIdx) => (
                <div key={sIdx} style={{ padding: 22, background: 'var(--surface-1)', borderRadius: 14, border: '1px solid var(--border-base)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <h5 style={{ color: 'var(--text-0)', fontSize: 15, fontWeight: 700, marginBottom: 18, borderBottom: '1px solid var(--border-base)', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    Section {String.fromCharCode(65 + sIdx)}
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, background: 'var(--bg-3)', padding: '2px 10px', borderRadius: 12 }}>
                      {section.length} question{section.length !== 1 ? 's' : ''}
                    </span>
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {section.map((q, qIdx) => (
                      <div key={qIdx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--text-3)', fontSize: 14, fontWeight: 700, minWidth: 24, marginTop: 1 }}>{qIdx + 1}.</span>
                        <p style={{ color: 'var(--text-1)', fontSize: 14, flex: 1, margin: 0, lineHeight: 1.6 }}>{q.text}</p>
                        <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 700, flexShrink: 0, background: 'var(--primary-dim, rgba(99,102,241,0.1))', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--primary-border, rgba(99,102,241,0.2))' }}>
                          {q.marks}M
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Feedback if already reviewed */}
            {previewModal.paper.feedback && (
              <div style={{ padding: 14, background: 'var(--amber-dim, rgba(245,158,11,0.1))', borderRadius: 8, border: '1px solid var(--amber-border, rgba(245,158,11,0.2))' }}>
                <h5 style={{ color: 'var(--amber, #f59e0b)', fontSize: 13, marginBottom: 4 }}>Previous Feedback</h5>
                <p style={{ color: 'var(--text-2)', fontSize: 13, margin: 0 }}>{previewModal.paper.feedback}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuestionPapers;
