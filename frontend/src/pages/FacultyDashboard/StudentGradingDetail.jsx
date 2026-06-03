import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Edit3, Eye, ZoomIn, Info, HelpCircle, ExternalLink } from 'lucide-react';
import { evaluationAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './FacultyDashboard.module.css';

const StudentGradingDetail = () => {
  const { examId, studentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [student, setStudent] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [totalMarks, setTotalMarks] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal zoom states
  const [activeImage, setActiveImage] = useState(null);

  // Edit / Override states
  const [overrideState, setOverrideState] = useState({}); // { [questionId]: { marks, reason, isEditing } }
  const [savingOverride, setSavingOverride] = useState({});

  const [fileTypes, setFileTypes] = useState({});

  useEffect(() => {
    evaluations.forEach(ev => {
      if (ev.imageUrl) {
        if (ev.imageUrl.toLowerCase().includes('.pdf')) {
          setFileTypes(prev => ({ ...prev, [ev.imageUrl]: 'pdf' }));
        } else {
          // Asynchronously query the resource to identify MIME type
          fetch(ev.imageUrl, { method: 'GET', headers: { Range: 'bytes=0-0' } })
            .then(res => {
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('pdf')) {
                setFileTypes(prev => ({ ...prev, [ev.imageUrl]: 'pdf' }));
              } else {
                setFileTypes(prev => ({ ...prev, [ev.imageUrl]: 'image' }));
              }
            })
            .catch(() => {
              // Heuristic fallback: if it has no standard image extension, assume PDF
              const hasImageExt = /\.(png|jpg|jpeg|gif|webp|bmp)/i.test(ev.imageUrl);
              if (!hasImageExt) {
                setFileTypes(prev => ({ ...prev, [ev.imageUrl]: 'pdf' }));
              } else {
                setFileTypes(prev => ({ ...prev, [ev.imageUrl]: 'image' }));
              }
            });
        }
      }
    });
  }, [evaluations]);

  useEffect(() => {
    fetchDetailedResult();
  }, [examId, studentId]);

  const fetchDetailedResult = async () => {
    setLoading(true);
    try {
      const res = await evaluationAPI.getDetailedResult(examId, studentId);
      if (res.data.success) {
        setStudent(res.data.student);
        setEvaluations(res.data.evaluations || []);
        setTotalMarks(res.data.totalMarksObtained);
        setStatus(res.data.status);

        // Initialize override values
        const initialOverrides = {};
        res.data.evaluations.forEach(ev => {
          initialOverrides[ev.questionId] = {
            marks: ev.overrideMarks !== null ? ev.overrideMarks : ev.aiMarks,
            reason: ev.overrideReason || '',
            isEditing: false,
          };
        });
        setOverrideState(initialOverrides);
      }
    } catch (err) {
      toast('Failed to load detailed submissions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEdit = (questionId) => {
    setOverrideState(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        isEditing: !prev[questionId].isEditing,
      }
    }));
  };

  const handleOverrideValueChange = (questionId, field, value) => {
    setOverrideState(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      }
    }));
  };

  const handleSaveOverride = async (questionId) => {
    const override = overrideState[questionId];
    const numericMarks = Number(override.marks);

    if (isNaN(numericMarks) || numericMarks < 0) {
      toast('Please enter a valid non-negative number for marks.', 'warning');
      return;
    }

    setSavingOverride(prev => ({ ...prev, [questionId]: true }));
    try {
      const res = await evaluationAPI.overrideGrade(examId, studentId, {
        questionId,
        overrideMarks: numericMarks,
        overrideReason: override.reason.trim() || 'Teacher manually adjusted score.',
      });

      if (res.data.success) {
        toast(`Grade updated for ${questionId}!`, 'success');
        // Refresh details
        fetchDetailedResult();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update grade override.', 'error');
    } finally {
      setSavingOverride(prev => ({ ...prev, [questionId]: false }));
    }
  };

  if (loading) {
    return (
      <div className={styles.pageWrap} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.pageWrap} style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '16px' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-1)', border: '1px solid var(--border-1)', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate(`/faculty/evaluations/${examId}`)}
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border-2)',
              width: 36,
              height: 36,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-1)',
            }}
          >
            <ArrowLeft size={18} />
          </button>
          {student && (
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-1)' }}>{student.name}</h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-3)', fontWeight: 500 }}>Roll Number: {student.rollNumber || 'N/A'} · {student.email}</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: 600 }}>STATUS:</span>
          <span 
            style={{
              background: status === 'Completed' ? 'var(--success-dim)' : 'var(--warning-dim)',
              color: status === 'Completed' ? 'var(--success)' : 'var(--warning)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {status}
          </span>
          <div style={{ borderLeft: '1px solid var(--border-2)', height: 28, marginLeft: 8 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700 }}>TOTAL SCORE</span>
            <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--primary)' }}>{totalMarks} Marks</span>
          </div>
        </div>
      </div>

      {/* Split Workspace */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden', height: 'calc(100vh - 120px)' }}>
        
        {/* Left Side: Answer Script Scroll */}
        <div style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: 16 }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-1)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={16} /> Student Answer Script
          </h3>
          
          {evaluations.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-3)' }}>
              <HelpCircle size={40} />
              <p style={{ marginTop: 8 }}>No uploaded images found.</p>
            </div>
          ) : (
            evaluations.map((ev, index) => (
              <div 
                key={ev.questionId} 
                style={{ 
                  position: 'relative', 
                  borderRadius: '8px', 
                  overflow: 'hidden', 
                  border: '1px solid var(--border-2)',
                  background: 'var(--bg-3)',
                  minHeight: '280px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {ev.imageUrl ? (
                  <>
                    {fileTypes[ev.imageUrl] === 'pdf' ? (
                      <iframe 
                        src={ev.imageUrl} 
                        title={`Question ${ev.questionId}`}
                        style={{ width: '100%', height: '420px', border: 'none', background: 'white' }}
                      />
                    ) : (
                      <img 
                        src={ev.imageUrl} 
                        alt={`Question ${ev.questionId}`}
                        style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }}
                      />
                    )}
                    <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(15,23,42,0.85)', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>
                      Question {ev.questionId}
                    </div>
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                      <a 
                        href={ev.imageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          background: 'rgba(15, 23, 42, 0.85)', 
                          color: 'white', 
                          padding: '4px 10px', 
                          borderRadius: '4px', 
                          fontSize: '12px', 
                          fontWeight: 700, 
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={12} /> Open PDF
                      </a>
                    </div>
                    <button 
                      onClick={() => setActiveImage(ev.imageUrl)}
                      style={{ position: 'absolute', bottom: 12, right: 12, background: 'var(--primary)', color: 'white', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                    >
                      <ZoomIn size={16} />
                    </button>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-3)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Info size={16} /> Image missing for {ev.questionId}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right Side: Questions Evaluation Panel */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: '4px' }}>
          {evaluations.map((ev) => {
            const isOverridden = ev.overrideMarks !== null && ev.overrideMarks !== undefined;
            const currentOverride = overrideState[ev.questionId] || {};
            const isSaving = savingOverride[ev.questionId];

            return (
              <div 
                key={ev.questionId} 
                style={{
                  background: 'var(--surface-1)',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  border: isOverridden ? '2px solid var(--success)' : '1px solid var(--border-1)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-1)' }}>Question {ev.questionId}</h3>
                    <span 
                      style={{
                        background: isOverridden ? 'var(--success-dim)' : 'rgba(99, 102, 241, 0.12)',
                        color: isOverridden ? 'var(--success)' : 'var(--primary-light)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        marginTop: 4,
                        display: 'inline-block',
                      }}
                    >
                      {isOverridden ? 'Graded manually' : 'AI Evaluated'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: isOverridden ? 'var(--success)' : 'var(--primary)' }}>
                      {isOverridden ? ev.overrideMarks : ev.aiMarks} Marks
                    </span>
                    {isOverridden && (
                      <span style={{ fontSize: '11px', color: 'var(--text-3)', textDecoration: 'line-through' }}>
                        AI Score: {ev.aiMarks}
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Reasoning */}
                <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 700, color: 'var(--primary-light)', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Info size={13} /> AI FEEDBACK & REASONING
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-1)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                    {ev.aiReasoning || 'AI feedback details pending.'}
                  </p>
                </div>

                {/* Override Marks Controls */}
                {!currentOverride.isEditing ? (
                  <button 
                    onClick={() => handleToggleEdit(ev.questionId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'none',
                      border: '1px solid var(--border-2)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      color: 'var(--text-2)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: 'fit-content',
                      marginTop: 4,
                    }}
                  >
                    <Edit3 size={14} /> Override AI Score
                  </button>
                ) : (
                  <div style={{ background: 'var(--success-dim)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--success)', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--success)' }}>Override Question {ev.questionId} Grade</h4>
                    
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 700 }}>NEW SCORE</label>
                        <input 
                          type="number" 
                          value={currentOverride.marks} 
                          onChange={(e) => handleOverrideValueChange(ev.questionId, 'marks', e.target.value)}
                          style={{
                            width: '80px',
                            height: '36px',
                            borderRadius: '6px',
                            border: '1px solid var(--success)',
                            background: 'var(--surface-1)',
                            padding: '0 8px',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--success)',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                        <label style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 700 }}>REASON FOR CHANGE</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Correct step derivation overlooked by AI."
                          value={currentOverride.reason}
                          onChange={(e) => handleOverrideValueChange(ev.questionId, 'reason', e.target.value)}
                          style={{
                            height: '36px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-2)',
                            background: 'var(--surface-1)',
                            color: 'var(--text-1)',
                            padding: '0 12px',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContainer: 'flex-end', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <button 
                        onClick={() => handleToggleEdit(ev.questionId)}
                        disabled={isSaving}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-3)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '6px 12px',
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleSaveOverride(ev.questionId)}
                        disabled={isSaving}
                        style={{
                          background: 'var(--success)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 16px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Check size={14} /> {isSaving ? 'Saving...' : 'Save Grade'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Zoom Modal */}
      <Modal 
        isOpen={activeImage !== null} 
        onClose={() => setActiveImage(null)}
        title="HD Script Viewer"
        className={styles.wideModal}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-page)', padding: 20, borderRadius: 8, overflow: 'auto', maxHeight: '80vh', width: '100%', height: '70vh' }}>
          {fileTypes[activeImage] === 'pdf' ? (
            <iframe 
              src={activeImage} 
              title="HD Script Page" 
              style={{ width: '100%', height: '100%', border: 'none', background: 'white', borderRadius: '4px' }}
            />
          ) : (
            <img 
              src={activeImage} 
              alt="HD Script Page" 
              style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StudentGradingDetail;
