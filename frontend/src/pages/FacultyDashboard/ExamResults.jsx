import React, { useEffect, useState } from 'react';
import { FileText, BookOpen, Clock, Activity, Edit3, X, RefreshCw, BarChart2 } from 'lucide-react';
import { questionPaperAPI, facultyAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './FacultyDashboard.module.css';

const ExamResults = () => {
  const { toast } = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state
  // null = list of exams, examId = list of students for that exam
  const [selectedExam, setSelectedExam] = useState(null);
  
  // Results for the selected exam
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Detailed sheet modal
  const [detailModal, setDetailModal] = useState({ open: false, studentId: null, data: null });
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Override Marks state
  const [overrideData, setOverrideData] = useState({ questionId: null, newMarks: 0, newFeedback: '' });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await questionPaperAPI.getAssignments();
      setExams(res.data.exams || []);
    } catch {
      toast('Failed to load your assigned exams.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExam = async (exam) => {
    setSelectedExam(exam);
    setLoadingResults(true);
    try {
      const res = await facultyAPI.getExamResults(exam._id);
      setResults(res.data.results || []);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to fetch results.', 'error');
      setSelectedExam(null);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleViewDetailedSheet = async (resultId, studentId) => {
    setLoadingDetail(true);
    setDetailModal({ open: true, studentId, data: null, resultId });
    try {
      const res = await facultyAPI.getDetailedAnswerSheet(selectedExam._id, studentId);
      setDetailModal(prev => ({ ...prev, data: res.data }));
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load detailed sheet.', 'error');
      setDetailModal({ open: false, studentId: null, data: null, resultId: null });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOverrideSubmit = async () => {
    if (!overrideData.questionId) return;
    try {
      await facultyAPI.overrideQuestionMarks(detailModal.resultId, overrideData);
      toast('Marks successfully overridden.', 'success');
      setOverrideData({ questionId: null, newMarks: 0, newFeedback: '' });
      // Refresh detailed sheet
      handleViewDetailedSheet(detailModal.resultId, detailModal.studentId);
      // Refresh aggregate results in background
      facultyAPI.getExamResults(selectedExam._id).then(res => setResults(res.data.results || []));
    } catch (err) {
      toast(err.response?.data?.message || 'Override failed.', 'error');
    }
  };

  const goBack = () => {
    setSelectedExam(null);
    setResults([]);
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <div>
            <h2 className={styles.bannerTitle}>Exam Results</h2>
            <p className={styles.bannerRole}>View, analyze, and override automated exam evaluations</p>
          </div>
        </div>
        <button className={styles.ghostBtn} onClick={() => selectedExam ? handleSelectExam(selectedExam) : fetchExams()} disabled={loading || loadingResults}>
          <RefreshCw size={14} className={(loading || loadingResults) ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <BarChart2 size={18} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>{selectedExam ? `Results for ${selectedExam.subjectName}` : 'Select an Exam'}</h3>
            </div>
          </div>
          {selectedExam && (
            <button className={styles.ghostBtn} onClick={goBack} style={{ padding: '6px 12px' }}>
               Back to Exams
            </button>
          )}
        </div>

        <div style={{ padding: 20 }}>
          {!selectedExam ? (
            /* EXAM LIST VIEW */
            loading ? <div className={styles.spinner} style={{ margin: 'auto' }} /> : exams.length === 0 ? (
              <div className={styles.emptyCenter}>
                <span className={styles.emptyIcon}>📊</span>
                <p className={styles.emptyText}>You have no assigned exams for reviewing results.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {exams.map(exam => (
                  <div key={exam._id} className={styles.examItem} style={{ border: '1px solid var(--border-base)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h4 className={styles.examTitle}>
                        {exam.subjectName} <span className={styles.examCode}>{exam.subjectCode}</span>
                      </h4>
                      <p className={styles.examMeta} style={{ marginTop: '8px' }}>
                        <Clock size={13} /> {new Date(exam.date).toLocaleDateString()} · Max Marks: {exam.maxMarks}
                      </p>
                    </div>
                    <div>
                      <button className={styles.actionBtn} onClick={() => handleSelectExam(exam)} style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', border: 'none' }}>
                        <Activity size={14} /> View Student Results
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* STUDENT RESULTS VIEW */
            loadingResults ? <div className={styles.spinner} style={{ margin: 'auto' }} /> : results.length === 0 ? (
              <div className={styles.emptyCenter}>
                <span className={styles.emptyIcon}>📝</span>
                <p className={styles.emptyText}>No students have been graded for this exam yet.</p>
              </div>
            ) : (
              <div className={styles.tableWrap} style={{ marginTop: '16px' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                      <th>Obtained Marks</th>
                      <th>Total Marks</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((resItem) => (
                      <tr key={resItem._id}>
                        <td className={styles.nameCell}>{resItem.student?.name || 'Unknown'}</td>
                        <td>{resItem.student?.rollNumber || 'N/A'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{resItem.marksObtained}</td>
                        <td>{resItem.totalMarks}</td>
                        <td>
                          {resItem.isManuallyEvaluated ? (
                            <span className={`${styles.badge} ${styles.badgeWarning}`}>Overridden</span>
                          ) : (
                            <span className={`${styles.badge} ${styles.badgeSuccess}`}>AI Graded</span>
                          )}
                        </td>
                        <td>
                          <button 
                            className={styles.ghostBtn} 
                            onClick={() => handleViewDetailedSheet(resItem._id, resItem.student?._id)}
                          >
                            <FileText size={14} /> View Sheet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Detailed Answer Sheet Modal ── */}
      <Modal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, studentId: null, data: null, resultId: null })}
        title={detailModal.data ? `Detailed Result: ${detailModal.data.studentInfo?.name}` : "Detailed Result"}
        className={styles.wideModal} // from CSS module
        style={{ maxWidth: '900px' }}
      >
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {loadingDetail || !detailModal.data ? (
            <div className={styles.spinner} style={{ margin: '40px auto' }} />
          ) : (
            <>
              {/* Score summary block */}
              <div style={{ display: 'flex', gap: '16px', background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-base)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Overall Score</p>
                  <h3 style={{ fontSize: '1.4rem', color: 'var(--text-1)' }}>{detailModal.data.overallScore.obtained} / {detailModal.data.overallScore.total}</h3>
                </div>
                {detailModal.data.overallScore.isManuallyEvaluated && (
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--warning-bg)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--warning-border)', color: 'var(--warning)', fontWeight: 600 }}>
                    Faculty Overridden
                  </div>
                )}
              </div>

              {/* Questions Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h4 style={{ color: 'var(--text-1)' }}>Question Breakdown</h4>
                {detailModal.data.breakdown.map((q, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-base)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h5 style={{ color: 'var(--text-1)', fontSize: '1rem', fontWeight: 600 }}>Question ID: {q.questionId}</h5>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ background: 'var(--surface-2)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', color: 'var(--text-2)', border: '1px solid var(--border-base)' }}>
                          AI Marks: {q.aiMarks} / {q.maxMarks}
                        </span>
                        {q.facultyMarks !== null && (
                          <span style={{ background: 'var(--warning-bg)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', color: 'var(--warning)', border: '1px solid var(--warning-border)' }}>
                            Faculty: {q.facultyMarks} / {q.maxMarks}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ background: 'var(--bg-1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-base)', color: 'var(--text-2)', fontSize: '0.9rem' }}>
                      <strong>AI Explanation:</strong> {q.explanation || 'No explanation provided.'}
                    </div>

                    {q.imageUrl && (
                      <div style={{ marginTop: '8px' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '8px' }}>Student Uploaded Image:</p>
                        <img src={q.imageUrl} alt="Student answer" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border-base)' }} />
                      </div>
                    )}

                    <div style={{ marginTop: '12px', pt: '12px', borderTop: '1px solid var(--border-base)', display: 'flex', justifyContent: 'flex-end' }}>
                      {overrideData.questionId === q.questionId ? (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', width: '100%' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>New Marks</label>
                            <input type="number" max={q.maxMarks} min="0" value={overrideData.newMarks} onChange={e => setOverrideData({...overrideData, newMarks: Number(e.target.value)})} className={styles.modalInput} style={{ width: '100px' }} />
                          </div>
                          <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Feedback (Optional)</label>
                            <input type="text" placeholder="Why the change?" value={overrideData.newFeedback} onChange={e => setOverrideData({...overrideData, newFeedback: e.target.value})} className={styles.modalInput} />
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className={styles.ghostBtn} onClick={() => setOverrideData({ questionId: null, newMarks: 0, newFeedback: '' })}>Cancel</button>
                            <button className={styles.primaryBtn} onClick={handleOverrideSubmit}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <button className={styles.actionBtn} onClick={() => setOverrideData({ questionId: q.questionId, newMarks: q.facultyMarks ?? q.aiMarks, newFeedback: '' })}>
                          <Edit3 size={14} /> Override Marks
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ExamResults;
