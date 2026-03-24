import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Mail, Lock, Phone, Building2, BookOpen,
  BrainCircuit, ArrowRight, ChevronDown, Eye, EyeOff
} from 'lucide-react';
import { authAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import styles from './Register.module.css';

const COLLEGES = [
  "IIT Bombay","IIT Delhi","IIT Kanpur","IIT Kharagpur","IIT Madras",
  "IIT Roorkee","IIT Guwahati","IIT Hyderabad","NIT Trichy","NIT Surathkal",
  "NIT Warangal","NIT Calicut","NIT Rourkela","NIT Raipur","MNNIT Allahabad",
  "MNIT Jaipur","VIT Vellore","SRM Chennai","Amity University","BITS Pilani",
];

const DEPARTMENTS = [
  "Computer Science and Engineering","Electronics and Communication Engineering",
  "Electrical Engineering","Mechanical Engineering","Civil Engineering",
  "Information Technology","Chemical Engineering","Aerospace Engineering",
  "Biotechnology","Metallurgical Engineering","Mathematics","Physics",
  "Management Studies","Architecture",
];

/* Searchable dropdown sub-component */
const SearchableSelect = ({ id, icon: Icon, placeholder, options, value, onChange, name }) => {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const wrapRef             = useRef(null);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const display  = open ? query : value;

  return (
    <div className={styles.selectWrap} ref={wrapRef}>
      <Icon size={16} className={styles.inputIcon} />
      <input
        id={id}
        type="text"
        className={`${styles.input} ${styles.inputPad}`}
        placeholder={placeholder}
        value={display}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={()  => { setOpen(true); setQuery(''); }}
        onBlur={()   => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        required
        aria-autocomplete="list"
        aria-expanded={open}
      />
      <ChevronDown
        size={16}
        className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
      />
      {open && (
        <div className={styles.dropdown} role="listbox">
          {filtered.length === 0
            ? <div className={styles.dropEmpty}>No matches found</div>
            : filtered.map((opt, i) => (
              <div
                key={i}
                role="option"
                className={`${styles.dropItem} ${value === opt ? styles.dropActive : ''}`}
                onMouseDown={() => { onChange({ target: { name, value: opt } }); setQuery(''); setOpen(false); }}
              >
                {opt}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

/* ── Register page ── */
const Register = () => {
  const navigate  = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '', email: '', password: '', college: '', department: '', phone: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState('');

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.college)    { setError('Please select a college.'); return; }
    if (!form.department) { setError('Please select a department.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      toast(res.data.message || 'Registration submitted! Await approval.', 'success', 6000);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden />

      <div className={styles.box}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logo}><BrainCircuit size={26} strokeWidth={2} /></div>
        </div>

        <h1 className={styles.title}>Request Access</h1>
        <p className={styles.subtitle}>Register for an AISS_AES faculty account</p>

        {error && (
          <div className={styles.alertError} role="alert">{error}</div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-name">Full Name</label>
            <div className={styles.inputWrap}>
              <User size={16} className={styles.inputIcon} />
              <input id="reg-name" name="name" type="text" className={`${styles.input} ${styles.inputPad}`}
                placeholder="Dr. Jane Doe" value={form.name} onChange={handleChange} required />
            </div>
          </div>

          {/* College + Department */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-college">College / Institute</label>
              <SearchableSelect id="reg-college" icon={Building2} name="college" value={form.college}
                onChange={handleChange} options={COLLEGES} placeholder="Search college…" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-dept">Department</label>
              <SearchableSelect id="reg-dept" icon={BookOpen} name="department" value={form.department}
                onChange={handleChange} options={DEPARTMENTS} placeholder="Search dept…" />
            </div>
          </div>

          {/* Email + Phone */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-email">Email</label>
              <div className={styles.inputWrap}>
                <Mail size={16} className={styles.inputIcon} />
                <input id="reg-email" name="email" type="email" className={`${styles.input} ${styles.inputPad}`}
                  placeholder="you@college.edu" value={form.email} onChange={handleChange} required />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-phone">Phone</label>
              <div className={styles.inputWrap}>
                <Phone size={16} className={styles.inputIcon} />
                <input id="reg-phone" name="phone" type="tel" className={`${styles.input} ${styles.inputPad}`}
                  placeholder="9876543210" value={form.phone} onChange={handleChange} required />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-pass">Password</label>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input id="reg-pass" name="password" type={showPass ? 'text' : 'password'}
                className={`${styles.input} ${styles.inputPad} ${styles.inputPadRight}`}
                placeholder="Min. 8 characters" value={form.password} onChange={handleChange} required />
              <button type="button" className={styles.eyeBtn}
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Hide' : 'Show'}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.primaryBtn} disabled={loading}>
            {loading
              ? <><span className={styles.btnSpinner} /> Submitting…</>
              : <><span>Submit Registration</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.footerLink}>Sign In</Link>
        </p>

        <div className={styles.notice}>
          <span>⏳</span>
          Your registration will be reviewed by the HOD or Super Admin before you can log in.
        </div>
      </div>
    </div>
  );
};

export default Register;
