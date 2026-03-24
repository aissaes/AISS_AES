import React, { useEffect, useState, useCallback } from 'react';
import { FileText, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { questionPaperAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './HODDashboard.module.css';

const QuestionPapers = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState('pending');
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reviewModal, setReviewModal] = useState({ open: false, id: null, title: '' });
  const [reviewStatus, setReviewStatus] = useState('Approved');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [previewModal, setPreviewModal] = useState({ open: false, paper: null });
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'pending') {
        const res = await questionPaperAPI.getPending();
        setPapers(res.data.pendingPapers || []);
      } else {
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

  const handleReview = async () => {
    if (reviewStatus === 'Rejected' && !feedback.trim()) {
      toast('Feedback is required when rejecting a paper.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
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
              <button key={t} className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
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
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)' }}>{p.examId?.subjectCode}</span>
                          </div>
                        </td>
                        <td className={styles.mutedCell}>
                          {p.createdBy?.name || 'Unknown'}
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)' }}>{p.createdBy?.email}</span>
                        </td>
                        <td className={styles.mutedCell}>
                          {p.examId?.date ? new Date(p.examId.date).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <button onClick={() => handlePreview(p._id)} disabled={previewLoading} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                            <Eye size={14} /> View Paper
                          </button>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${p.status === 'Approved' ? styles.badgeSuccess : p.status === 'Rejected' ? styles.badgeDanger : styles.badgeWarning}`}>
                            {p.status}
                          </span>
                        </td>
                        {tab === 'pending' && (
                          <td>
                            <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={() => { setReviewModal({ open: true, id: p._id, title: p.examId?.subjectName || 'Paper' }); setReviewStatus('Approved'); setFeedback(''); }}>
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
              <textarea className={styles.formInput || styles.modalInput} rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Explain what needs to be changed (e.g. fix Q3 marks, add diagram for Q5...)" />
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
        className={styles.wideModal}
        footer={<button className={styles.cancelModalBtn} onClick={() => setPreviewModal({ open: false, paper: null })}>Close</button>}
      >
        {previewModal.paper && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Instructions */}
            {previewModal.paper.instructions?.length > 0 && (
              <div style={{ padding: 20, background: 'var(--surface-1)', borderRadius: 14, border: '1px solid var(--border-base)' }}>
                <h5 style={{ color: 'var(--text-1)', marginBottom: 12, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>General Instructions</h5>
                <ol style={{ color: 'var(--text-2)', fontSize: 14, paddingLeft: 22, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {previewModal.paper.instructions.map((inst, i) => <li key={i} style={{ lineHeight: 1.5 }}>{inst}</li>)}
                </ol>
              </div>
            )}

            {/* Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {previewModal.paper.sections?.map((section, sIdx) => {
                const secRule = previewModal.paper.sectionChoices?.[sIdx];

                return (
                  <div key={sIdx} style={{ padding: 22, background: 'var(--surface-1)', borderRadius: 14, border: '1px solid var(--border-base)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-base)', paddingBottom: 10 }}>
                      <h5 style={{ color: 'var(--text-0)', fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        Section {String.fromCharCode(65 + sIdx)}
                        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, background: 'var(--bg-3)', padding: '2px 10px', borderRadius: 12 }}>
                          {section.length} main question{section.length !== 1 ? 's' : ''}
                        </span>
                      </h5>

                      {secRule && (secRule.total > 0 || secRule.attempt > 0) && (
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-dim, rgba(99,102,241,0.1))', padding: '6px 12px', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span>Rule: Attempt {secRule.attempt} out of {secRule.total}</span>
                          {secRule.compulsory?.length > 0 && <span style={{ color: 'var(--amber, #f59e0b)' }}>Compulsory: {secRule.compulsory.map(idx => `Q${idx + 1}`).join(', ')}</span>}
                          {secRule.groups?.length > 0 && <span style={{ color: 'var(--text-2)', fontSize: 11 }}>Choices: {secRule.groups.map(g => g.map(idx => `Q${idx + 1}`).join(' OR ')).join(' | ')}</span>}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {section.map((q, qIdx) => {
                        const renderQuestion = (question, indexLabel, isSub = false) => {
                          const isCompulsorySub = isSub && q.choice?.compulsory?.includes(indexLabel.charCodeAt(0) - 97);

                          return (
                            <div key={indexLabel} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: isSub ? 10 : 0 }}>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: isSub ? '8px 12px' : 0, background: isSub ? 'var(--bg-2)' : 'none', borderRadius: 8, borderLeft: isCompulsorySub ? '3px solid var(--amber, #f59e0b)' : (isSub ? '3px solid var(--border-2)' : 'none') }}>
                                <span style={{ color: isCompulsorySub ? 'var(--amber)' : 'var(--text-3)', fontSize: 14, fontWeight: 700, minWidth: 24, marginTop: 1 }}>{indexLabel}</span>

                                <div style={{ flex: 1 }}>
                                  <p style={{ color: 'var(--text-1)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{question.text}</p>
                                  {question.imageUrl && <img src={question.imageUrl} alt="Figure" style={{ maxWidth: '100%', maxHeight: '200px', marginTop: 10, borderRadius: 8, border: '1px solid var(--border-2)' }} />}

                                  {question.choice && (question.choice.total > 0 || question.choice.attempt > 0) && (
                                    <div style={{ fontSize: 12, color: 'var(--amber, #f59e0b)', marginTop: 8, padding: '8px 12px', background: 'var(--amber-dim, rgba(245,158,11,0.1))', borderRadius: 6, fontWeight: 600 }}>
                                      ↳ Attempt {question.choice.attempt} out of {question.choice.total} sub-questions below.
                                      {question.choice.compulsory?.length > 0 && ` (Compulsory: ${question.choice.compulsory.map(idx => String.fromCharCode(97 + idx)).join(', ')})`}
                                      {question.choice.groups?.length > 0 && <span style={{ display: 'block', marginTop: 4, color: 'var(--text-2)', fontSize: 11 }}>Choices: {question.choice.groups.map(g => g.map(idx => String.fromCharCode(97 + idx)).join(' OR ')).join(' | ')}</span>}
                                    </div>
                                  )}
                                </div>

                                <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 700, flexShrink: 0, background: 'var(--primary-dim, rgba(99,102,241,0.1))', padding: '4px 10px', borderRadius: 8 }}>
                                  {question.marks}M
                                </span>
                              </div>

                              {question.children && question.children.length > 0 && (
                                <div style={{ paddingLeft: 36, display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '2px solid var(--border-2)', marginLeft: 6 }}>
                                  {question.children.map((child, cIdx) => renderQuestion(child, `${String.fromCharCode(97 + cIdx)})`, true))}
                                </div>
                              )}
                            </div>
                          );
                        };

                        return renderQuestion(q, `${qIdx + 1}.`);
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

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