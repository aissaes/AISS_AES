import React, { useEffect, useState } from 'react';
import { FileText, BookOpen, Clock, Plus, CheckCircle2, XCircle, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { questionPaperAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './FacultyDashboard.module.css';

/* ══════════════════════════════════════════════════════
   FACULTY QUESTION PAPER ASSIGNMENTS
══════════════════════════════════════════════════════ */

const Assignments = () => {
  const { toast } = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Draft Modal state ── */
  const [draftModal, setDraftModal] = useState({ open: false, examId: null, examName: '', paperId: null, isRevision: false });
  const [instructions, setInstructions] = useState(['']);

  const baseQuestion = {
    text: '', marks: 5, imageUrl: '', choice: { attempt: 0, total: 0 }, children: [],
    isCompulsory: false, isOrNext: false
  };

  const [sections, setSections] = useState([[{ ...baseQuestion }]]);
  const [sectionChoices, setSectionChoices] = useState([{ attempt: 0 }]); // Removed manual total tracking
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

  /* ── Open draft modal ── */
  /* ── Open draft modal (new or revision) ── */
  const openDraft = async (exam, isRevision = false) => {
    if (isRevision && exam.questionPaper?._id) {
      // Fetch the full rejected paper data from the backend to edit it
      try {
        toast('Loading previous paper data...', 'info');
        const res = await questionPaperAPI.getById(exam.questionPaper._id);
        const fullPaper = res.data.paper;

        // 1. Restore Instructions
        setInstructions(fullPaper.instructions?.length ? fullPaper.instructions : ['']);

        // 2. Restore Section Choices
        setSectionChoices(fullPaper.sectionChoices?.map(sc => ({ attempt: sc.attempt || 0 })) || [{ attempt: 0 }]);

        // 3. Restore Sections & Reverse-Engineer the UI Flags (Toggles & OR Links)
        const restoredSections = fullPaper.sections.map((sec, sIdx) => {
          const sc = fullPaper.sectionChoices?.[sIdx] || {};
          const comp = sc.compulsory || [];
          const grps = sc.groups || [];

          return sec.map((q, qIdx) => {
            // Reconstruct main question flags
            const isCompulsory = comp.includes(qIdx);
            const isOrNext = grps.some(g => {
              const pos = g.indexOf(qIdx);
              return pos !== -1 && pos < g.length - 1 && g[pos + 1] === qIdx + 1;
            });

            // Reconstruct sub-question flags
            const qComp = q.choice?.compulsory || [];
            const qGrps = q.choice?.groups || [];

            const children = (q.children || []).map((sub, subIdx) => {
              const isSubCompulsory = qComp.includes(subIdx);
              const isSubOrNext = qGrps.some(g => {
                const pos = g.indexOf(subIdx);
                return pos !== -1 && pos < g.length - 1 && g[pos + 1] === subIdx + 1;
              });
              return { ...sub, isCompulsory: isSubCompulsory, isOrNext: isSubOrNext };
            });

            return { ...q, isCompulsory, isOrNext, children };
          });
        });

        setSections(restoredSections);
      } catch (err) {
        toast('Failed to load paper details for revision.', 'error');
        return; // Stop execution if it fails to load
      }
    } else {
      // Fresh Draft: Reset to default empty state
      setInstructions(['']);
      setSections([[{ ...baseQuestion }]]);
      setSectionChoices([{ attempt: 0 }]);
    }

    // Open the modal
    setDraftModal({
      open: true,
      examId: exam._id,
      examName: `${exam.subjectName} (${exam.subjectCode})`,
      paperId: exam.questionPaper?._id || null,
      isRevision
    });
  };

  /* ── Section & Question helpers ── */
  const addSection = () => {
    setSections([...sections, [{ ...baseQuestion }]]);
    setSectionChoices([...sectionChoices, { attempt: 0 }]);
  };

  const removeSection = (sIdx) => {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, i) => i !== sIdx));
    setSectionChoices(sectionChoices.filter((_, i) => i !== sIdx));
  };

  const addQuestion = (sIdx) => {
    const next = [...sections];
    next[sIdx] = [...next[sIdx], { ...baseQuestion }];
    setSections(next);
  };

  const removeQuestion = (sIdx, qIdx) => {
    const next = [...sections];
    if (next[sIdx].length <= 1) return;
    next[sIdx] = next[sIdx].filter((_, i) => i !== qIdx);
    setSections(next);
  };

  const updateQuestion = (sIdx, qIdx, field, value) => {
    const next = sections.map((sec, si) => si === sIdx ? sec.map((q, qi) => qi === qIdx ? { ...q, [field]: value } : q) : sec);
    setSections(next);
  };

  const addSubQuestion = (sIdx, qIdx) => {
    const next = [...sections];
    if (!next[sIdx][qIdx].children) next[sIdx][qIdx].children = [];
    next[sIdx][qIdx].children.push({ text: '', marks: 2, imageUrl: '', isCompulsory: false, isOrNext: false });
    setSections(next);
  };

  const updateSubQuestion = (sIdx, qIdx, subIdx, field, value) => {
    const next = [...sections];
    next[sIdx][qIdx].children[subIdx][field] = value;
    setSections(next);
  };

  const removeSubQuestion = (sIdx, qIdx, subIdx) => {
    const next = [...sections];
    next[sIdx][qIdx].children = next[sIdx][qIdx].children.filter((_, i) => i !== subIdx);
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
    const hasContent = sections.some(sec => sec.some(q => q.text.trim()));
    if (!hasContent) { toast('Please add at least one question.', 'warning'); return; }

    setSubmitting(true);
    try {
      const formattedSections = sections.map(sec => sec.map(q => {
        // Parse sub-question rules
        const subComp = [];
        const subGrps = [];
        let currentSubGroup = [];

        const formattedChildren = (q.children || []).map((sub, subIdx) => {
          if (sub.isCompulsory) subComp.push(subIdx);

          if (sub.isOrNext) {
            if (currentSubGroup.length === 0) currentSubGroup.push(subIdx);
            currentSubGroup.push(subIdx + 1);
          } else if (currentSubGroup.length > 0) {
            subGrps.push([...new Set(currentSubGroup)]);
            currentSubGroup = [];
          }
          return { text: sub.text, marks: sub.marks, imageUrl: sub.imageUrl };
        });

        return {
          text: q.text,
          marks: q.marks,
          imageUrl: q.imageUrl,
          choice: {
            attempt: q.choice?.attempt || 0,
            total: formattedChildren.length, // AUTO TOTAL
            compulsory: subComp,
            groups: subGrps
          },
          children: formattedChildren
        };
      }));

      const formattedSectionChoices = sections.map((sec, sIdx) => {
        const comp = [];
        const grps = [];
        let currentGroup = [];

        sec.forEach((q, qIdx) => {
          if (q.isCompulsory) comp.push(qIdx);

          if (q.isOrNext) {
            if (currentGroup.length === 0) currentGroup.push(qIdx);
            currentGroup.push(qIdx + 1);
          } else if (currentGroup.length > 0) {
            grps.push([...new Set(currentGroup)]);
            currentGroup = [];
          }
        });

        return {
          attempt: sectionChoices[sIdx]?.attempt || 0,
          total: sec.length, // AUTO TOTAL
          compulsory: comp,
          groups: grps
        };
      });

      const payload = {
        instructions: instructions.filter(i => i.trim()),
        sections: formattedSections,
        sectionChoices: formattedSectionChoices
      };

      if (draftModal.isRevision && draftModal.paperId) {
        await questionPaperAPI.update(draftModal.paperId, payload);
        toast('Paper revised and resubmitted for review!', 'success');
      } else {
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
          <div className={styles.cardHeaderLeft}>
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
                    <div className={styles.actionBtns}>
                      <span className={`${styles.badge} ${status.color}`}>{status.label}</span>
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
        onClose={() => !submitting && setDraftModal({ open: false, examId: null, examName: '', paperId: null, isRevision: false })}
        title={draftModal.isRevision ? 'Revise Question Paper' : 'Draft Question Paper'}
        className={styles.wideModal}
        footer={
          <>
            <button className={styles.ghostBtn} onClick={() => setDraftModal({ open: false, examId: null, examName: '', paperId: null, isRevision: false })} disabled={submitting}>Cancel</button>
            <button className={styles.primaryBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : draftModal.isRevision ? 'Resubmit for Review' : 'Submit to HOD'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', overflowX: 'hidden' }}>
          <div className={styles.builderSection}>
            <label className={styles.modalLabel}>General Instructions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {instructions.map((inst, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-3)', fontWeight: 600, fontSize: 13, width: 20 }}>{idx + 1}.</span>
                  <input className={styles.modalInput} value={inst} onChange={e => updateInstruction(idx, e.target.value)} placeholder="e.g. All questions are compulsory" />
                  {instructions.length > 1 && (
                    <button onClick={() => removeInstruction(idx)} className={styles.dangerBtn} style={{ padding: '8px' }}><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addInstruction} className={styles.addBtn} style={{ marginTop: 12 }}>
              <Plus size={12} /> Add instruction
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label className={styles.modalLabel}>Sections & Questions</label>

            {sections.map((sec, sIdx) => (
              <div key={sIdx} className={styles.builderSection}>
                <div className={styles.builderHeader}>
                  <h5 className={styles.cardTitle}>Section {String.fromCharCode(65 + sIdx)} <span className={styles.examCode}>{sec.length} Qs</span></h5>
                  {sections.length > 1 && <button onClick={() => removeSection(sIdx)} className={styles.dangerBtn} style={{ padding: '4px 10px', fontSize: 12 }}>Remove Section</button>}
                </div>

                <div className={styles.builderRuleBox}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>Overall Section Rule:</span>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Attempt</span>
                  <input type="number" min="0" className={styles.modalInput} style={{ width: 60, padding: '4px 8px' }} value={sectionChoices[sIdx]?.attempt || ''} onChange={e => { const next = [...sectionChoices]; next[sIdx].attempt = Number(e.target.value); setSectionChoices(next); }} />
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>out of</span>

                  {/* AUTO TOTAL TEXT */}
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', background: 'var(--bg-2)', padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border-base)' }}>
                    {sec.length}
                  </span>

                  <p style={{ margin: '0 0 0 auto', fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
                    Summary: Attempt {sectionChoices[sIdx]?.attempt || 'all'} of {sec.length}.
                    {sec.some(q => q.isCompulsory) && ` Q${sec.map((q, i) => q.isCompulsory ? i + 1 : null).filter(Boolean).join(', ')} Compulsory.`}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {sec.map((q, qIdx) => (
                    <React.Fragment key={qIdx}>
                      <div className={`${styles.builderQuestionBox} ${q.isCompulsory ? styles.compulsory : ''}`}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: -4 }}>
                          <span style={{ color: q.isCompulsory ? 'var(--amber)' : 'var(--text-3)', fontWeight: 800, fontSize: 15 }}>Q{qIdx + 1}.</span>
                          <button onClick={() => updateQuestion(sIdx, qIdx, 'isCompulsory', !q.isCompulsory)} className={styles.ghostBtn} style={{ padding: '4px 10px', fontSize: 11, borderColor: q.isCompulsory ? 'var(--amber)' : 'var(--border-1)', color: q.isCompulsory ? 'var(--amber)' : 'var(--text-3)' }}>
                            {q.isCompulsory ? '⭐ COMPULSORY' : '☆ Make Compulsory'}
                          </button>
                        </div>

                        <div className={styles.builderRow}>
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <textarea className={styles.modalTextarea} rows={2} placeholder="Main question text…" value={q.text} onChange={e => updateQuestion(sIdx, qIdx, 'text', e.target.value)} />

                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              <input type="text" className={styles.modalInput} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', fontSize: 12 }} placeholder="Image URL (optional)" value={q.imageUrl || ''} onChange={e => updateQuestion(sIdx, qIdx, 'imageUrl', e.target.value)} />
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-2)', padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-base)' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Choice:</span>
                                <input type="number" min="0" className={styles.modalInput} style={{ width: 45, padding: '4px', textAlign: 'center' }} value={q.choice?.attempt || ''} onChange={e => updateQuestion(sIdx, qIdx, 'choice', { ...q.choice, attempt: Number(e.target.value) })} />
                                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>/</span>

                                {/* AUTO TOTAL TEXT */}
                                <span style={{ width: 35, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                                  {q.children ? q.children.length : 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ width: 70, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 600 }}>Marks</label>
                            <input type="number" min="0" className={styles.modalInput} value={q.marks} onChange={e => updateQuestion(sIdx, qIdx, 'marks', Number(e.target.value))} style={{ textAlign: 'center', padding: '12px 4px', fontSize: 14, fontWeight: 700 }} />
                          </div>

                          {sec.length > 1 && (
                            <button onClick={() => removeQuestion(sIdx, qIdx)} className={styles.dangerBtn} style={{ padding: 8, marginTop: 16 }}><Trash2 size={16} /></button>
                          )}
                        </div>

                        {/* Sub-Questions Map (NOW WITH COMPULSORY & OR TOGGLES) */}
                        {q.children && q.children.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                            {q.children.map((sub, subIdx) => (
                              <React.Fragment key={subIdx}>
                                <div className={`${styles.builderSubQuestion} ${sub.isCompulsory ? styles.compulsory : ''}`} style={{ background: 'var(--surface-1)', padding: '12px', borderRadius: 8, borderLeft: sub.isCompulsory ? '4px solid var(--amber)' : '4px solid var(--primary-border, rgba(99,102,241,0.3))' }}>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ color: sub.isCompulsory ? 'var(--amber)' : 'var(--primary)', fontSize: 14, fontWeight: 800 }}>{String.fromCharCode(97 + subIdx)})</span>
                                      <button onClick={() => updateSubQuestion(sIdx, qIdx, subIdx, 'isCompulsory', !sub.isCompulsory)} className={styles.ghostBtn} style={{ padding: '2px 8px', fontSize: 10, borderColor: sub.isCompulsory ? 'var(--amber)' : 'var(--border-1)', color: sub.isCompulsory ? 'var(--amber)' : 'var(--text-3)' }}>
                                        {sub.isCompulsory ? '⭐ COMPULSORY' : '☆ Make Compulsory'}
                                      </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <input type="text" className={styles.modalInput} style={{ fontSize: 13, padding: '8px 12px' }} placeholder="Sub-question text…" value={sub.text} onChange={e => updateSubQuestion(sIdx, qIdx, subIdx, 'text', e.target.value)} />
                                        <input type="text" className={styles.modalInput} style={{ fontSize: 11, padding: '6px 12px' }} placeholder="Image URL (optional)" value={sub.imageUrl || ''} onChange={e => updateSubQuestion(sIdx, qIdx, subIdx, 'imageUrl', e.target.value)} />
                                      </div>
                                      <input type="number" min="0" className={styles.modalInput} style={{ width: 55, flexShrink: 0, padding: '8px 4px', textAlign: 'center' }} value={sub.marks} onChange={e => updateSubQuestion(sIdx, qIdx, subIdx, 'marks', Number(e.target.value))} />
                                      <button onClick={() => removeSubQuestion(sIdx, qIdx, subIdx)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 8 }}><XCircle size={15} /></button>
                                    </div>
                                  </div>
                                </div>

                                {/* THE "OR" LINKER BUTTON FOR SUB-QUESTIONS */}
                                {subIdx < q.children.length - 1 && (
                                  <div className={styles.builderLinker} style={{ paddingLeft: 24 }}>
                                    {sub.isOrNext ? (
                                      <div className={styles.builderLinkerActive}>
                                        <div className={styles.builderLinkLine} />
                                        <button onClick={() => updateSubQuestion(sIdx, qIdx, subIdx, 'isOrNext', false)} className={styles.builderLinkBtnActive} style={{ fontSize: 11, padding: '2px 12px' }}>
                                          — OR — (unlink)
                                        </button>
                                        <div className={styles.builderLinkLine} />
                                      </div>
                                    ) : (
                                      <button onClick={() => updateSubQuestion(sIdx, qIdx, subIdx, 'isOrNext', true)} className={styles.builderLinkBtn}>
                                        + Link with OR (Group)
                                      </button>
                                    )}
                                  </div>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        )}

                        <button type="button" onClick={() => addSubQuestion(sIdx, qIdx)} className={styles.addBtn} style={{ marginLeft: 32, border: 'none' }}><Plus size={12} /> Add Sub-question</button>
                      </div>

                      {qIdx < sec.length - 1 && (
                        <div className={styles.builderLinker}>
                          {q.isOrNext ? (
                            <div className={styles.builderLinkerActive}>
                              <div className={styles.builderLinkLine} />
                              <button onClick={() => updateQuestion(sIdx, qIdx, 'isOrNext', false)} className={styles.builderLinkBtnActive}>— OR — (Click to unlink)</button>
                              <div className={styles.builderLinkLine} />
                            </div>
                          ) : (
                            <button onClick={() => updateQuestion(sIdx, qIdx, 'isOrNext', true)} className={styles.builderLinkBtn}>+ Link with OR (Group)</button>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <button type="button" onClick={() => addQuestion(sIdx)} className={styles.addBtn} style={{ marginTop: 14 }}><Plus size={12} /> Add Question</button>
              </div>
            ))}

            <button type="button" onClick={addSection} className={styles.addBtn} style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: 14 }}><Plus size={16} /> Add New Section</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Assignments;