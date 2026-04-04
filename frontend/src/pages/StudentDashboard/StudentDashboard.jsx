import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Home, FileText, BarChart2, LogOut, CheckCircle2, Clock, Upload, PlusCircle, User } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import { studentAPI, answerAPI, studentAuthAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast/Toast';
import styles from './StudentDashboard.module.css';

/* ── Take Exam Component ── */
const TakeExam = () => {
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [exam, setExam] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  // Time remaining tracker
  const [timeLeft, setTimeLeft] = useState('');

  // Auto-expire session checker
  useEffect(() => {
    if (!session?.expiresAt) return;
    const interval = setInterval(() => {
      const remaining = new Date(session.expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const min = Math.floor(remaining / 60000);
        const sec = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${min}m ${sec}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const verifyToken = async () => {
    if (!token) return toast('Please enter an exam token.', 'warning');
    setLoading(true);
    try {
      const res = await studentAPI.getExamByToken({ token });
      setExam(res.data.message);
    } catch (err) {
      toast(err.response?.data?.message || 'Invalid token.', 'error');
      setExam(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    setLoading(true);
    try {
      const res = await studentAPI.startSession({ token });
      toast('Upload session active!', 'success');
      setSession({ expiresAt: res.data.expiresAt });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to start session.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('examId', exam._id);

      // answerAPI handles the multipart header automatically via client definition
      await answerAPI.upload(formData);
      toast('Answer sheet saved temporarily. Please finalize.', 'info');
      setFile(uploadedFile);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to upload.', 'error');
      if (err.response?.data?.message?.includes('already exists')) {
        // Try reupload if it already exists
        if (window.confirm("An upload already exists. Overwrite?")) {
          handleReupload(uploadedFile);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReupload = async (uploadedFile) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('examId', exam._id);

      await answerAPI.reupload(formData);
      toast('Answer sheet overwritten.', 'info');
      setFile(uploadedFile);
    } catch (err) {
      toast(err.response?.data?.message || 'Re-upload failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm("Are you sure? You cannot change your submission after finalizing.")) return;
    setLoading(true);
    try {
      await answerAPI.finalize({ examId: exam._id });
      toast('Exam submitted successfully! Best of luck.', 'success');
      // Reset view
      setExam(null);
      setSession(null);
      setToken('');
      setFile(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to finalize.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <FileText size={18} className={styles.cardHeaderIcon} />
          <div><h3 className={styles.cardTitle}>{session ? "Active Exam Session" : "Take an Exam"}</h3></div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {!exam ? (
          /* Step 1: Token Input */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
            <label className={styles.label}>Enter Exam Token</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                type="text" 
                placeholder="e.g. 5x8g92kw" 
                value={token} 
                onChange={e => setToken(e.target.value)} 
                className={styles.input} 
                disabled={loading}
              />
              <button className={styles.primaryBtn} onClick={verifyToken} disabled={loading || !token}>
                Verify
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
              Ask your exam invigilator for the 8-character token.
            </p>
          </div>
        ) : !session ? (
          /* Step 2: Confirm Exam */
          <div style={{ background: 'var(--bg-3)', padding: 20, borderRadius: 12, border: '1px solid var(--border-base)' }}>
            <h4 style={{ color: 'var(--text-1)', fontSize: '1.2rem', marginBottom: 8 }}>{exam.subjectName} ({exam.subjectCode})</h4>
            <p style={{ color: 'var(--text-2)', marginBottom: 16 }}>
              <Clock size={14} style={{ position: 'relative', top: 2, marginRight: 4 }} />
              Date: {new Date(exam.date).toLocaleDateString()} | Max Marks: {exam.maxMarks}
            </p>
            <div className={styles.modalAlertWarn} style={{ margin: 0, marginBottom: 16 }}>
              <strong>Important:</strong> Clicking "Start Session" will begin your 15-minute upload window. Make sure your scanned PDFs are ready before proceeding.
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
               <button className={styles.ghostBtn} onClick={() => setExam(null)} disabled={loading}>Cancel</button>
               <button className={styles.primaryBtn} onClick={handleStartSession} disabled={loading}>Start Upload Session</button>
            </div>
          </div>
        ) : (
          /* Step 3: Upload & Finalize */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-1)', padding: '16px 24px', borderRadius: 12, border: '1px solid var(--border-base)' }}>
                <div>
                  <h4 style={{ color: 'var(--text-1)', fontSize: '1.1rem' }}>{exam.subjectName}</h4>
                  <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: 4 }}>Time remaining to upload</p>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: timeLeft === 'Expired' ? 'var(--danger)' : 'var(--accent)', fontFamily: 'monospace' }}>
                   {timeLeft}
                </div>
             </div>

             <div style={{ border: '2px dashed var(--border-base)', borderRadius: 12, padding: '40px 20px', textAlign: 'center', opacity: timeLeft === 'Expired' ? 0.5 : 1 }}>
                <Upload size={32} style={{ color: 'var(--text-3)', margin: '0 auto 12px auto' }} />
                <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: 16 }}>
                  {file ? `Currently saved: ${file.name}` : 'Select your scanned answer sheet (PDF format)'}
                </p>
                <input 
                  type="file" 
                  accept=".pdf" 
                  id="pdf-upload" 
                  style={{ display: 'none' }} 
                  onChange={handleUpload}
                  disabled={loading || timeLeft === 'Expired'}
                />
                <label htmlFor="pdf-upload" className={styles.primaryBtn} style={{ pointerEvents: (loading || timeLeft === 'Expired') ? 'none' : 'auto', display: 'inline-block', maxWidth: 200, padding: '10px 20px' }}>
                  {loading ? 'Uploading...' : (file ? 'Re-upload PDF' : 'Choose PDF')}
                </label>
             </div>

             {file && timeLeft !== 'Expired' && (
               <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border-base)' }}>
                 <button className={styles.successModalBtn} onClick={handleFinalize} disabled={loading} style={{ padding: '12px 24px', fontSize: '1.05rem' }}>
                   <CheckCircle2 size={18} style={{ marginRight: 8 }} /> Finalize Submission
                 </button>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── My Results Component ── */
const MyResults = () => {
  const { toast } = useToast();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentAPI.getMyResults()
      .then(res => setResults(res.data.results || []))
      .catch(err => toast('Failed to load results.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <BarChart2 size={18} className={styles.cardHeaderIcon} />
          <div><h3 className={styles.cardTitle}>My Exam Results</h3></div>
        </div>
      </div>
      <div style={{ padding: 20 }}>
        {loading ? (
           <div className={styles.spinner} style={{ margin: 'auto' }} />
        ) : results.length === 0 ? (
           <div className={styles.emptyCenter}>
             <span className={styles.emptyIcon}>📊</span>
             <p className={styles.emptyText}>No evaluated results available just yet.</p>
           </div>
        ) : (
           <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Your Score</th>
                  <th>Total Marks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r._id}>
                     <td><div className={styles.nameCell} style={{ fontWeight: 600 }}>{r.examId?.subjectName}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{r.examId?.subjectCode}</div></td>
                     <td className={styles.mutedCell}>{new Date(r.examId?.date).toLocaleDateString()}</td>
                     <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.marksObtained}</td>
                     <td>{r.totalMarks}</td>
                     <td><span className={`${styles.badge} ${styles.badgeSuccess}`}>Available</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
        )}
      </div>
    </div>
  );
};


/* ── Dashboard shell ── */
const StudentDashboard = () => {
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  useEffect(() => {
    studentAuthAPI.getProfile().then(r => setProfile(r.data.student)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await studentAuthAPI.logout();
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/student',          label: 'Take Exam',  icon: <PlusCircle size={18} /> },
    { path: '/student/results',  label: 'My Results', icon: <BarChart2 size={18} /> },
  ];

  return (
    <div className={styles.dashboardContainer}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            A<span style={{color: 'var(--accent-light)'}}>E</span>S
          </div>
          <span className={styles.platformName}>Student Portal</span>
        </div>
        <div className={styles.headerRight}>
           <div className={styles.userInfo}>
             <User size={16} /> <span style={{ fontWeight: 500 }}>{profile ? profile.name : 'Loading...'}</span>
           </div>
           <button className={styles.ghostBtn} onClick={handleLogout} style={{ padding: '6px 12px' }}>
              <LogOut size={16} /> Logout
           </button>
        </div>
      </header>

      {/* Main content grid */}
      <div className={styles.mainContent}>
        <aside className={styles.sidebar}>
           <nav className={styles.nav}>
              {navItems.map(item => {
                 const isActive = window.location.pathname === item.path;
                 return (
                   <div 
                     key={item.path} 
                     className={`${styles.navItem} ${isActive ? styles.navActive : ''}`}
                     onClick={() => navigate(item.path)}
                   >
                     {item.icon} {item.label}
                   </div>
                 )
              })}
           </nav>
        </aside>
        
        <main className={styles.contentArea}>
          <Routes>
            <Route path="/"        element={<TakeExam />} />
            <Route path="/results" element={<MyResults />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
