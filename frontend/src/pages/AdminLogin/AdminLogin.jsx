import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, ArrowRight, Shield, Eye, EyeOff } from 'lucide-react';
import { overallAdminAuthAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import { useAuth } from '../../context/AuthContext';
import styles from '../Login/Login.module.css';

const AdminLogin = () => {
  const navigate  = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const [step, setStep]         = useState(1);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');

  const refs = Array.from({ length: 6 }, () => useRef(null));

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await overallAdminAuthAPI.login({ email, password });
      setInfo(res.data.message || 'OTP sent to your admin email');
      setStep(2);
      setTimeout(() => refs[0].current?.focus(), 120);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit code.'); return; }
    setError('');
    setLoading(true);
    try {
      await overallAdminAuthAPI.verifyOTP({ email, otp: code });
      login({ email }, true);
      toast('Welcome, Overall Admin!', 'success');
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
      setOtp(['', '', '', '', '', '']);
      refs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) refs[i + 1].current?.focus();
  };

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs[i - 1].current?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const next = [...otp];
    pasted.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    refs[Math.min(pasted.length, 5)].current?.focus();
    e.preventDefault();
  };

  const goBack = () => {
    setStep(1); setOtp(['','','','','','']); setError(''); setInfo('');
  };

  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden />
      <div className={styles.box}>
        <div className={styles.logoWrap}>
          <div className={styles.logo} style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
            <Shield size={28} strokeWidth={2} />
          </div>
        </div>

        <h1 className={styles.title}>
          {step === 1 ? 'Platform Admin' : 'Verify Identity'}
        </h1>
        <p className={styles.subtitle}>
          {step === 1
            ? 'Overall Admin access — restricted login'
            : `A 6-digit code was sent to ${email}`}
        </p>

        {error && (
          <div className={styles.alertError} role="alert">
            <ShieldCheck size={15} /> {error}
          </div>
        )}
        {info && !error && (
          <div className={styles.alertInfo}>
            <ShieldCheck size={15} /> {info}
          </div>
        )}

        {step === 1 && (
          <form className={styles.form} onSubmit={handleLoginSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="admin-email">Admin Email</label>
              <div className={styles.inputWrap}>
                <Mail size={16} className={styles.inputIcon} />
                <input
                  id="admin-email" type="email" className={styles.input}
                  placeholder="admin@aiss-platform.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email"
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="admin-pass">Password</label>
              <div className={styles.inputWrap}>
                <Lock size={16} className={styles.inputIcon} />
                <input
                  id="admin-pass" type={showPass ? 'text' : 'password'}
                  className={`${styles.input} ${styles.inputPadRight}`}
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                />
                <button type="button" className={styles.eyeBtn}
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Hide' : 'Show'}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading
                ? <><span className={styles.btnSpinner} /> Authenticating…</>
                : <><span>Continue</span><ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        {step === 2 && (
          <form className={styles.form} onSubmit={handleVerifyOtp} noValidate>
            <div className={styles.otpRow} onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
                  className={`${styles.otpBox} ${digit ? styles.otpFilled : ''}`}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e)}
                  aria-label={`OTP digit ${i + 1}`}
                />
              ))}
            </div>
            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading
                ? <><span className={styles.btnSpinner} /> Verifying…</>
                : <><ShieldCheck size={16} /><span>Verify & Sign In</span></>}
            </button>
            <button type="button" className={styles.ghostBtn} onClick={goBack}>
              ← Back to Login
            </button>
          </form>
        )}

        {step === 1 && (
          <p className={styles.footer}>
            Faculty / Staff login?{' '}
            <Link to="/login" className={styles.footerLink}>Sign in here</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
