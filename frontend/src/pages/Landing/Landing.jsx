import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit, ArrowRight, Sparkles, Shield, GraduationCap,
  ClipboardCheck, BarChart3, Users, Lock, Zap, Eye, CheckCircle2,
  Crown, Building2, Mail, Phone, MapPin, Search
} from 'lucide-react';
import { collegeAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './Landing.module.css';

/* ─────────────────────────────────────────────────
   Typing effect hook
───────────────────────────────────────────────── */
const useTypingEffect = (words, typingSpeed = 100, deletingSpeed = 60, pauseMs = 1800) => {
  const [text, setText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIdx];
    let timer;

    if (!isDeleting && text === current) {
      timer = setTimeout(() => setIsDeleting(true), pauseMs);
    } else if (isDeleting && text === '') {
      setIsDeleting(false);
      setWordIdx(i => (i + 1) % words.length);
    } else {
      timer = setTimeout(() => {
        setText(prev =>
          isDeleting
            ? prev.slice(0, -1)
            : current.slice(0, prev.length + 1)
        );
      }, isDeleting ? deletingSpeed : typingSpeed);
    }
    return () => clearTimeout(timer);
  }, [text, isDeleting, wordIdx, words, typingSpeed, deletingSpeed, pauseMs]);

  return text;
};

/* ─────────────────────────────────────────────────
   Scroll-triggered fade-up hook
───────────────────────────────────────────────── */
const useFadeUp = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) el.classList.add(styles.visible); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
};

const FadeUp = ({ children, className = '' }) => {
  const ref = useFadeUp();
  return <div ref={ref} className={`${styles.fadeUp} ${className}`}>{children}</div>;
};

/* ─────────────────────────────────────────────────
   Feature data
───────────────────────────────────────────────── */
const FEATURES = [
  { icon: <BrainCircuit size={24} />, cls: 'iconPurple', title: 'AI-Powered Evaluation',     desc: 'Leverage advanced AI to grade answer sheets with precision, consistency, and speed — eliminating human bias.' },
  { icon: <ClipboardCheck size={24} />, cls: 'iconCyan',  title: 'Smart Answer Analysis',    desc: 'Deep NLP analysis of student responses with keyword matching, semantic understanding, and contextual scoring.' },
  { icon: <Shield size={24} />,         cls: 'iconGreen', title: 'Role-Based Security',       desc: 'Granular access control with College Admin, HOD, and Faculty roles — each with tailored permissions and views.' },
  { icon: <BarChart3 size={24} />,      cls: 'iconAmber', title: 'Real-time Analytics',       desc: 'Live dashboards with performance metrics, grade distributions, and actionable insights at every level.' },
  { icon: <Lock size={24} />,           cls: 'iconPink',  title: 'Instant UI Access',      desc: 'Optimized local caching so dashboards and analytics load instantly while securely authenticating in the background.' },
  { icon: <Zap size={24} />,            cls: 'iconRed',   title: '2FA Authentication',        desc: 'Email-based OTP verification on every login for maximum account security.' },
];

const STEPS = [
  { title: 'Register & Get Approved',  desc: 'Faculty submits registration → HOD or College Admin reviews and approves the request.' },
  { title: 'Secure Login with OTP',    desc: 'Two-factor authentication via email OTP ensures only verified users access the system.' },
  { title: 'Upload & Evaluate',        desc: 'Upload student answer sheets and let AI analyze, score, and generate detailed feedback.' },
  { title: 'Review & Export Results',   desc: 'Review AI-graded results on your dashboard, compare analytics, and export reports.' },
];

const STATS = [
  { value: '99.2%', label: 'Grading Accuracy',  cls: 'statGrad1', fill: '99' },
  { value: '10×',   label: 'Faster Evaluation',  cls: 'statGrad2', fill: '92' },
  { value: 'Zero', label: 'Latency UI',   cls: 'statGrad3', fill: '100' },
  { value: '24/7',  label: 'Availability',       cls: 'statGrad4', fill: '95' },
];

const ROLES = [
  {
    icon: <Crown size={28} />,
    cls: 'roleSA',
    title: 'College Admin',
    desc: 'College-wide oversight and administration.',
    perks: ['Approve/reject faculty & HOD registrations', 'Transfer College Admin role', 'View all departments & analytics'],
  },
  {
    icon: <Building2 size={28} />,
    cls: 'roleHOD',
    title: 'Head of Department',
    desc: 'Department-level management and approvals.',
    perks: ['Approve department faculty registrations', 'Switch between HOD & Faculty views', 'Monitor department performance'],
  },
  {
    icon: <GraduationCap size={28} />,
    cls: 'roleFac',
    title: 'Faculty',
    desc: 'Core evaluation and grading workflow.',
    perks: ['Upload & evaluate answer sheets with AI', 'Access personal performance dashboard', 'Export grading reports'],
  },
];

