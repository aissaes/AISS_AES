import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, RefreshCw, Award, ChevronRight } from 'lucide-react';
import { questionPaperAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import styles from './FacultyDashboard.module.css';

const Evaluations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getStatusInfo = (exam) => {
    if (!exam.questionPaper) return { label: 'Paper Missing', color: styles.badgePending, canEvaluate: false };
    const s = exam.questionPaper.status;
    if (s === 'Approved') return { label: 'Active / Approved', color: styles.badgeApproved, canEvaluate: true };
    if (s === 'Rejected') return { label: 'Paper Rejected', color: styles.badgeDanger, canEvaluate: false };
    return { label: 'Paper Pending Review', color: styles.badgePending, canEvaluate: false };
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <div>
            <h2 className={styles.bannerTitle}>Submissions & Evaluations</h2>
            <p className={styles.bannerRole}>Grade student scripts, trigger AI evaluations, and override scores.</p>
          </div>
        </div>
        <button className={styles.ghostBtn} onClick={fetchExams} disabled={loading}>
          <RefreshCw size={14} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft || ''} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={18} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>My Assigned Courses</h3>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div className={styles.spinner} style={{ margin: 'auto' }} />
          ) : exams.length === 0 ? (
            <div className={styles.emptyCenter}>
              <span className={styles.emptyIcon}>🎓</span>
              <p className={styles.emptyText}>You are not assigned to evaluate any exams yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {exams.map((exam) => {
                const status = getStatusInfo(exam);
                return (
                  <div 
                    key={exam._id} 
                    className={styles.examItem}
                    style={{
                      borderLeft: status.canEvaluate ? '4px solid var(--primary)' : '4px solid #cbd5e1',
                      padding: '16px 20px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4 className={styles.examTitle} style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {exam.subjectName} <span className={styles.examCode} style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#475569', marginLeft: '6px' }}>{exam.subjectCode}</span>
                      </h4>
                      <div className={styles.examMeta} style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '13px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> {new Date(exam.date).toLocaleDateString()}</span>
                        <span>Max Marks: <strong>{exam.maxMarks}</strong></span>
                        <span>Semester: <strong>{exam.semester}</strong></span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span className={`${styles.badge || ''} ${status.color}`} style={{ padding: '4px 12px', borderRadius: 12, fontSize: '12px', fontWeight: 600 }}>
                        {status.label}
                      </span>
                      {status.canEvaluate ? (
                        <button 
                          className={styles.primaryBtn} 
                          onClick={() => navigate(`/faculty/evaluations/${exam._id}`)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          Grade Scripts <ChevronRight size={14} />
                        </button>
                      ) : (
                        <button 
                          className={styles.primaryBtn} 
                          disabled
                          style={{
                            background: '#cbd5e1',
                            color: '#94a3b8',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'not-allowed',
                          }}
                        >
                          Lock Graded
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
    </div>
  );
};

export default Evaluations;
