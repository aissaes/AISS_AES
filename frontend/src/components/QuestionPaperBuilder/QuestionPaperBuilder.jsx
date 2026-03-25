import React, { useState, useEffect } from 'react';
import { Plus, Trash2, XCircle } from 'lucide-react';
import styles from './QuestionPaperBuilder.module.css';

const QuestionPaperBuilder = ({ initialData, onCancel, onSubmit, submitting }) => {
  const [instructions, setInstructions] = useState(['']);

  const baseQuestion = {
    text: '', marks: 5, imageUrl: '', choice: { attempt: 0, total: 0 }, children: [],
    isCompulsory: false, isOrNext: false
  };

  const [sections, setSections] = useState([[{ ...baseQuestion }]]);
  const [sectionChoices, setSectionChoices] = useState([{ attempt: 0 }]);

  // Load initial data for revision
  useEffect(() => {
    if (initialData?.paper) {
      const fullPaper = initialData.paper;
      setInstructions(fullPaper.instructions?.length ? fullPaper.instructions : ['']);
      setSectionChoices(fullPaper.sectionChoices?.map(sc => ({ attempt: sc.attempt || 0 })) || [{ attempt: 0 }]);
      
      const restoredSections = fullPaper.sections.map((sec, sIdx) => {
        const sc = fullPaper.sectionChoices?.[sIdx] || {};
        const comp = sc.compulsory || [];
        const grps = sc.groups || [];

        return sec.map((q, qIdx) => {
          const isCompulsory = comp.includes(qIdx);
          const isOrNext = grps.some(g => {
            const pos = g.indexOf(qIdx);
            return pos !== -1 && pos < g.length - 1 && g[pos + 1] === qIdx + 1;
          });

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
    } else {
      setInstructions(['']);
      setSections([[{ ...baseQuestion }]]);
      setSectionChoices([{ attempt: 0 }]);
    }
  }, [initialData]);

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

  const handleSubmit = () => {
    const formattedSections = sections.map(sec => sec.map(q => {
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
          total: formattedChildren.length,
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
        total: sec.length,
        compulsory: comp,
        groups: grps
      };
    });

    const payload = {
      instructions: instructions.filter(i => i.trim()),
      sections: formattedSections,
      sectionChoices: formattedSectionChoices
    };

    onSubmit(payload);
  };

  return (
    <div className={styles.builderContainer}>
      <div className={styles.builderBody}>
        <div className={styles.builderSection}>
          <label className={styles.sectionLabel}>General Instructions</label>
          <div className={styles.instructionList}>
            {instructions.map((inst, idx) => (
              <div key={idx} className={styles.instructionRow}>
                <span className={styles.instructionNum}>{idx + 1}.</span>
                <input 
                  className={styles.builderInput} 
                  value={inst} 
                  onChange={e => updateInstruction(idx, e.target.value)} 
                  placeholder="e.g. All questions are compulsory" 
                />
                {instructions.length > 1 && (
                  <button onClick={() => removeInstruction(idx)} className={styles.dangerBtnIcon}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addInstruction} className={styles.ghostAddBtn}>
            <Plus size={14} /> Add Instruction
          </button>
        </div>

        <div className={styles.sectionsWrapper}>
          <label className={styles.sectionLabel}>Sections & Questions</label>

          {sections.map((sec, sIdx) => (
            <div key={sIdx} className={styles.questionSection}>
              <div className={styles.questionSectionHeader}>
                <h5 className={styles.sectionTitle}>
                  Section {String.fromCharCode(65 + sIdx)} 
                  <span className={styles.sectionBadge}>{sec.length} Qs</span>
                </h5>
                {sections.length > 1 && (
                  <button onClick={() => removeSection(sIdx)} className={styles.dangerTextBtn}>Remove Section</button>
                )}
              </div>

              <div className={styles.ruleBox}>
                <span className={styles.ruleLabel}>Section Rule:</span>
                <span className={styles.ruleText}>Attempt</span>
                <input 
                  type="number" 
                  min="0" 
                  className={styles.builderInputSmall} 
                  value={sectionChoices[sIdx]?.attempt || ''} 
                  onChange={e => { 
                    const next = [...sectionChoices]; 
                    next[sIdx].attempt = Number(e.target.value); 
                    setSectionChoices(next); 
                  }} 
                />
                <span className={styles.ruleText}>out of</span>
                <span className={styles.ruleTotal}>{sec.length}</span>
                <p className={styles.ruleSummary}>
                  Summary: Attempt {sectionChoices[sIdx]?.attempt || 'all'} of {sec.length}.
                  {sec.some(q => q.isCompulsory) && ` Q${sec.map((q, i) => q.isCompulsory ? i + 1 : null).filter(Boolean).join(', ')} Compulsory.`}
                </p>
              </div>

              <div className={styles.questionsList}>
                {sec.map((q, qIdx) => (
                  <React.Fragment key={qIdx}>
                    <div className={`${styles.questionCard} ${q.isCompulsory ? styles.isCompulsory : ''}`}>
                      <div className={styles.questionCardHeader}>
                        <span className={q.isCompulsory ? styles.qNumCompulsory : styles.qNum}>Q{qIdx + 1}.</span>
                        <button 
                          onClick={() => updateQuestion(sIdx, qIdx, 'isCompulsory', !q.isCompulsory)} 
                          className={q.isCompulsory ? styles.toggleCompulsoryActive : styles.toggleCompulsory}
                        >
                          {q.isCompulsory ? '⭐ COMPULSORY' : '☆ Make Compulsory'}
                        </button>
                      </div>

                      <div className={styles.questionMainRow}>
                        <div className={styles.questionInputs}>
                          <textarea 
                            className={styles.builderTextarea} 
                            rows={2} 
                            placeholder="Main question text…" 
                            value={q.text} 
                            onChange={e => updateQuestion(sIdx, qIdx, 'text', e.target.value)} 
                          />

                          <div className={styles.questionPropsRow}>
                            <input 
                              type="text" 
                              className={styles.builderInput} 
                              placeholder="Image URL (optional)" 
                              value={q.imageUrl || ''} 
                              onChange={e => updateQuestion(sIdx, qIdx, 'imageUrl', e.target.value)} 
                            />
                            <div className={styles.subChoiceBox}>
                              <span className={styles.subChoiceLabel}>Choice:</span>
                              <input 
                                type="number" 
                                min="0" 
                                className={styles.builderInputSmallest} 
                                value={q.choice?.attempt || ''} 
                                onChange={e => updateQuestion(sIdx, qIdx, 'choice', { ...q.choice, attempt: Number(e.target.value) })} 
                              />
                              <span className={styles.subChoiceDivider}>/</span>
                              <span className={styles.subChoiceTotal}>{q.children ? q.children.length : 0}</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.marksBox}>
                          <label className={styles.marksLabel}>Marks</label>
                          <input 
                            type="number" 
                            min="0" 
                            className={styles.marksInput} 
                            value={q.marks} 
                            onChange={e => updateQuestion(sIdx, qIdx, 'marks', Number(e.target.value))} 
                          />
                        </div>

                        {sec.length > 1 && (
                          <button onClick={() => removeQuestion(sIdx, qIdx)} className={styles.dangerBtnIcon} style={{marginTop: 18}}>
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>

                      {q.children && q.children.length > 0 && (
                        <div className={styles.subQuestionsList}>
                          {q.children.map((sub, subIdx) => (
                            <React.Fragment key={subIdx}>
                              <div className={`${styles.subQuestionCard} ${sub.isCompulsory ? styles.isCompulsorySub : ''}`}>
                                <div className={styles.subQuestionHeader}>
                                  <span className={sub.isCompulsory ? styles.subNumCompulsory : styles.subNum}>{String.fromCharCode(97 + subIdx)})</span>
                                  <div className={styles.subQuestionActions}>
                                    <button 
                                      onClick={() => updateSubQuestion(sIdx, qIdx, subIdx, 'isCompulsory', !sub.isCompulsory)} 
                                      className={sub.isCompulsory ? styles.toggleCompulsoryActive : styles.toggleCompulsory}
                                    >
                                      {sub.isCompulsory ? '⭐' : '☆'}
                                    </button>
                                    <button onClick={() => removeSubQuestion(sIdx, qIdx, subIdx)} className={styles.ghostIconBtn}>
                                      <XCircle size={16} />
                                    </button>
                                  </div>
                                </div>

                                <div className={styles.subQuestionRow}>
                                  <div className={styles.subQuestionInputs}>
                                    <input 
                                      type="text" 
                                      className={styles.builderInput} 
                                      placeholder="Sub-question text…" 
                                      value={sub.text} 
                                      onChange={e => updateSubQuestion(sIdx, qIdx, subIdx, 'text', e.target.value)} 
                                    />
                                    <input 
                                      type="text" 
                                      className={styles.builderInputSmallFont} 
                                      placeholder="Image URL (optional)" 
                                      value={sub.imageUrl || ''} 
                                      onChange={e => updateSubQuestion(sIdx, qIdx, subIdx, 'imageUrl', e.target.value)} 
                                    />
                                  </div>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    className={styles.subMarksInput} 
                                    value={sub.marks} 
                                    onChange={e => updateSubQuestion(sIdx, qIdx, subIdx, 'marks', Number(e.target.value))} 
                                  />
                                </div>
                              </div>

                              {subIdx < q.children.length - 1 && (
                                <div className={styles.orLinker}>
                                  {sub.isOrNext ? (
                                    <div className={styles.orLinkerActive}>
                                      <div className={styles.orLine} />
                                      <button onClick={() => updateSubQuestion(sIdx, qIdx, subIdx, 'isOrNext', false)} className={styles.orBtnActive}>
                                        — OR — (unlink)
                                      </button>
                                      <div className={styles.orLine} />
                                    </div>
                                  ) : (
                                    <button onClick={() => updateSubQuestion(sIdx, qIdx, subIdx, 'isOrNext', true)} className={styles.orBtn}>
                                      + Link with OR
                                    </button>
                                  )}
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      <button type="button" onClick={() => addSubQuestion(sIdx, qIdx)} className={styles.ghostAddBtn} style={{marginLeft: 28}}>
                        <Plus size={14} /> Add Sub-question
                      </button>
                    </div>

                    {qIdx < sec.length - 1 && (
                      <div className={styles.orLinkerMain}>
                        {q.isOrNext ? (
                          <div className={styles.orLinkerActive}>
                            <div className={styles.orLine} />
                            <button onClick={() => updateQuestion(sIdx, qIdx, 'isOrNext', false)} className={styles.orBtnActive}>
                              — OR — (unlink)
                            </button>
                            <div className={styles.orLine} />
                          </div>
                        ) : (
                          <button onClick={() => updateQuestion(sIdx, qIdx, 'isOrNext', true)} className={styles.orBtn}>
                            + Link with OR (Group)
                          </button>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <button type="button" onClick={() => addQuestion(sIdx)} className={styles.solidAddBtn}>
                <Plus size={16} /> Add Question
              </button>
            </div>
          ))}

          <button type="button" onClick={addSection} className={styles.primaryAddBtn}>
            <Plus size={18} /> Add New Section
          </button>
        </div>
      </div>
      
      <div className={styles.builderFooter}>
        <button className={styles.btnCancel} onClick={onCancel} disabled={submitting}>Cancel</button>
        <button className={styles.btnSubmit} onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : (initialData?.isRevision ? 'Resubmit for Review' : 'Submit Question Paper')}
        </button>
      </div>
    </div>
  );
};

export default QuestionPaperBuilder;
