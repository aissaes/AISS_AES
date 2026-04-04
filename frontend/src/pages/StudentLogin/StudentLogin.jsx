import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, CheckCircle2, GraduationCap } from 'lucide-react';
import { studentAuthAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import styles from '../Login/Login.module.css';

const StudentLogin = () => {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Both email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await studentAuthAPI.login({ email, password });
      // update context (which expects a token and user data)
      login(res.data.token, res.data.student);
      navigate('/student'); // Redirect to Student Dashboard
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.grid} />
      <div className={styles.box}>
        <div className={styles.logoWrap}>
          <div className={styles.logo}>
            <GraduationCap size={32} />
          </div>
        </div>

        <h1 className={styles.title}>Student Portal</h1>
        <p className={styles.subtitle}>Enter your credentials to take your exams</p>

        {error && (
          <div className={styles.alertError}>
            <AlertCircle size={15} /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Student Email</label>
            <div className={styles.inputWrap}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                type="email"
                placeholder="name@college.edu"
                className={styles.input}
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                type="password"
                placeholder="••••••••"
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className={styles.primaryBtn} disabled={loading}>
            {loading ? <span className={styles.btnSpinner} /> : 'Login to Portal'}
          </button>
        </form>

        <div className={styles.footer}>
          Are you a faculty member? <a href="/login" className={styles.footerLink}>Faculty Login</a>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
