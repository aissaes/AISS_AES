import React, { useEffect, useState, useRef } from 'react';
import { FileText, BookOpen, Clock, Plus, CheckCircle2, XCircle, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { questionPaperAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './FacultyDashboard.module.css';

/* ══════════════════════════════════════════════════════
   FACULTY QUESTION PAPER ASSIGNMENTS
   
   Workflow:
   1. HOD creates timetable with exams and assigns faculty
   2. Faculty sees their assigned exams here (GET /assignments → { exams })
   3. Faculty drafts a question paper for each exam
   4. Paper goes to HOD for review (Pending → Approved/Rejected)
   5. If rejected, faculty can revise and resubmit
══════════════════════════════════════════════════════ */

const Assignments = () => {
  const { toast } = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Draft Modal state ── */
  const [draftModal, setDraftModal] = useState({ open: false, examId: null, examName: '', paperId: null, isRevision: false });
  const [instructions, setInstructions] = useState(['']);
  // sections is a 2D array: sections[sectionIdx][questionIdx] = { text, marks, imageUrl }
  const [sections, setSections] = useState([[{ text: '', marks: 5 }]]);
  const [submitting, setSubmitting] = useState(false);

  /* ── Fetch ── */
  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      // Backend returns { exams: [...] } with questionPaper populated { status, feedback, updatedAt }
      const res = await questionPaperAPI.getAssignments();
      setExams(res.data.exams || []);
    } catch {
      toast('Failed to load your assignments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Open draft modal (new or revision) ── */
  const openDraft = (exam, isRevision = false) => {
    setInstructions(['']);
    setSections([[{ text: '', marks: 5 }]]);
    setDraftModal({
      open: true,
      examId: exam._id,
      examName: `${exam.subjectName} (${exam.subjectCode})`,
      paperId: exam.questionPaper?._id || null,
      isRevision
    });
  };

  /* ── Section & Question helpers ── */
  const addSection = () => setSections([...sections, [{ text: '', marks: 5 }]]);

  const removeSection = (sIdx) => {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, i) => i !== sIdx));
  };

  const addQuestion = (sIdx) => {
    const next = [...sections];
    next[sIdx] = [...next[sIdx], { text: '', marks: 5 }];
    setSections(next);
  };

  const removeQuestion = (sIdx, qIdx) => {
    const next = [...sections];
    if (next[sIdx].length <= 1) return;
    next[sIdx] = next[sIdx].filter((_, i) => i !== qIdx);
    setSections(next);
  };

  const updateQuestion = (sIdx, qIdx, field, value) => {
    const next = sections.map((sec, si) =>
      si === sIdx ? sec.map((q, qi) => qi === qIdx ? { ...q, [field]: value } : q) : sec
    );
    setSections(next);
  };

  /* ── Instruction helpers ── */
  const addInstruction = () => setInstructions([...instructions, '']);
  const updateInstruction = (idx, val) => {
    const next = [...instructions];
    next[idx] = val;
    setInstructions(next);
  };
  const removeInstruction = (idx) => {
    if (instructions.length <= 1) return;
    setInstructions(instructions.filter((_, i) => i !== idx));
  };

  /* ── Submit paper ── */
  const handleSubmit = async () => {
    // Validate: at least one question with text
    const hasContent = sections.some(sec => sec.some(q => q.text.trim()));
    if (!hasContent) { toast('Please add at least one question.', 'warning'); return; }

    setSubmitting(true);
    try {
      const payload = {
        instructions: instructions.filter(i => i.trim()),
        sections,
        sectionChoices: []
      };

      if (draftModal.isRevision && draftModal.paperId) {
        // Revision: PUT /update/:paperId  (resets status to Pending)
        await questionPaperAPI.update(draftModal.paperId, payload);
        toast('Paper revised and resubmitted for review!', 'success');
      } else {
        // New upload: POST /upload
        await questionPaperAPI.upload({ examId: draftModal.examId, ...payload });
        toast('Question paper submitted for HOD review!', 'success');
      }

      setDraftModal({ open: false, examId: null, examName: '', paperId: null, isRevision: false });
      fetchExams();
    } catch (err) {
      toast(err.response?.data?.message || 'Submission failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Status helpers ── */
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
            <h2 className={styles.bannerTitle} style={{ fontSize: 24, fontWeight: 'bold' }}>Question Paper Assignments</h2>
            <p className={styles.bannerRole} style={{ marginTop: 4 }}>Draft, submit, and track your assigned examination papers</p>
          </div>
        </div>
        <button className={styles.refreshBtn || styles.ghostBtn} onClick={fetchExams} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw size={14} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <BookOpen size={18} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>My Exam Assignments</h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Exams where you are assigned to prepare the question paper</p>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? <div className={styles.spinner} style={{ margin: 'auto' }} /> : exams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <span style={{ fontSize: 32 }}>📋</span>
              <p className={styles.emptyText}>You have no assigned exams yet. Your HOD will assign subjects to you.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {exams.map(exam => {
                const status = getStatusInfo(exam);
                return (
                  <div key={exam._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 16, border: '1px solid var(--border-2)', borderRadius: 10,
                    background: 'var(--surface-2)', transition: 'border-color 0.2s'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ color: 'var(--text-0)', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {exam.subjectName}
                        <span style={{ fontSize: 12, background: 'var(--bg-3)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-2)' }}>{exam.subjectCode}</span>
                      </h4>
                      <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} /> {new Date(exam.date).toLocaleDateString()} · Max Marks: {exam.maxMarks} · {exam.examType}
                      </p>
                      {/* Show HOD feedback if rejected */}
                      {status.feedback && (
                        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--danger-dim, rgba(239,68,68,0.1))', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <AlertTriangle size={14} style={{ color: 'var(--danger)', marginTop: 2, flexShrink: 0 }} />
                          <p style={{ color: 'var(--danger)', fontSize: 12.5 }}><strong>HOD Feedback:</strong> {status.feedback}</p>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
                      <span className={`${styles.badge} ${status.color}`}>{status.label}</span>
                      {status.canDraft && (
                        <button className={styles.primaryBtn} onClick={() => openDraft(exam)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={14} /> Draft Paper
                        </button>
                      )}
                      {status.canRevise && (
                        <button className={styles.primaryBtn} onClick={() => openDraft(exam, true)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--amber, #f59e0b)' }}>
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

      {/* ── Draft / Revision Modal ── */}
      <Modal
        isOpen={draftModal.open}
        onClose={() => !submitting && setDraftModal({ open: false, examId: null, examName: '', paperId: null, isRevision: false })}
        title={draftModal.isRevision ? 'Revise Question Paper' : 'Draft Question Paper'}
        size="lg"
        footer={
          <>
            <button className={styles.ghostBtn} onClick={() => setDraftModal({ open: false, examId: null, examName: '', paperId: null, isRevision: false })} disabled={submitting}>Cancel</button>
            <button className={styles.primaryBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : draftModal.isRevision ? 'Resubmit for Review' : 'Submit to HOD'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '10px 0' }}>
          <div>
            <h4 style={{ color: 'var(--text-1)' }}>{draftModal.examName}</h4>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
              Build your question paper below. It will be sent directly to your HOD for approval.
            </p>
          </div>

          {/* Instructions */}
          <div style={{ background: 'var(--surface-1)', padding: 20, borderRadius: 14, border: '1px solid var(--border-base)' }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>General Instructions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {instructions.map((inst, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-3)', fontWeight: 600, fontSize: 13, width: 20 }}>{idx + 1}.</span>
                  <input
                    className={styles.modalInput}
                    style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border-base)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-1)' }}
                    value={inst}
                    onChange={e => updateInstruction(idx, e.target.value)}
                    placeholder="e.g. All questions are compulsory"
                  />
                  {instructions.length > 1 && (
                    <button onClick={() => removeInstruction(idx)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'var(--danger)', borderRadius: 6, padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addInstruction} style={{ 
              marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px dashed var(--primary)', color: 'var(--primary)', 
              cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 6 
            }}>
              <Plus size={12} /> Add instruction
            </button>
          </div>

          {/* Sections (2D array) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sections & Questions</label>

            {sections.map((sec, sIdx) => (
              <div key={sIdx} style={{ padding: 20, background: 'var(--surface-1)', borderRadius: 14, border: '1px solid var(--border-base)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h5 style={{ color: 'var(--text-1)', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Section {String.fromCharCode(65 + sIdx)} 
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, background: 'var(--bg-3)', padding: '2px 8px', borderRadius: 10 }}>{sec.length} question{sec.length !== 1 ? 's' : ''}</span>
                  </h5>
                  {sections.length > 1 && (
                    <button onClick={() => removeSection(sIdx)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Remove Section
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sec.map((q, qIdx) => (
                    <div key={qIdx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg-3)', padding: 12, borderRadius: 10, border: '1px solid var(--border-base)' }}>
                      <span style={{ color: 'var(--text-3)', fontWeight: 700, marginTop: 10, fontSize: 13, minWidth: 20 }}>{qIdx + 1}.</span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea
                          className={styles.modalInput}
                          rows={2}
                          style={{ background: 'var(--bg-1)', border: '1px solid var(--border-base)', color: 'var(--text-1)', padding: '10px 14px', borderRadius: 8, minHeight: 60, resize: 'vertical', width: '100%' }}
                          placeholder="Question text…"
                          value={q.text}
                          onChange={e => updateQuestion(sIdx, qIdx, 'text', e.target.value)}
                        />
                      </div>
                      <div style={{ width: 85, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 600 }}>Marks</label>
                        <input
                          type="number"
                          className={styles.modalInput}
                          placeholder="Marks"
                          value={q.marks}
                          onChange={e => updateQuestion(sIdx, qIdx, 'marks', Number(e.target.value))}
                          style={{ textAlign: 'center', background: 'var(--bg-1)', border: '1px solid var(--border-base)', color: 'var(--text-1)', padding: '10px 4px', borderRadius: 8 }}
                        />
                      </div>
                      {sec.length > 1 && (
                        <button onClick={() => removeQuestion(sIdx, qIdx)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 8, marginTop: 16 }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => addQuestion(sIdx)} style={{ 
                  marginTop: 14, display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: '1px dashed var(--primary)', color: 'var(--primary)', 
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 6 
                }}>
                  <Plus size={12} /> Add Question
                </button>
              </div>
            ))}

            <button type="button" onClick={addSection} style={{
              alignSelf: 'flex-start', padding: '10px 20px', borderRadius: 10,
              background: 'var(--primary-dim, rgba(99,102,241,0.1))', color: 'var(--primary)',
              border: '1px dashed var(--primary)', cursor: 'pointer', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, transition: 'all 0.2s'
            }}>
              <Plus size={16} /> Add New Section
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Assignments;
