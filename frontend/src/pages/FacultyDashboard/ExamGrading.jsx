import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Cpu, UserCheck, Clock, FileCheck2, AlertCircle, UserPlus } from 'lucide-react';
import { evaluationAPI, timetableAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './FacultyDashboard.module.css';

const ExamGrading = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});



  useEffect(() => {
    fetchExamAndSubmissions();
  }, [examId]);

  const fetchExamAndSubmissions = async () => {
    setLoading(true);
    try {
      // 1. Fetch Exam Meta
      const examRes = await timetableAPI.getExamById(examId);
      setExam(examRes.data.exam);

      // 2. Fetch Appeared Students
      const studentRes = await evaluationAPI.getAppearedStudents(examId);
      setStudents(studentRes.data.students || []);

      // 3. Fetch Grading Results
      const resultRes = await evaluationAPI.getResultOverview(examId);
      setResults(resultRes.data.results || []);
    } catch (err) {
      toast('Failed to load submissions list.', 'error');
    } finally {
      setLoading(false);
    }
  };



  const handleTriggerAI = async (studentId) => {
    setActionLoading(prev => ({ ...prev, [studentId]: true }));
    toast('Triggering AI Evaluation in parallel. Please wait...', 'info');
    try {
      const res = await evaluationAPI.triggerAIEvaluation(examId, studentId);
      if (res.data.success) {
        toast(`AI evaluation complete! Total Marks: ${res.data.totalMarks}`, 'success');
        fetchExamAndSubmissions();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'AI evaluation triggered but server encountered an issue.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleTriggerAllPending = async () => {
    const pendingStudents = students.filter(student => {
      const result = results.find(r => r.student?._id === student._id);
      return !result || result.status === 'Evaluating';
    });

    if (pendingStudents.length === 0) {
      toast('No pending evaluations found!', 'warning');
      return;
    }

    toast(`Triggering evaluations for ${pendingStudents.length} students concurrently...`, 'info');
    
    // Concurrently trigger all AI evaluations
    const promises = pendingStudents.map(student => handleTriggerAI(student._id));
    await Promise.all(promises);
  };

  // Stats calculation
  const totalSubmissions = students.length;
  const gradedCount = results.filter(r => r.status === 'Completed').length;
  const pendingCount = totalSubmissions - gradedCount;

  return (
    <div className={styles.pageWrap}>
      {/* Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button 
          onClick={() => navigate('/faculty/evaluations')}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Back to Courses
        </button>
      </div>

      {exam && (
        <div className={styles.banner}>
          <div className={styles.bannerLeft}>
            <div>
              <h2 className={styles.bannerTitle}>{exam.subjectName} Submissions</h2>
              <p className={styles.bannerRole}>{exam.subjectCode} · Semester {exam.semester} · Max Marks: {exam.maxMarks}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className={styles.ghostBtn} onClick={fetchExamAndSubmissions} disabled={loading}>
              <RefreshCw size={14} className={loading ? styles.spin : ''} /> Refresh
            </button>

            {pendingCount > 0 && (
              <button 
                className={styles.primaryBtn} 
                onClick={handleTriggerAllPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--warning)',
                }}
              >
                <Cpu size={14} /> Evaluate All Pending
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className={styles.statsGrid} style={{ marginBottom: 24 }}>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.statIconWrap}><UserCheck size={22} /></div>
          <div>
            <p className={styles.statValue}>{totalSubmissions}</p>
            <p className={styles.statLabel}>Appeared Students</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.statIconWrap}><FileCheck2 size={22} /></div>
          <div>
            <p className={styles.statValue}>{gradedCount}</p>
            <p className={styles.statLabel}>Graded Submissions</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.amber}`}>
          <div className={styles.statIconWrap}><Clock size={22} /></div>
          <div>
            <p className={styles.statValue}>{pendingCount}</p>
            <p className={styles.statLabel}>Pending Evaluation</p>
          </div>
        </div>
      </div>

      {/* Submissions List Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Student Submissions & Grades</h3>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div className={styles.spinner} style={{ margin: 'auto' }} />
          ) : students.length === 0 ? (
            <div className={styles.emptyCenter}>
              <AlertCircle size={48} color="#94a3b8" />
              <p className={styles.emptyText} style={{ marginTop: 12 }}>No answer scripts have been uploaded for this exam yet.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569', fontSize: '13px', fontWeight: 600 }}>
                  <th style={{ padding: '12px 8px' }}>Student Name</th>
                  <th style={{ padding: '12px 8px' }}>Roll Number</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                  <th style={{ padding: '12px 8px' }}>Total Marks</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const result = results.find(r => r.student?._id === student._id);
                  const isEvaluating = result?.status === 'Evaluating';
                  const isCompleted = result?.status === 'Completed';
                  
                  let statusLabel = 'Not Evaluated';
                  let statusBg = '#e2e8f0';
                  let statusColor = '#475569';
                  
                  if (isEvaluating) {
                    statusLabel = 'Evaluating';
                    statusBg = '#fef3c7';
                    statusColor = '#d97706';
                  } else if (isCompleted) {
                    statusLabel = 'Completed';
                    statusBg = '#dcfce7';
                    statusColor = '#15803d';
                  }

                  const marks = isCompleted ? result.totalMarksObtained : '—';
                  const isPendingAI = actionLoading[student._id];

                  return (
                    <tr key={student._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#1e293b' }}>
                      <td style={{ padding: '16px 8px', fontWeight: 600 }}>{student.name}</td>
                      <td style={{ padding: '16px 8px' }}>{student.rollNumber || 'N/A'}</td>
                      <td style={{ padding: '16px 8px' }}>
                        <span 
                          style={{
                            background: statusBg,
                            color: statusColor,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '16px 8px', fontWeight: 700, fontSize: '15px' }}>{marks}</td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button
                            className={styles.primaryBtn}
                            onClick={() => handleTriggerAI(student._id)}
                            disabled={isPendingAI}
                            style={{
                              background: isCompleted ? '#f1f5f9' : 'var(--primary)',
                              color: isCompleted ? '#334155' : 'white',
                              border: isCompleted ? '1px solid #cbd5e1' : 'none',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Cpu size={14} /> 
                            {isPendingAI ? 'Processing...' : isCompleted ? 'Re-evaluate' : 'AI Grade'}
                          </button>
                          
                          {isCompleted && (
                            <button
                              className={styles.primaryBtn}
                              onClick={() => navigate(`/faculty/evaluations/${examId}/student/${student._id}`)}
                              style={{
                                fontSize: '13px',
                              }}
                            >
                              Review & Grade
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>


    </div>
  );
};

export default ExamGrading;
