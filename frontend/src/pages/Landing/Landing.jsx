import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'motion/react';
import {
  BrainCircuit, ArrowRight, Shield, GraduationCap,
  Building2, Users, Crown, Calendar, Upload, Play, FileText, Check,
  ChevronRight, ChevronLeft, Cpu, Activity, Server, Database, Share2,
  CheckCircle2, Laptop, Sun, Moon, Zap, Info, Award, BookOpen
} from 'lucide-react';
import { collegeAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import { useTheme } from '../../context/ThemeContext';
import styles from './Landing.module.css';

/* ─────────────────────────────────────────────────
   Typing effect hook
   ───────────────────────────────────────────────── */
const useTypingEffect = (words, typingSpeed = 110, deletingSpeed = 70, pauseMs = 2000) => {
  const [text, setText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIdx];
    let timer;

    if (!isDeleting && text === current) {
      timer = setTimeout(() => setIsDeleting(true), pauseMs);
    } else if (isDeleting && text === '') {
      timer = setTimeout(() => {
        setIsDeleting(false);
        setWordIdx(i => (i + 1) % words.length);
      }, 0);
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
      ([e]) => { 
        if (e.isIntersecting) {
          el.classList.add(styles.visible); 
        }
      },
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
   Dynamic Count Up Hook
   ───────────────────────────────────────────────── */
const useCountUp = (endVal, duration = 2000, trigger = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const end = endVal || 0;
    if (start === end) return;
    const totalMiliseconds = duration;
    const incrementTime = 40;
    const steps = totalMiliseconds / incrementTime;
    const increment = end / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCount(endVal); // snap to exact target value
      } else {
        setCount(Math.floor(start * 10) / 10);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [endVal, duration, trigger]);
  return count;
};

/* ─────────────────────────────────────────────────
   ERP Workflows Data & Definitions
   ───────────────────────────────────────────────── */
const WORKFLOWS = [
  {
    title: 'College Onboarding',
    phase: 'Phase 1: Institutional Setup',
    desc: 'The platform initialized at the root level. College representatives register their institution. Upon verification and approval by the Overall Admin, the college database space is securely provisioned.',
    bullets: [
      'College representative submits detailed registration request',
      'Overall Admin reviews credentials and approves via central admin portal',
      'System initializes default college settings and primary HOD roles'
    ],
    api: 'POST /api/v1/college/request ➔ PUT /api/v1/admin/approve-college/:id',
    schema: 'CollegeModel { status: "Pending" | "Approved", ... }'
  },
  {
    title: 'Academic Structure',
    phase: 'Phase 2: Administrative Provisioning',
    desc: 'The College Admin structures departments, assigns HODs, and manages faculty approvals. HODs configure semesters, establish active courses, and designate class assignments.',
    bullets: [
      'College Admin sets up Departments (CRUD) and assigns HODs',
      'Incoming Faculty registers and gets approved by HOD or College Admin',
      'HOD creates semesters and assigns course types (Core, Electives, Honors)'
    ],
    api: 'POST /collegeadmin/departments ➔ POST /hod/courses',
    schema: 'DepartmentModel ➔ SemesterModel ➔ CourseModel'
  },
  {
    title: 'Student Roster',
    phase: 'Phase 3: Student Onboarding',
    desc: 'Students are cataloged into semesters and departments by the College Admin using CSV bulks. HODs handle course enrollment, including flexible cross-department Open Electives.',
    bullets: [
      'College Admin bulk imports student rosters via CSV files',
      'HOD enrolls students in Core, Elective, and Minor courses',
      'System populates student profile pages and maps academic credits'
    ],
    api: 'POST /collegeadmin/students/bulk-upload ➔ POST /hod/students/assign',
    schema: 'StudentModel ➔ StudentCourseEnrollment'
  },
  {
    title: 'Exam Scheduling',
    phase: 'Phase 4: Timetable Operations',
    desc: 'HODs establish timetables for active semesters, placing exams into slots, assigning specific faculty evaluators, and generating secure exam tokens and QR code sheets.',
    bullets: [
      'HOD creates timetables and maps exams to date-picker slots',
      'HOD generates unique, secure exam tokens and verification QR codes',
      'Students view schedules; sensitive tokens are hidden via API filters'
    ],
    api: 'POST /hod/create ➔ POST /hod/exams/:examId/generate-token',
    schema: 'TimetableModel ➔ ExamModel (assignedFaculty, token, qrCode)'
  },
  {
    title: 'AI Evaluation',
    phase: 'Phase 5: Answer Script Grading',
    desc: 'Students upload script sheets inside a 15-minute UploadSession window. Evaluators upload reference keys and run the AI grading engine. Teachers retain veto override power.',
    bullets: [
      'Secure 15-minute UploadSession timer governs script submissions',
      'Faculty triggers AI to parse script pages and check semantic match',
      'Faculty manually edits individual scores and adds comments'
    ],
    api: 'POST /student/start-session ➔ POST /evaluation/:examId/evaluate',
    schema: 'UploadSessionModel ➔ AnswerModel ➔ ResultModel'
  },
  {
    title: 'Result Analytics',
    phase: 'Phase 6: Result Publication',
    desc: 'Once audited, faculty publishes results. Students receive immediate feedback showing marks breakdown and question-by-question comments, updating stats.',
    bullets: [
      'Faculty updates exam state to published, enabling profile views',
      'Students access marks, question sheets, and AI analysis',
      'Department-wide statistics and class average reports update instantly'
    ],
    api: 'PUT /evaluation/:examId/publish-results ➔ GET /result/student/my-exams',
    schema: 'ResultModel (published: true)'
  }
];

const ROLES_DETAIL = [
  {
    key: 'admin',
    title: 'College Admin',
    icon: <Crown size={20} />,
    tagline: 'College-wide oversight and provisioning',
    desc: 'The central administrator responsible for bootstrapping the college, structuring departments, and handling student accounts.',
    workflow: 'College Lifecycle & Student Roster Provisioning',
    bullets: [
      'Approve/Reject incoming Faculty & HOD registrations',
      'Create, update, or archive Departments (with dependency checks)',
      'Add individual students or bulk upload student rosters via CSV',
      'Monitor college-wide dashboard metrics and stats',
      'Initiate College Admin role transfers'
    ],
    routes: ['GET /collegeadmin/college', 'POST /collegeadmin/departments', 'POST /collegeadmin/students']
  },
  {
    key: 'hod',
    title: 'HOD',
    icon: <Building2 size={20} />,
    tagline: 'Department management and course planning',
    desc: 'Heads of Departments who configure semesters, plan curricula, schedule exam timetables, and manage student enrollments.',
    workflow: 'Curriculum & Semester Setup',
    bullets: [
      'Configure semester status (Active vs. Archived)',
      'Create courses and assign course types (Core, Electives, Minors, Honors)',
      'Approve and register faculty within the department',
      'Assign students to courses (including cross-department Open Electives)',
      'Create central timetables, add exams, and generate secure tokens'
    ],
    routes: ['POST /hod/semesters', 'POST /hod/courses', 'POST /hod/create', 'POST /hod/students/assign']
  },
  {
    key: 'faculty',
    title: 'Faculty',
    icon: <GraduationCap size={20} />,
    tagline: 'AI evaluation, grading, and script review',
    desc: 'Teachers responsible for uploading question papers, coordinating script submissions, and executing AI-powered grading.',
    workflow: 'AI Grading & Quality Control',
    bullets: [
      'Upload question papers and view teaching assignments',
      'Upload reference grading keys and materials',
      'Trigger AI-assisted evaluation for exam answer sheets',
      'Review semantic grading analysis and override AI marks',
      'Publish final exam results to students'
    ],
    routes: ['POST /questionPaper/upload', 'POST /evaluation/:examId/evaluate', 'PUT /evaluation/:examId/student/:studentId/override']
  },
  {
    key: 'student',
    title: 'Student',
    icon: <Users size={20} />,
    tagline: 'Assessment submissions & performance tracking',
    desc: 'Learners who interact with timetables, securely upload exam scripts, and review graded results with detailed AI feedback.',
    workflow: 'Secure Submissions & Analytics Access',
    bullets: [
      'View department schedules and active exam timetables',
      'Initiate secure 15-minute exam upload windows',
      'Upload answer scripts and check submission statuses',
      'Access personal dashboard with exam performance metrics',
      'View question-by-question marks and detailed AI comments'
    ],
    routes: ['GET /student/timetable-exams', 'POST /student/start-session', 'GET /result/student/my-exams']
  }
];

const CAROUSEL_MOCKUPS = [
  {
    title: 'Department & Semester Planner',
    subtitle: 'HOD Interface',
    desc: 'Establish academic calendars, semesters, and curriculum pathways. Toggle semester status dynamically to control enrollment windows.',
    ui: 'hod-semester'
  },
  {
    title: 'Student Roster Bulk Uploader',
    subtitle: 'College Admin Interface',
    desc: 'Bulk upload students via CSV roster imports. Instantly validate college IDs, department assignments, and initial semester associations.',
    ui: 'admin-upload'
  },
  {
    title: 'AI Answer Key Evaluator',
    subtitle: 'Faculty Interface',
    desc: 'Upload reference materials and answer keys. Compare student sheets directly with AI-parsed semantics and override grades on the fly.',
    ui: 'faculty-eval'
  },
  {
    title: 'Exam Submission & Timetable Hub',
    subtitle: 'Student Interface',
    desc: 'Students browse scheduled examinations, scan tokens, and initiate secure 15-minute answer script upload windows.',
    ui: 'student-portal'
  }
];

const Landing = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeWorkflow, setActiveWorkflow] = useState(0);
  const [activeRole, setActiveRole] = useState('admin');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [evalPhase, setEvalPhase] = useState(0);
  const [collegeModalOpen, setCollegeModalOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [collegeForm, setCollegeForm] = useState({
    collegeName: '', location: '', adminName: '', adminEmail: '', adminPhone: ''
  });

  // Soft mount animation state to handle reload/landing entrance elegantly
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  /* Fluid stats bar animation */
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

  /* Count up variables */
  const accuracyVal = useCountUp(99.2, 2000, statsVisible);
  const evalVal = useCountUp(10, 2000, statsVisible);
  const latencyVal = useCountUp(0, 1000, statsVisible);
  const availVal = useCountUp(24, 2000, statsVisible);

  /* AI Eval Auto-player loop */
  useEffect(() => {
    const timer = setInterval(() => {
      setEvalPhase(prev => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const typedWord = useTypingEffect([
    'Evaluations', 'Grading', 'Analysis', 'Assessment', 'Insights'
  ], 110, 70, 2000);

  /* 3D Perspective Tilt for Hero stack */
  const [heroTilt, setHeroTilt] = useState({});
  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -(y / (rect.height / 2)) * 8; // Max 8 degrees tilt
    const rotateY = (x / (rect.width / 2)) * 8;
    setHeroTilt({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      transition: 'transform 0.1s ease-out'
    });
  };
  const handleHeroMouseLeave = () => {
    setHeroTilt({
      transform: `perspective(1000px) rotateX(0deg) rotateY(0deg)`,
      transition: 'transform 0.6s ease-out'
    });
  };

  /* Spotlight mouse move for features section card tracking */
  const handleSpotlightMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    card.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  const handleRegisterCollege = async (e) => {
    e.preventDefault();
    if(!collegeForm.collegeName || !collegeForm.adminEmail || !collegeForm.adminName) {
      toast('Please fill all required fields.', 'warning');
      return;
    }
    setRegistering(true);
    try {
      await collegeAPI.registerRequest(collegeForm);
      toast('College registration submitted! Our Sandbox Environment is now active with your institution. Click "Sign In" to continue.', 'success', 6000);
      setCollegeModalOpen(false);
      setCollegeForm({ collegeName: '', location: '', adminName: '', adminEmail: '', adminPhone: '' });
    } catch {
      toast('Registration failed. Try again.', 'error');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className={`${styles.landing} ${isMounted ? styles.pageVisible : ''}`}>
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
          <button className={styles.navLink} onClick={() => document.getElementById('workflows')?.scrollIntoView({ behavior: 'smooth' })}>Workflows</button>
          <button className={styles.navLink} onClick={() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })}>Roles</button>
          <button className={styles.navLink} onClick={() => document.getElementById('ai-eval')?.scrollIntoView({ behavior: 'smooth' })}>AI Evaluation</button>
          <button className={styles.navLink} onClick={() => document.getElementById('academic-lifecycle')?.scrollIntoView({ behavior: 'smooth' })}>Lifecycle</button>
          <button className={styles.navLink} onClick={() => setCollegeModalOpen(true)}>Register Institution</button>
          <button className={styles.navLink} onClick={() => navigate('/login')}>Sign In</button>
          
          <button
            className={styles.themeToggleBtn}
            onClick={toggleTheme}
            title={`Active Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to toggle)`}
            aria-label="Toggle Theme"
          >
            {theme === 'system' ? <Laptop size={16} /> : theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button className={styles.navCta} onClick={() => navigate('/register')}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ════ HERO ════ */}
      <section className={styles.hero} id="hero" onMouseMove={handleHeroMouseMove} onMouseLeave={handleHeroMouseLeave}>
        <div className={styles.heroInner} style={heroTilt}>
          <FadeUp>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              AI-Powered Academic Platform
            </div>
          </FadeUp>

          <FadeUp>
            <h1 className={styles.heroTitle}>
              Revolutionize Academic<br />
              <div className={styles.typingWrapContainer}>
                <span className={styles.typingWrap}>
                  <span className={styles.heroTitleGrad}>{typedWord}</span>
                  <span className={styles.cursor} />
                </span>
              </div>
            </h1>
          </FadeUp>

          <FadeUp>
            <p className={styles.heroSub}>
              AISS_AES combines artificial intelligence with robust role-based access
              to deliver fast, fair, and secure evaluation — from answer sheet to analytics — in one seamless platform.
            </p>
          </FadeUp>

          <FadeUp>
            <div className={styles.heroBtns}>
              <button className={styles.btnPrimary} onClick={() => navigate('/register')} id="hero-get-started">
                <span>Faculty Sign Up</span>
                <ArrowRight size={18} className={styles.btnIconSlide} />
              </button>
              <button className={styles.btnSecondary} onClick={() => setCollegeModalOpen(true)} id="hero-explore">
                <Building2 size={18} />
                <span>Register College</span>
              </button>
            </div>
          </FadeUp>
        </div>

        <div className={styles.scrollIndicator}>
          <div className={styles.scrollMouse}>
            <div className={styles.scrollDot} />
          </div>
          <span>Scroll to explore</span>
        </div>
      </section>

      {/* Section Transition flow bridge */}
      <div className={styles.flowBridge} />

      {/* ════ ROLE COMMAND CENTER ════ */}
      <section className={styles.roleCommandSection}>
        <FadeUp>
          <div className={styles.sectionTag}>
            <Users size={14} />
            Role-Based Experiences
          </div>
          <h2 className={styles.sectionTitle}>AISS Role Experience Showcase</h2>
          <p className={styles.sectionSub}>
            Platform transformation tailored to responsibilities, powers, and workflows.
          </p>
        </FadeUp>

        <div className={styles.commandCenterLayout}>
          {/* Left Side: Role Selector */}
          <div className={styles.commandSidebar}>
            <button
              className={activeRole === 'admin' ? styles.roleTabActive : styles.roleTab}
              onClick={() => setActiveRole('admin')}
            >
              <Crown size={18} />
              College Admin
            </button>
            <button
              className={activeRole === 'hod' ? styles.roleTabActive : styles.roleTab}
              onClick={() => setActiveRole('hod')}
            >
              <Building2 size={18} />
              HOD
            </button>
            <button
              className={activeRole === 'faculty' ? styles.roleTabActive : styles.roleTab}
              onClick={() => setActiveRole('faculty')}
            >
              <GraduationCap size={18} />
              Faculty
            </button>
            <button
              className={activeRole === 'student' ? styles.roleTabActive : styles.roleTab}
              onClick={() => setActiveRole('student')}
            >
              <Users size={18} />
              Student
            </button>
          </div>

          {/* Right Side: Role Content Area */}
          <div className={styles.commandContent}>
            <AnimatePresence mode="wait">
              {activeRole === 'admin' && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className={styles.roleExperienceCard}
                  data-role="admin"
                >
                  <div className={styles.expHeader}>
                     <h3>Institution Control Center</h3>
                     <p>Manage and oversee the entire academic ecosystem.</p>
                  </div>
                  
                  <div className={styles.expBody}>
                     <div className={styles.expStatsRow}>
                       <div className={styles.expStatBox}><span>Total Students</span><strong>4,320</strong></div>
                       <div className={styles.expStatBox}><span>Active Faculty</span><strong>184</strong></div>
                       <div className={styles.expStatBox}><span>Departments</span><strong>12</strong></div>
                       <div className={styles.expStatBox}><span>Pending</span><strong>7</strong></div>
                     </div>
                     
                     <div className={styles.expVisualArea}>
                        <div className={styles.adminMissionControl}>
                           <div className={styles.missionMetrics}>
                              <div className={styles.missionPulse} /> College Network Online
                           </div>
                           <div className={styles.missionFlowRows}>
                              <div className={styles.missionFlowBox}>Create Department<ChevronRight size={14}/></div>
                              <div className={styles.missionFlowBox}>Semester Setup<ChevronRight size={14}/></div>
                              <div className={styles.missionFlowBox}>Faculty Approval<ChevronRight size={14}/></div>
                              <div className={styles.missionFlowBox}>Institution Monitor</div>
                           </div>
                        </div>
                     </div>
                  </div>
                </motion.div>
              )}

              {activeRole === 'hod' && (
                <motion.div
                  key="hod"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className={styles.roleExperienceCard}
                  data-role="hod"
                >
                  <div className={styles.expHeader}>
                     <h3>Academic Operations Manager</h3>
                     <p>Run an entire department efficiently.</p>
                  </div>
                  <div className={styles.expBody}>
                      <div className={styles.expStatsRow}>
                       <div className={styles.expStatBox}><span>Students</span><strong>850</strong></div>
                       <div className={styles.expStatBox}><span>Active Courses</span><strong>24</strong></div>
                       <div className={styles.expStatBox}><span>Upcoming Exams</span><strong>5</strong></div>
                     </div>
                     
                     <div className={styles.expVisualArea}>
                        <div className={styles.hodOperationsCenter}>
                           <div className={styles.hodTimeline}>
                             <div className={styles.hodTimelineStep}>Create Semester</div>
                             <div className={styles.hodTimelineLine} />
                             <div className={styles.hodTimelineStep}>Create Courses</div>
                             <div className={styles.hodTimelineLine} />
                             <div className={styles.hodTimelineStep}>Assign Faculty</div>
                             <div className={styles.hodTimelineLine} />
                             <div className={styles.hodTimelineStep}>Enroll Students</div>
                           </div>
                           <div className={styles.hodBoard}>
                              <div className={styles.hodCard}>CSE Dept Planning</div>
                              <div className={styles.hodCard}>Course Pipeline</div>
                           </div>
                        </div>
                     </div>
                  </div>
                </motion.div>
              )}

              {activeRole === 'faculty' && (
                <motion.div
                  key="faculty"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className={styles.roleExperienceCard}
                  data-role="faculty"
                >
                  <div className={styles.expHeader}>
                     <h3>AI-Assisted Evaluation Workspace</h3>
                     <p>Teach, evaluate, and publish results efficiently.</p>
                  </div>
                  
                  <div className={styles.expBody}>
                     <div className={styles.facultyAIWorkspace}>
                        <div className={styles.facultyAIPanel}>
                           <div className={styles.beamScanner}>
                              <div className={styles.beamLine} />
                           </div>
                           <div className={styles.codeBlock}>
                              <div className={styles.codeLine} style={{width: '80%'}} />
                              <div className={styles.codeLine} style={{width: '60%'}} />
                              <div className={styles.codeLine} style={{width: '90%'}} />
                              <div className={styles.codeLine} style={{width: '40%'}} />
                           </div>
                        </div>
                        
                        <div className={styles.facultySideStats}>
                           <div className={styles.facultyStatBtn}>AI Scoring <CheckCircle2 size={14} className={styles.greenIcon}/></div>
                           <div className={styles.facultyStatBtn}>Semantic Match <CheckCircle2 size={14} className={styles.greenIcon}/></div>
                           <div className={styles.facultyStatBtn}>Faculty Review <ArrowRight size={14} className={styles.orangeIcon}/></div>
                        </div>
                     </div>
                  </div>
                </motion.div>
              )}

              {activeRole === 'student' && (
                <motion.div
                  key="student"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className={styles.roleExperienceCard}
                  data-role="student"
                >
                  <div className={styles.expHeader}>
                     <h3>Smart Academic Companion</h3>
                     <p>Track academic progress from enrollment to graduation.</p>
                  </div>
                  
                  <div className={styles.expBody}>
                     <div className={styles.studentMobileApp}>
                        <div className={styles.phoneFrame}>
                           <div className={styles.phoneNotch} />
                           <div className={styles.phoneScreen}>
                              <div className={styles.phoneHeader}>
                                 <div>Good morning, Alan</div>
                                 <div className={styles.phoneAvatar} />
                              </div>
                              
                              <div className={styles.phoneGrid}>
                                 <div className={styles.phoneCard} style={{gridColumn: 'span 2', background: 'var(--accent)', color: 'white'}}>
                                    <div className={styles.phoneCardSub}>Today's Exam</div>
                                    <div className={styles.phoneCardTitle}>CS301 Data Structures</div>
                                 </div>
                                 <div className={styles.phoneCard}>CGPA<br/><strong>8.5</strong></div>
                                 <div className={styles.phoneCard}>Credits<br/><strong>120</strong></div>
                                 <div className={styles.phoneCardLine}>
                                    AI Feedback Analysis <ArrowRight size={12}/>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ════ WORKFLOW SHOWCASE SECTION ════ */}
      <section className={styles.workflowsSection} id="workflows">
        <FadeUp>
          <div className={styles.sectionTag}>
            <Cpu size={14} />
            Platform Workflows
          </div>
          <h2 className={styles.sectionTitle}>The Academic Workflow Engine</h2>
          <p className={styles.sectionSub}>
            Trace operations sequentially from the initial registration of an institution to final grading.
          </p>
        </FadeUp>

        <div className={styles.workflowContainer}>
          {/* Timeline header */}
          <div className={styles.workflowTimelineHeader}>
            {WORKFLOWS.map((w, idx) => (
              <button
                key={idx}
                className={`${styles.workflowTimelineBtn} ${activeWorkflow === idx ? styles.active : ''}`}
                onClick={() => setActiveWorkflow(idx)}
              >
                <div className={styles.workflowTimelineCircle}>{idx + 1}</div>
                <span>{w.title}</span>
              </button>
            ))}
          </div>

          {/* Workflow detail card with spotlight hover */}
          <div className={styles.workflowDetailCard} onMouseMove={handleSpotlightMouseMove}>
            <div className={styles.workflowDetailLeft}>
              <div className={styles.workflowPhaseTag}>{WORKFLOWS[activeWorkflow].phase}</div>
              <h3>{WORKFLOWS[activeWorkflow].title}</h3>
              <p>{WORKFLOWS[activeWorkflow].desc}</p>
              
              <ul className={styles.workflowBullets}>
                {WORKFLOWS[activeWorkflow].bullets.map((b, i) => (
                  <li key={i}>
                    <Check size={14} className={styles.bulletCheck} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.workflowDetailRight}>
              <div className={styles.technicalPanel}>
                <h4>Developer Blueprint</h4>
                
                <div className={styles.codeSnippet}>
                  <span className={styles.codeLabel}>API ROUTE</span>
                  <code>{WORKFLOWS[activeWorkflow].api}</code>
                </div>

                <div className={styles.codeSnippet}>
                  <span className={styles.codeLabel}>DATA MODELS</span>
                  <code>{WORKFLOWS[activeWorkflow].schema}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════ STATS ════ */}
      <section className={styles.stats} ref={statsRef}>
        <FadeUp>
          <div className={styles.statsInner}>
            <div className={styles.statItem}>
              <div className={`${styles.statValue} ${styles.statGrad1}`}>
                {statsVisible ? `${accuracyVal}%` : '0%'}
              </div>
              <div className={styles.statLabel}>Grading Accuracy</div>
              <div className={styles.fluidBar}>
                <div className={`${styles.fluidFill} ${styles.fill1} ${statsVisible ? styles.active : ''}`} style={{ '--fill': '99.2%' }} />
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statValue} ${styles.statGrad2}`}>
                {statsVisible ? `${evalVal}×` : '0×'}
              </div>
              <div className={styles.statLabel}>Faster Evaluation</div>
              <div className={styles.fluidBar}>
                <div className={`${styles.fluidFill} ${styles.fill2} ${statsVisible ? styles.active : ''}`} style={{ '--fill': '90%' }} />
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statValue} ${styles.statGrad3}`}>
                {statsVisible ? (latencyVal === 0 ? 'Zero' : latencyVal) : 'Zero'}
              </div>
              <div className={styles.statLabel}>Latency UI</div>
              <div className={styles.fluidBar}>
                <div className={`${styles.fluidFill} ${styles.fill3} ${statsVisible ? styles.active : ''}`} style={{ '--fill': '100%' }} />
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statValue} ${styles.statGrad4}`}>
                {statsVisible ? `${availVal}/7` : '0/7'}
              </div>
              <div className={styles.statLabel}>Availability</div>
              <div className={styles.fluidBar}>
                <div className={`${styles.fluidFill} ${styles.fill4} ${statsVisible ? styles.active : ''}`} style={{ '--fill': '95%' }} />
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ════ CENTERED FEATURE 1 (ADMIN) ════ */}
      <section className={styles.centeredFeatureSection}>
        <FadeUp>
          <div className={styles.centeredFeatureContent}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              Administrative Ecosystem
            </div>
            <h2 className={styles.centeredFeatureTitle}>
              Effortless College <br />
              <span className={styles.heroTitleGrad}>Management</span>
            </h2>
            <p className={styles.centeredFeatureSub}>
              Complete administrative control for College Admins and Department HODs to manage courses, roles, evaluate analytics and lifecycles effortlessly.
            </p>
            <div className={styles.heroBtns} style={{ justifyContent: 'center' }}>
              <button className={styles.btnPrimary} onClick={() => navigate('/login')}>
                <span>Admin Portal</span>
                <ArrowRight size={18} className={styles.btnIconSlide} />
              </button>
              <button className={styles.btnSecondary} onClick={() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })}>
                <Building2 size={18} />
                <span>Explore Roles</span>
              </button>
            </div>
          </div>
        </FadeUp>
        
        <FadeUp>
          <div className={styles.centeredFeatureVisual}>
            <div className={styles.mockBrowserWrapper}>
              <div className={styles.mockBrowserCardLarge}>
              <div className={styles.mockBrowserHeader}>
                <span className={`${styles.browserDot} ${styles.redDot}`} />
                <span className={`${styles.browserDot} ${styles.yellowDot}`} />
                <span className={`${styles.browserDot} ${styles.greenDot}`} />
                <div className={styles.browserAddressMini}>aiss-aes.edu/admin/dashboard</div>
              </div>
              <div className={styles.mockDashboardComplex}>
                <div className={styles.mockDashSidebar}>
                  <div className={styles.mockDashLogo} />
                  <div className={styles.mockDashNav}>
                    <div className={styles.mockDashNavItemActive} />
                    <div className={styles.mockDashNavItem} />
                    <div className={styles.mockDashNavItem} />
                  </div>
                </div>
                <div className={styles.mockDashMain}>
                  <div className={styles.mockDashTopRow}>
                    <div className={styles.mockDashSearch}>
                      <span /> Search ecosystem...
                    </div>
                    <div className={styles.mockDashAvatar} />
                  </div>
                  
                  <div className={styles.mockDashStatsRow}>
                    <div className={styles.mockDashStatCard}>
                       <span className={styles.statIconOrange} />
                       <div className={styles.statTextGroup}>
                         <h6>12,450</h6>
                         <span>Total Students</span>
                       </div>
                    </div>
                    <div className={styles.mockDashStatCard}>
                       <span className={styles.statIconPurple} />
                       <div className={styles.statTextGroup}>
                         <h6>340</h6>
                         <span>Active Courses</span>
                       </div>
                    </div>
                    <div className={styles.mockDashStatCard}>
                       <span className={styles.statIconGreen} />
                       <div className={styles.statTextGroup}>
                         <h6>99.9%</h6>
                         <span>System Health</span>
                       </div>
                    </div>
                  </div>

                  <div className={styles.mockDashActivityArea}>
                    <div className={styles.mockDashChartBox}>
                       <h6>Evaluation Activity</h6>
                       <div className={styles.mockChartBars}>
                         <div style={{ height: '40%' }} />
                         <div style={{ height: '70%' }} />
                         <div style={{ height: '55%' }} />
                         <div style={{ height: '90%' }} />
                         <div style={{ height: '60%' }} />
                         <div style={{ height: '80%', background: 'var(--accent)' }} />
                         <div style={{ height: '30%' }} />
                       </div>
                    </div>
                    <div className={styles.mockDashList}>
                       <h6>Pending Approvals</h6>
                       <div className={styles.mockListItem}>
                         <div className={styles.mockAvatarList} />
                         <div className={styles.mockListText}>
                           <strong>Dr. Alan Turing</strong><span>HOD - Comp Sci</span>
                         </div>
                         <button className={styles.mockListBtn}>Approve</button>
                       </div>
                       <div className={styles.mockListItem}>
                         <div className={styles.mockAvatarList} />
                         <div className={styles.mockListText}>
                           <strong>Dr. Ada Lovelace</strong><span>HOD - Math</span>
                         </div>
                         <button className={styles.mockListBtn}>Approve</button>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
              <div className={`${styles.floatingMetric} ${styles.metricFaculty} ${styles.liftOnHover}`}>
                <Building2 size={14} />
                <span>8 Departments Active</span>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ════ CENTERED FEATURE 2 (STUDENT) ════ */}
      <section className={styles.centeredFeatureSection}>
        <FadeUp>
          <div className={styles.centeredFeatureContent}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              Student-Centric
            </div>
            <h2 className={styles.centeredFeatureTitle}>
              Transparent & Fair <br />
              <span className={styles.heroTitleGrad}>Examinations</span>
            </h2>
            <p className={styles.centeredFeatureSub}>
              Students seamlessly upload answers safely and receive extremely granular AI-driven evaluation insights directly to their dashboard.
            </p>
            <div className={styles.heroBtns} style={{ justifyContent: 'center' }}>
              <button className={styles.btnPrimary} onClick={() => navigate('/login')}>
                <span>Student Portal</span>
                <ArrowRight size={18} className={styles.btnIconSlide} />
              </button>
              <button className={styles.btnSecondary} onClick={() => document.getElementById('ai-eval')?.scrollIntoView({ behavior: 'smooth' })}>
                <CheckCircle2 size={18} />
                <span>View Results</span>
              </button>
            </div>
          </div>
        </FadeUp>
        
        <FadeUp>
          <div className={styles.centeredFeatureVisual}>
             <div className={styles.mockBrowserWrapper}>
               <div className={styles.mockBrowserCardLarge}>
                 <div className={styles.mockBrowserHeader}>
                   <span className={`${styles.browserDot} ${styles.redDot}`} />
                   <span className={`${styles.browserDot} ${styles.yellowDot}`} />
                   <span className={`${styles.browserDot} ${styles.greenDot}`} />
                   <div className={styles.browserAddressMini}>aiss-aes.edu/student/results</div>
                 </div>
                 
                 <div className={styles.mockEvalSplit}>
                   {/* Mock Document Area */}
                   <div className={styles.mockDocArea}>
                     <div className={styles.mockDocHeader}>
                        <div><strong>CS301 Midterm</strong><span>Submit ID: 8A4F9</span></div>
                        <span className={styles.mockDocScorePulse}>8.5 / 10</span>
                     </div>
                     <div className={styles.mockDocBody}>
                        <div className={styles.mockDocLineText} style={{ width: '90%' }} />
                        <div className={styles.mockDocLineText} style={{ width: '85%' }} />
                        <div className={styles.mockDocHighlightRow}>
                          <div className={styles.mockDocLineText} style={{ width: '60%' }} />
                          <div className={styles.mockDocTooltip}>Excellent logic</div>
                        </div>
                        <div className={styles.mockDocLineText} style={{ width: '95%' }} />
                        <div className={styles.mockDocLineText} style={{ width: '70%' }} />
                        <div className={styles.mockDocHighlightRowYellow}>
                          <div className={styles.mockDocLineText} style={{ width: '40%' }} />
                          <div className={styles.mockDocTooltipYellow}>Missing base case</div>
                        </div>
                     </div>
                   </div>
                   
                   {/* Mock AI Panel */}
                   <div className={styles.mockAIPanelSidebar}>
                      <h6>AI Evaluation Breakdown</h6>
                      <div className={styles.mockAIPanelMetric}>
                         <div className={styles.mockAIMetricHeader}>
                           <span>Algorithm Efficiency</span>
                           <strong>9/10</strong>
                         </div>
                         <div className={styles.mockAIPBarOuter}>
                           <div className={styles.mockAIPBarInner} style={{ width: '90%', background: '#10b981' }} />
                         </div>
                      </div>
                      <div className={styles.mockAIPanelMetric}>
                         <div className={styles.mockAIMetricHeader}>
                           <span>Code Quality</span>
                           <strong>8/10</strong>
                         </div>
                         <div className={styles.mockAIPBarOuter}>
                           <div className={styles.mockAIPBarInner} style={{ width: '80%', background: '#0ea5e9' }} />
                         </div>
                      </div>
                      <div className={styles.mockAIPanelComment}>
                         <strong>Feedback:</strong> 
                         <p>Great approach using dynamic programming. Small penalty for missing the boundary condition check on line 12.</p>
                      </div>
                   </div>
                 </div>
               </div>
               <div className={`${styles.floatingMetric} ${styles.metricStudents} ${styles.liftOnHover}`}>
                 <ArrowRight size={14} />
                 <span>View Feedback Line-by-Line</span>
               </div>
             </div>
          </div>
        </FadeUp>
      </section>

      {/* ════ PLATFORM WORKFLOW ARCHITECTURE ════ */}
      <section className={styles.ecosystemGraphSection} id="roles">
        <FadeUp>
          <div className={styles.sectionTag}>
            <Activity size={14} />
            Ecosystem Network
          </div>
          <h2 className={styles.sectionTitle}>Platform Workflow Architecture</h2>
          <p className={styles.sectionSub}>
            A unified flow connecting administrative operations, faculty grading, and student experiences.
          </p>
        </FadeUp>

        <div className={styles.graphContainer}>
          {/* Top Layer: Admins & HODs */}
          <div className={styles.graphRow}>
            <div className={styles.graphNode} data-role="admin">
              <div className={styles.nodeIcon}><Crown size={20} /></div>
              <div className={styles.nodeText}>
                <h4>College Admin</h4>
                <span>Institution Core</span>
              </div>
            </div>
            
            <div className={styles.graphConnection}>
               <div className={styles.connLine}><div className={styles.connParticle} /></div>
               <span className={styles.connLabel}>Creates Departments</span>
            </div>

            <div className={styles.graphNode} data-role="hod">
              <div className={styles.nodeIcon}><Building2 size={20} /></div>
              <div className={styles.nodeText}>
                <h4>HOD</h4>
                <span>Academic Planning</span>
              </div>
            </div>
          </div>

          {/* Middle Layer: Departments, Courses, Faculty */}
          <div className={styles.graphVerticalConnectors}>
             <div className={styles.vertLine}><div className={styles.connParticleVert} /></div>
             <div className={styles.vertLine}><div className={styles.connParticleVert} /></div>
          </div>

          <div className={styles.graphRow}>
            <div className={styles.graphNode} data-role="course">
              <div className={styles.nodeIcon}><BookOpen size={20} /></div>
              <div className={styles.nodeText}>
                <h4>Courses & Exams</h4>
                <span>Curriculum Setup</span>
              </div>
            </div>

            <div className={styles.graphConnection}>
               <div className={styles.connLine}><div className={styles.connParticleReverse} /></div>
               <span className={styles.connLabel}>Assigns</span>
            </div>

            <div className={styles.graphNode} data-role="faculty">
              <div className={styles.nodeIcon}><GraduationCap size={20} /></div>
              <div className={styles.nodeText}>
                <h4>Faculty</h4>
                <span>Subject Experts</span>
              </div>
            </div>
          </div>

          {/* Core layer: Students -> AI -> Results */}
          <div className={styles.graphVerticalConnectorsCentered}>
             <div className={styles.vertLine}><div className={styles.connParticleVert} /></div>
          </div>

          <div className={styles.graphRowCentered}>
            <div className={styles.graphNode} data-role="student">
              <div className={styles.nodeIcon}><Users size={20} /></div>
              <div className={styles.nodeText}>
                <h4>Student</h4>
                <span>Uploads Script</span>
              </div>
            </div>

            <div className={styles.graphConnectionPulse}>
               <div className={styles.connLine}><div className={styles.connParticle} style={{animationDuration: '1s'}} /></div>
            </div>

            <div className={styles.graphNodeLarge} data-role="ai">
              <div className={styles.corePulseNode} />
              <div className={styles.nodeIcon}><Cpu size={28} /></div>
              <div className={styles.nodeText}>
                <h4>AES Intelligence</h4>
                <span>Semantic Evaluation</span>
              </div>
            </div>

            <div className={styles.graphConnectionPulse}>
               <div className={styles.connLine}><div className={styles.connParticle} style={{animationDuration: '1s'}} /></div>
            </div>

            <div className={styles.graphNode} data-role="result">
              <div className={styles.nodeIcon}><Award size={20} /></div>
              <div className={styles.nodeText}>
                <h4>Results</h4>
                <span>Analytics & Feedback</span>
              </div>
            </div>
          </div>
          
          <svg className={styles.graphBackgroundSvg}>
             <path d="M 800, 300 Q 500, 450 200, 300" fill="none" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="2" strokeDasharray="5,5" />
          </svg>
        </div>
      </section>

      {/* ════ AI EVALUATION SHOWCASE ════ */}
      <section className={styles.aiEvalSection} id="ai-eval">
        <FadeUp>
          <div className={styles.sectionTag}>
            <Zap size={14} />
            AI Processing Loop
          </div>
          <h2 className={styles.sectionTitle}>Automated AI Assessment Engine</h2>
          <p className={styles.sectionSub}>
            Witness the multi-step evaluation sequence running behind the scenes.
          </p>
        </FadeUp>

        <div className={styles.aiEvalContainer}>
          <div className={styles.aiEvalSteps}>
            <button className={`${styles.aiStepBtn} ${evalPhase === 0 ? styles.active : ''}`} onClick={() => setEvalPhase(0)}>
              <span>01</span> Answer Script Upload
            </button>
            <button className={`${styles.aiStepBtn} ${evalPhase === 1 ? styles.active : ''}`} onClick={() => setEvalPhase(1)}>
              <span>02</span> Optical Layout & Parsing
            </button>
            <button className={`${styles.aiStepBtn} ${evalPhase === 2 ? styles.active : ''}`} onClick={() => setEvalPhase(2)}>
              <span>03</span> Semantic Matching & Score
            </button>
            <button className={`${styles.aiStepBtn} ${evalPhase === 3 ? styles.active : ''}`} onClick={() => setEvalPhase(3)}>
              <span>04</span> Auditing & Overrides
            </button>
          </div>

          <div className={styles.aiEvalVisualizer}>
            {evalPhase === 0 && (
              <div className={styles.aiPanelContent}>
                <h4>Phase 1: Secure Answer Script Upload</h4>
                <p>Students authenticate via OTP and upload their script sheets inside their 15-minute window. Scripts are bound to specific `AnswerSchema` HTML tables.</p>
                <div className={styles.visualBarBox}>
                  <div className={styles.uploadFileCard}>
                    <FileText size={24} className={styles.iconFile} />
                    <div>
                      <strong>PHYS101_Roll_45.pdf</strong><br/>
                      <span>Size: 4.8MB ➔ Uploading...</span>
                    </div>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: '80%' }} />
                  </div>
                </div>
              </div>
            )}

            {evalPhase === 1 && (
              <div className={styles.aiPanelContent}>
                <h4>Phase 2: Optical Layout & Parsing</h4>
                <p>The AI model processes the script, parsing text blocks, formulas, and structural layouts. Handwriting is processed into clean contextual text.</p>
                <div className={styles.aiTerminal}>
                  <div>[AISS-AI] Initializing Optical Layout Parser...</div>
                  <div>[AISS-AI] Segmenting Question Blocks (Detected: 5 Questions)</div>
                  <div className={styles.terminalPulse}>[AISS-AI] Parsing Question 1 Handwriting... [OK]</div>
                </div>
              </div>
            )}

            {evalPhase === 2 && (
              <div className={styles.aiPanelContent}>
                <h4>Phase 3: Semantic Matching & Score</h4>
                <p>The parsed answers are evaluated against the reference key. The model grades context, semantic structure, and keyword density, generating a score breakdown.</p>
                <div className={styles.semanticMatchCard}>
                  <div className={styles.semanticMetric}>
                    <span>Keyword Match</span>
                    <strong>94%</strong>
                  </div>
                  <div className={styles.semanticMetric}>
                    <span>Computed Grade</span>
                    <strong className={styles.gradeHighlight}>8 / 10</strong>
                  </div>
                </div>
              </div>
            )}

            {evalPhase === 3 && (
              <div className={styles.aiPanelContent}>
                <h4>Phase 4: Auditing & Overrides</h4>
                <p>Evaluators retain absolute control. Teachers review the AI feedback, inspect parsed sheets, and can override any question score before publishing results.</p>
                <div className={styles.mockOverrideForm}>
                  <div>
                    <span>AI Score: <strong>8 / 10</strong></span>
                    <span className={styles.dividerSlash}>➔</span>
                    <label>Manual Score: </label>
                    <input type="number" readOnly value={9} className={styles.scoreOverrideInput} />
                  </div>
                  <div className={styles.overrideFeedback}>
                    <em>"Student explained kinetic formulas creatively. Adjusted +1."</em>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ════ DASHBOARD PREVIEW CAROUSEL ════ */}
      <section className={styles.carouselSection}>
        <FadeUp>
          <div className={styles.sectionTag}>
            <Calendar size={14} />
            Interface Previews
          </div>
          <h2 className={styles.sectionTitle} style={{ textAlign: 'center' }}>Experience AISS Dashboard Workflows</h2>
          <p className={styles.sectionSub} style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 40px' }}>
            Browse actual layout frames of the platform, built strictly for scale and speed.
          </p>
        </FadeUp>

        <div className={styles.carouselContainer}>
          <div className={styles.carouselActiveSlide} onMouseMove={handleSpotlightMouseMove}>
            <div className={styles.carouselSlideDetails}>
              <span className={styles.slideSubtitle}>{CAROUSEL_MOCKUPS[carouselIndex].subtitle}</span>
              <h3>{CAROUSEL_MOCKUPS[carouselIndex].title}</h3>
              <p>{CAROUSEL_MOCKUPS[carouselIndex].desc}</p>
              
              <div className={styles.carouselControls}>
                <div className={styles.carouselArrowsBox}>
                  <button className={styles.carouselArrowBtn} onClick={() => setCarouselIndex(p => (p - 1 + CAROUSEL_MOCKUPS.length) % CAROUSEL_MOCKUPS.length)}>
                    <ChevronLeft size={20} />
                  </button>
                  <button className={styles.carouselArrowBtn} onClick={() => setCarouselIndex(p => (p + 1) % CAROUSEL_MOCKUPS.length)}>
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div className={styles.carouselDots}>
                  {CAROUSEL_MOCKUPS.map((_, idx) => (
                    <button
                      key={idx}
                      className={`${styles.carouselDot} ${idx === carouselIndex ? styles.carouselDotActive : ''}`}
                      onClick={() => setCarouselIndex(idx)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.carouselSlideVisual}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={carouselIndex}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={styles.slideMockFrame}
                >
                {CAROUSEL_MOCKUPS[carouselIndex].ui === 'hod-semester' && (
                  <div className={styles.frameContent}>
                    <div className={styles.frameTopbar}>Semester Configuration Wizard</div>
                    <div className={styles.frameBody}>
                      <div className={styles.wizardHeader}>
                        <span>Step 1: Setup Details</span> ➔ <strong style={{ color: 'var(--accent)' }}>Step 2: Assign Course</strong>
                      </div>
                      <div className={styles.mockInputGroup}>
                        <label>Semester Number</label>
                        <input type="text" readOnly value="Semester 4" />
                      </div>
                      <div className={styles.mockInputGroup}>
                        <label>Academic Year</label>
                        <input type="text" readOnly value="2026-2027" />
                      </div>
                    </div>
                  </div>
                )}

                {CAROUSEL_MOCKUPS[carouselIndex].ui === 'admin-upload' && (
                  <div className={styles.frameContent}>
                    <div className={styles.frameTopbar}>CSV Student Registry Import</div>
                    <div className={styles.frameBody}>
                      <div className={styles.mockUploadArea}>
                        <FileText size={20} className={styles.iconFile} />
                        <span>cs_students_roster_2026.csv</span>
                      </div>
                      <div className={styles.parsedTableMock}>
                        <div className={styles.tableRowHeader}>
                          <span>Roll Number</span><span>Name</span><span>Status</span>
                        </div>
                        <div className={styles.tableRowMock}>
                          <span>CS-2026-01</span><span>Sarah Connor</span><span className={styles.badgeSuccess}><span className={styles.pulseDotLight} /> Validated</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {CAROUSEL_MOCKUPS[carouselIndex].ui === 'faculty-eval' && (
                  <div className={styles.frameContent}>
                    <div className={styles.frameTopbar}>AI Script Override Panel</div>
                    <div className={styles.frameBody}>
                      <div className={styles.mockQuestionRow}>
                        <div><strong>Q1: Outline thermodynamics laws.</strong></div>
                        <div className={styles.scoreRow}>
                          <span>AI Score: <strong>7/10</strong></span>
                          <span>Override: <strong>8/10</strong></span>
                        </div>
                      </div>
                      <div className={styles.commentRow}>
                        <span>AI Feedback: "Correct laws stated. Mathematical derivation missed details."</span>
                      </div>
                    </div>
                  </div>
                )}

                {CAROUSEL_MOCKUPS[carouselIndex].ui === 'student-portal' && (
                  <div className={styles.frameContent}>
                    <div className={styles.frameTopbar}>Student Active Examinations</div>
                    <div className={styles.frameBody}>
                      <div className={styles.timetableMockRow}>
                        <div><strong>PHYS-101: Physics-I Exam</strong><br/><span>June 15, 2026 - 10:00 AM</span></div>
                        <button className={styles.btnActionMock}>Start Window</button>
                      </div>
                      <div className={styles.timetableMockRow}>
                        <div><strong>CS-102: Object Oriented Prog</strong><br/><span>June 18, 2026 - 10:00 AM</span></div>
                        <span className={styles.badgeLocked}>Locked</span>
                      </div>
                    </div>
                  </div>
                )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ════ ACADEMIC LIFECYCLE SECTION ════ */}
      <section className={styles.lifecycleSection} id="academic-lifecycle">
        <FadeUp>
          <div className={styles.sectionTag}>
            <GraduationCap size={14} />
            Academic Journey
          </div>
          <h2 className={styles.sectionTitle}>The Full Academic Lifecycle</h2>
          <p className={styles.sectionSub}>
            Follow the automated lifecycle checkpoints managed by AISS AES.
          </p>
        </FadeUp>

        <div className={styles.stepsList}>
          <FadeUp>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>College Admission & Creation</h3>
                <p className={styles.stepDesc}>Admins bulk-upload records, creating secure learner profiles connected to specific departments.</p>
              </div>
            </div>
          </FadeUp>

          <FadeUp>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Course Enrollment</h3>
                <p className={styles.stepDesc}>HODs register student cohorts into Core and Elective modules, immediately populating semester credit boards.</p>
              </div>
            </div>
          </FadeUp>

          <FadeUp>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Scheduling & Learning</h3>
                <p className={styles.stepDesc}>Active timetables map exam dates and assigned proctoring/evaluating faculty members across departments.</p>
              </div>
            </div>
          </FadeUp>

          <FadeUp>
            <div className={styles.step}>
              <div className={styles.stepNum}>4</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Secure Assessment Submission</h3>
                <p className={styles.stepDesc}>During the exam, students authenticate and securely upload script sheets within their active 15-minute session.</p>
              </div>
            </div>
          </FadeUp>

          <FadeUp>
            <div className={styles.step}>
              <div className={styles.stepNum}>5</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>AI Grading & Auditing</h3>
                <p className={styles.stepDesc}>The AI parser segments answer pages, scores answers against keys, and presents evaluations to faculty for override audits.</p>
              </div>
            </div>
          </FadeUp>

          <FadeUp>
            <div className={styles.step}>
              <div className={styles.stepNum}>6</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Results & Graduation Metrics</h3>
                <p className={styles.stepDesc}>Results publish, updating student profiles, generating cumulative CGPA calculations, and outputting college-wide stats.</p>
              </div>
            </div>
          </FadeUp>
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
          <a href="#workflows">Workflows</a>
          <a href="#roles">Roles</a>
          <a href="#ai-eval">AI Evaluation</a>
          <a href="#academic-lifecycle">Lifecycle</a>
        </div>
      </footer>

      <Modal
        isOpen={collegeModalOpen}
        onClose={() => !registering && setCollegeModalOpen(false)}
        title="Register Your Institution"
        size="lg"
      >
        <form onSubmit={handleRegisterCollege} className={styles.registerForm}>
           <p className={styles.registerFormDesc}>
             Register your college to get access to the platform. Only the requesting person will get the College Admin account initially.
           </p>
           <div className={styles.formGrid}>
             <div className={styles.formField}>
               <label>College Name *</label>
               <input className={styles.modalInput} required value={collegeForm.collegeName} onChange={e => setCollegeForm({...collegeForm, collegeName: e.target.value})} placeholder="e.g. AISS Institute" />
             </div>
             <div className={styles.formField}>
               <label>Location / City</label>
               <input className={styles.modalInput} value={collegeForm.location} onChange={e => setCollegeForm({...collegeForm, location: e.target.value})} placeholder="e.g. Bangalore" />
             </div>
           </div>

           <h4 className={styles.formSectionTitle}>College Admin Details</h4>
           <div className={styles.registerForm}>
             <div className={styles.formField}>
               <label>Admin Name *</label>
               <input className={styles.modalInput} required value={collegeForm.adminName} onChange={e => setCollegeForm({...collegeForm, adminName: e.target.value})} placeholder="e.g. Dr. John Doe" />
             </div>
             <div className={styles.formGrid}>
               <div className={styles.formField}>
                 <label>Admin Email *</label>
                 <input className={styles.modalInput} type="email" required value={collegeForm.adminEmail} onChange={e => setCollegeForm({...collegeForm, adminEmail: e.target.value})} placeholder="admin@institute.edu" />
               </div>
               <div className={styles.formField}>
                 <label>Admin Phone Number</label>
                 <input className={styles.modalInput} type="tel" value={collegeForm.adminPhone} onChange={e => setCollegeForm({...collegeForm, adminPhone: e.target.value})} placeholder="+91 9876543210" />
               </div>
             </div>
           </div>
           
           <div className={styles.formActions}>
             <button type="button" onClick={() => setCollegeModalOpen(false)} className={styles.btnCancel} disabled={registering}>
               Cancel
             </button>
             <button type="submit" className={styles.btnSubmit} disabled={registering}>
               {registering ? 'Submitting...' : <><CheckCircle2 size={16} /> Submit Registration</>}
             </button>
           </div>
        </form>
      </Modal>
    </div>
  );
};

export default Landing;
