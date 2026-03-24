import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, ArrowRight, BrainCircuit, Eye, EyeOff } from 'lucide-react';
import { authAPI, facultyAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import { secureStorage } from '../../utils/secureStorage';
import styles from './Login.module.css';

const ROLE_ROUTES = {
  superAdmin: '/superadmin',
  hod: '/hod',
  faculty: '/faculty',
};

const Login = () => {
  const navigate      = useNavigate();
  const { toast }     = useToast();

  /* ── Auto-redirect if already authenticated ── */
  useEffect(() => {
    const cachedRole = secureStorage.getRole();
    if (!cachedRole) return;
    // Verify that the session cookie is still valid
    facultyAPI.getMe()
      .then(res => {
        const role = res.data.profile?.role || cachedRole;
        navigate(ROLE_ROUTES[role] || '/faculty', { replace: true });
      })
      .catch(() => {
        // Cookie expired — clear stale role, stay on login
        secureStorage.clear();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [step, setStep]         = useState(1); // 1 = credentials, 2 = OTP
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');

  const refs = Array.from({ length: 6 }, () => useRef(null));

  /* ── Step 1: enter credentials ── */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      setInfo(res.data.message || 'OTP sent to your email');
      setStep(2);
      setTimeout(() => refs[0].current?.focus(), 120);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: verify OTP ── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit code.'); return; }
    setError('');
    setLoading(true);
    try {
      const res  = await authAPI.verifyOTP({ email, otp: code });
      const role = res.data.role;
      // Store active role so DashboardLayout can pick the right encrypted cache
      secureStorage.setRole(role);
      toast('Welcome back! Redirecting…', 'success');
      if      (role === 'superAdmin') navigate('/superadmin');
      else if (role === 'hod')        navigate('/hod');
      else                            navigate('/faculty');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
      setOtp(['', '', '', '', '', '']);
      refs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP box helpers ── */
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
    const next   = [...otp];
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
      {/* Background grid */}
      <div className={styles.grid} aria-hidden />

      <div className={styles.box}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logo}>
            <BrainCircuit size={28} strokeWidth={2} />
          </div>
        </div>

        <h1 className={styles.title}>
          {step === 1 ? 'Welcome back' : 'Verify Identity'}
        </h1>
        <p className={styles.subtitle}>
          {step === 1
            ? 'Sign in to your AISS_AES account'
            : `A 6-digit code was sent to ${email}`}
        </p>

        {/* Alerts */}
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

        {/* ── Form 1: Credentials ── */}
        {step === 1 && (
          <form className={styles.form} onSubmit={handleLoginSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-email">Email Address</label>
              <div className={styles.inputWrap}>
                <Mail size={16} className={styles.inputIcon} />
                <input
                  id="login-email"
                  type="email"
                  className={styles.input}
                  placeholder="you@institution.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-pass">Password</label>
              <div className={styles.inputWrap}>
                <Lock size={16} className={styles.inputIcon} />
                <input
                  id="login-pass"
                  type={showPass ? 'text' : 'password'}
                  className={`${styles.input} ${styles.inputPadRight}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
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

        {/* ── Form 2: OTP ── */}
        {step === 2 && (
          <form className={styles.form} onSubmit={handleVerifyOtp} noValidate>
            <div className={styles.otpRow} onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={refs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
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

        {/* Footer */}
        {step === 1 && (
          <p className={styles.footer}>
            New to AISS_AES?{' '}
            <Link to="/register" className={styles.footerLink}>Request Access</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