/* ─────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────── */
const Landing = () => {
  const navigate = useNavigate();
  const typedWord = useTypingEffect([
    'Evaluation', 'Grading', 'Analysis', 'Assessment', 'Insights'
  ], 110, 70, 2000);

  /* Fluid bars — animate on scroll */
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* Feature card mouse-follow glow */
  const handleCardMouse = useCallback((e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    card.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, []);

  const [collegeModalOpen, setCollegeModalOpen] = useState(false);
  const [collegeForm, setCollegeForm] = useState({
    collegeName: '', location: '', adminName: '', adminEmail: '', adminPhone: '', departments: ["Computer Science", "Engineering"] // default
  });
  const [registering, setRegistering] = useState(false);
  const { toast } = useToast();

  const handleRegisterCollege = async (e) => {
    e.preventDefault();
    if(!collegeForm.collegeName || !collegeForm.adminEmail || !collegeForm.adminName) {
      toast('Please fill all required fields.', 'warning');
      return;
    }
    setRegistering(true);
    try {
      await collegeAPI.registerRequest(collegeForm);
      toast('College registration submitted! Our team will contact you shortly.', 'success', 6000);
      setCollegeModalOpen(false);
      setCollegeForm({ collegeName: '', location: '', adminName: '', adminEmail: '', adminPhone: '', departments: ["Computer Science", "Engineering"] });
    } catch(err) {
      toast(err.response?.data?.message || 'Registration failed.', 'error');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className={styles.landing}>
      {/* Ambient orbs */}
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />

      {/* ════ NAVBAR ════ */}
      <nav className={styles.navbar} id="landing-navbar">
        <div className={styles.navBrand} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className={styles.navLogoBox}>
            <BrainCircuit size={20} strokeWidth={2.2} />
          </div>
          <span className={styles.navTitle}>AISS_AES</span>
        </div>
        <div className={styles.navLinks}>
          <button className={styles.navLink} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
          <button className={styles.navLink} onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</button>
          <button className={styles.navLink} onClick={() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })}>Roles</button>
          <button className={styles.navLink} onClick={() => setCollegeModalOpen(true)}>Register Institution</button>
          <button className={styles.navLink} onClick={() => navigate('/login')}>Sign In</button>
          <button className={styles.navCta} onClick={() => navigate('/register')}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ════ HERO ════ */}
      <section className={styles.hero} id="hero">
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            AI-Powered Academic Platform
          </div>

          <h1 className={styles.heroTitle}>
            Revolutionize Academic<br />
            <span className={styles.typingWrap}>
              <span className={styles.heroTitleGrad}>{typedWord}</span>
              <span className={styles.cursor} />
            </span>
          </h1>

          <p className={styles.heroSub}>
            AISS_AES combines artificial intelligence with robust role-based access
            to deliver fast, fair, and secure evaluation — from answer sheet to analytics — in one seamless platform.
          </p>

          <div className={styles.heroBtns}>
            <button className={styles.btnPrimary} onClick={() => navigate('/register')} id="hero-get-started">
              <span>Faculty Sign Up</span>
              <ArrowRight size={18} />
            </button>
            <button className={styles.btnSecondary} onClick={() => setCollegeModalOpen(true)} id="hero-explore">
              <Building2 size={18} />
              <span>Register College</span>
            </button>
          </div>
        </div>

        <div className={styles.scrollIndicator}>
          <div className={styles.scrollMouse}>
            <div className={styles.scrollDot} />
          </div>
          <span>Scroll to explore</span>
        </div>
      </section>

      {/* ════ FEATURES ════ */}
      <section className={styles.features} id="features">
        <FadeUp>
          <div className={styles.sectionTag}>
            <Sparkles size={14} />
            FEATURES
          </div>
          <h2 className={styles.sectionTitle}>Everything you need, nothing you don't</h2>
          <p className={styles.sectionSub}>
            Built from the ground up for modern academic institutions that demand
            accuracy, speed, and security.
          </p>
        </FadeUp>

        <div className={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <FadeUp key={i}>
              <div
                className={styles.featureCard}
                onMouseMove={handleCardMouse}
                style={{ transitionDelay: `${i * 0.06}s` }}
              >
                <div className={`${styles.featureIconBox} ${styles[f.cls]}`}>
                  {f.icon}
                </div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ════ STATS ════ */}
      <section className={styles.stats} ref={statsRef}>
        <FadeUp>
          <div className={styles.statsInner}>
            {STATS.map((s, i) => (
              <div className={styles.statItem} key={i}>
                <div className={`${styles.statValue} ${styles[s.cls]}`}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.fluidBar}>
                  <div
                    className={`${styles.fluidFill} ${styles[`fill${i + 1}`]} ${statsVisible ? styles.active : ''}`}
                    style={{ '--fill': `${s.fill}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ════ HOW IT WORKS ════ */}
      <section className={styles.howItWorks} id="how-it-works">
        <FadeUp>
          <div className={styles.sectionTag}>
            <Zap size={14} />
            HOW IT WORKS
          </div>
          <h2 className={styles.sectionTitle}>Up and running in four simple steps</h2>
          <p className={styles.sectionSub}>
            From registration to AI-graded results — the entire workflow is designed
            to be intuitive and fast.
          </p>
        </FadeUp>

        <div className={styles.stepsList}>
          {STEPS.map((s, i) => (
            <FadeUp key={i}>
              <div className={styles.step}>
                <div className={styles.stepNum}>{i + 1}</div>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ════ ROLES ════ */}
      <section className={styles.roles} id="roles">
        <FadeUp>
          <div className={styles.sectionTag}>
            <Users size={14} />
            ROLES & ACCESS
          </div>
          <h2 className={styles.sectionTitle}>Designed for every stakeholder</h2>
          <p className={styles.sectionSub}>
            Role-based access control ensures the right people see the right data —
            nothing more, nothing less.
          </p>
        </FadeUp>

        <div className={styles.rolesGrid}>
          {ROLES.map((r, i) => (
            <FadeUp key={i}>
              <div className={styles.roleCard}>
                <div className={`${styles.roleIconWrap} ${styles[r.cls]}`}>
                  {r.icon}
                </div>
                <h3 className={styles.roleTitle}>{r.title}</h3>
                <p className={styles.roleDesc}>{r.desc}</p>
                <ul className={styles.rolePerks}>
                  {r.perks.map((p, j) => (
                    <li key={j}>
                      <CheckCircle2 size={14} className={styles.rolePerkIcon} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ════ CTA ════ */}
      <section className={styles.cta}>
        <FadeUp>
          <div className={styles.ctaBox}>
            <h2 className={styles.ctaTitle}>Ready to transform your evaluation process?</h2>
            <p className={styles.ctaSub}>
              Join institutions already using AISS_AES to deliver faster, fairer,
              and more secure academic evaluations.
            </p>
            <div className={styles.ctaBtns}>
              <button className={styles.btnPrimary} onClick={() => setCollegeModalOpen(true)} id="cta-get-started">
                <Building2 size={18} />
                <span>Register Your Institution</span>
              </button>
              <button className={styles.btnSecondary} onClick={() => navigate('/register')} id="cta-sign-in">
                <Users size={16} />
                <span>Faculty Sign Up</span>
              </button>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ════ FOOTER ════ */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <BrainCircuit size={16} />
          <span>AISS_AES</span>
        </div>
        <span>© {new Date().getFullYear()} AISS_AES. All rights reserved.</span>
        <div className={styles.footerLinks}>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#roles">Roles</a>
        </div>
      </footer>

      <Modal
        isOpen={collegeModalOpen}
        onClose={() => !registering && setCollegeModalOpen(false)}
        title="Register Your Institution"
        size="lg"
      >
        <form onSubmit={handleRegisterCollege} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
           <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 8 }}>
             Register your college to get access to the platform. Only the requesting person will get the College Admin account initially.
           </p>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
               <label style={{ fontSize: 13, color: 'var(--text-2)' }}>College Name *</label>
               <input className={styles.modalInput} required value={collegeForm.collegeName} onChange={e => setCollegeForm({...collegeForm, collegeName: e.target.value})} placeholder="e.g. AISS Institute" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border-2)', color: 'white' }} />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
               <label style={{ fontSize: 13, color: 'var(--text-2)' }}>Location / City</label>
               <input className={styles.modalInput} value={collegeForm.location} onChange={e => setCollegeForm({...collegeForm, location: e.target.value})} placeholder="e.g. Bangalore" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border-2)', color: 'white' }} />
             </div>
           </div>

           <h4 style={{ color: 'var(--text-1)', marginTop: '10px', fontSize: 14 }}>College Admin Details</h4>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
               <label style={{ fontSize: 13, color: 'var(--text-2)' }}>Admin Name *</label>
               <input className={styles.modalInput} required value={collegeForm.adminName} onChange={e => setCollegeForm({...collegeForm, adminName: e.target.value})} placeholder="e.g. Dr. John Doe" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border-2)', color: 'white' }} />
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                 <label style={{ fontSize: 13, color: 'var(--text-2)' }}>Admin Email *</label>
                 <input className={styles.modalInput} type="email" required value={collegeForm.adminEmail} onChange={e => setCollegeForm({...collegeForm, adminEmail: e.target.value})} placeholder="admin@institute.edu" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border-2)', color: 'white' }} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                 <label style={{ fontSize: 13, color: 'var(--text-2)' }}>Admin Phone Number</label>
                 <input className={styles.modalInput} type="tel" value={collegeForm.adminPhone} onChange={e => setCollegeForm({...collegeForm, adminPhone: e.target.value})} placeholder="+91 9876543210" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border-2)', color: 'white' }} />
               </div>
             </div>
           </div>
           
           <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
             <button type="button" onClick={() => setCollegeModalOpen(false)} style={{ padding: '10px 18px', background: 'var(--surface-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer' }} disabled={registering}>
               Cancel
             </button>
             <button type="submit" style={{ padding: '10px 18px', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} disabled={registering}>
               {registering ? 'Submitting...' : <><CheckCircle2 size={16} /> Submit Registration</>}
             </button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default Landing;
