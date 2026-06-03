import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, Download, ShieldCheck, Cpu, Zap, 
  ArrowLeft, Info, HelpCircle, AlertTriangle,
  Signal, Wifi, Battery, Bell, Camera, Sparkles, History
} from 'lucide-react';
import { useToast } from '../../components/Toast/Toast';
import styles from './DownloadApp.module.css';

const DownloadApp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const apkUrl = `${backendUrl}/downloads/AISS_AES_v1.0.0.apk`;

  const handleDownload = () => {
    setDownloading(true);
    toast('Starting download of AISS Student Portal APK...', 'success');
    
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = apkUrl; 
      link.download = 'AISS_AES_v1.0.0.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(false);
      toast('Download initiated! Check your downloads folder.', 'success', 5000);
    }, 1500);
  };

  return (
    <div className={styles.page}>
      {/* Background ambient orbs */}
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={styles.grid} aria-hidden />

      {/* Navigation Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
        <span className={styles.brand}>AISS_AES</span>
      </header>

      <main className={styles.container}>
        <div className={styles.contentWrap}>
          {/* Left Column: Premium App Visual & Details */}
          <section className={styles.heroSection}>
            <div className={styles.badgeContainer}>
              <div className={styles.badge}>
                <span className={styles.badgeDot} />
                Android Mobile Client
              </div>
              <div className={`${styles.badge} ${styles.badgeStable}`}>
                <span className={styles.badgeDotGreen} />
                v1.0.0 Stable
              </div>
            </div>
            <h1 className={styles.title}>
              AISS Student <br />
              <span className={styles.titleGrad}>Portal App</span>
            </h1>
            <p className={styles.subtitle}>
              Take examinations, scan and upload answer scripts securely, and view granular AI grading reports directly on your mobile device.
            </p>

            {/* Feature bullets */}
            <div className={styles.features}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><Cpu size={18} /></div>
                <div>
                  <h3>Direct AI Evaluator</h3>
                  <p>Check question-by-question feedback and marks breakdown instantly.</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><ShieldCheck size={18} /></div>
                <div>
                  <h3>Secure Cam-Scanner</h3>
                  <p>Built-in high fidelity image edge detection for script pages.</p>
                </div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}><Zap size={18} /></div>
                <div>
                  <h3>Real-time Syncing</h3>
                  <p>Automatically syncs with your college department timetables.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Center Column: Phone Mockup */}
          <section className={styles.phoneMockupContainer}>
            <div className={styles.phoneDevice}>
              <div className={styles.phoneSpeaker} />
              <div className={styles.phoneScreen}>
                {/* Status Bar */}
                <div className={styles.statusBar}>
                  <span className={styles.statusTime}>09:41</span>
                  <div className={styles.statusIcons}>
                    <Signal size={10} strokeWidth={2.5} />
                    <Wifi size={10} strokeWidth={2.5} />
                    <Battery size={12} strokeWidth={2} style={{ transform: 'rotate(90deg)', margin: '0 -2px' }} />
                  </div>
                </div>

                {/* App Main Area */}
                <div className={styles.appArea}>
                  {/* App Header */}
                  <div className={styles.appHeader}>
                    <div className={styles.appUser}>
                      <div className={styles.appAvatar}>JD</div>
                      <div>
                        <h4>John Doe</h4>
                        <span>CSE · Semester 4</span>
                      </div>
                    </div>
                    <div className={styles.appBell}><Bell size={13} /></div>
                  </div>

                  {/* App Stats */}
                  <div className={styles.appStats}>
                    <div className={styles.appStatItem}>
                      <span className={styles.statVal}>8.9</span>
                      <span className={styles.statLbl}>CGPA</span>
                    </div>
                    <div className={styles.appStatItem}>
                      <span className={styles.statVal}>94%</span>
                      <span className={styles.statLbl}>Attend</span>
                    </div>
                    <div className={styles.appStatItem}>
                      <span className={styles.statVal}>12</span>
                      <span className={styles.statLbl}>Exams</span>
                    </div>
                  </div>

                  {/* Active Upload Window Card */}
                  <div className={styles.activeExamCard}>
                    <div className={styles.activeExamHeader}>
                      <span className={styles.activeDot} />
                      <strong>ACTIVE UPLOAD WINDOW</strong>
                    </div>
                    <div className={styles.activeExamBody}>
                      <h5>PHYS-101: Physics-I</h5>
                      <div className={styles.timerRow}>
                        <span>Window closing in:</span>
                        <strong className={styles.timerText}>14m 32s</strong>
                      </div>
                      <button type="button" className={styles.appCameraBtn}>
                        <Camera size={12} /> Scan Answer Script
                      </button>
                    </div>
                  </div>

                  {/* Recent Graded Exam */}
                  <div className={styles.recentExamCard}>
                    <div className={styles.recentExamHeader}>
                      <strong>RECENT EVALUATION</strong>
                      <span className={styles.marksBadge}>27/30</span>
                    </div>
                    <div className={styles.recentExamBody}>
                      <h5>CS-102: Object Oriented Prog</h5>
                      <p className={styles.feedbackText}>
                        "Excellent code syntax and diagrams. Deducted 3 marks for incorrect time complexity bound on Question 3b."
                      </p>
                      <div className={styles.aiTag}>
                        <Sparkles size={9} />
                        <span>AI Evaluated</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className={styles.homeIndicator} />
              </div>
            </div>
          </section>

          {/* Right Column: Download Card & Quick Install Guide */}
          <section className={styles.actionSection}>
            <div className={styles.downloadCard}>
              <div className={styles.apkMeta}>
                <div className={styles.androidLogo}>
                  <Smartphone size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className={styles.cardTitle}>Android APK Package</h2>
                  <span className={styles.versionTag}>v1.0.0 (Release)</span>
                </div>
              </div>

              <div className={styles.fileDetails}>
                <div className={styles.detailRow}>
                  <span>App Name:</span>
                  <strong>AISS Student Portal</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Version:</span>
                  <strong>1.0.0</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Release Status:</span>
                  <strong>Stable</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Architecture:</span>
                  <strong>ARM64-v8a (Recommended)</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Filename:</span>
                  <strong>AISS_AES_v1.0.0.apk</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>File Size:</span>
                  <strong>~26.5 MB</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Release Date:</span>
                  <strong>June 3, 2026</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Requirements:</span>
                  <strong>Android 8.0+ (Oreo or later)</strong>
                </div>
              </div>

              <button 
                className={styles.downloadBtn} 
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <div className={styles.spinner} />
                    <span>Preparing APK...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Download Installer APK</span>
                  </>
                )}
              </button>

              <div className={styles.checksumBox}>
                <Info size={12} style={{ flexShrink: 0 }} />
                <span>SHA-256 Checksum verified. Built with Flutter.</span>
              </div>
            </div>

            {/* Quick Install Guide Card */}
            <div className={styles.guideCard}>
              <h3 className={styles.guideTitle}>
                <HelpCircle size={16} /> How to Install on Android
              </h3>
              
              <div className={styles.steps}>
                <div className={styles.step}>
                  <div className={styles.stepNum}>1</div>
                  <div className={styles.stepText}>
                    <strong>Download the APK</strong>
                    <p>Click the download button above to get the APK file on your device.</p>
                  </div>
                </div>

                <div className={styles.step}>
                  <div className={styles.stepNum}>2</div>
                  <div className={styles.stepText}>
                    <strong>Enable Unknown Sources</strong>
                    <p>If prompted, go to your settings and allow installs from Unknown Sources or Chrome.</p>
                  </div>
                </div>

                <div className={styles.step}>
                  <div className={styles.stepNum}>3</div>
                  <div className={styles.stepText}>
                    <strong>Install and Log In</strong>
                    <p>Open the downloaded file and install it. Log in with the student credentials from college admin.</p>
                  </div>
                </div>
              </div>

              <div className={styles.warningBox}>
                <AlertTriangle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <span>Make sure you download the app only from this official portal.</span>
              </div>
            </div>

            {/* Fallback Support Card */}
            <div className={styles.fallbackCard}>
              <Info size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4>Having installation issues?</h4>
                <p>Please contact your department admin or college support for legacy (32-bit/ARMv7) or emulator-compatible builds.</p>
              </div>
            </div>
          </section>

          {/* Bottom Section: Release Notes & Version History */}
          <div className={styles.bottomSection}>
            <div className={styles.releaseNotesCard}>
              <h3 className={styles.sectionTitle}>
                <Sparkles size={18} className={styles.titleIcon} />
                Release Notes
              </h3>
              <div className={styles.releaseVersionHeader}>
                <h4>Version 1.0.0</h4>
                <span className={styles.releaseDateBadge}>June 3, 2026</span>
              </div>
              <ul className={styles.releaseNotesList}>
                <li>
                  <strong>Student Mobile Experience</strong>
                  <p>Complete student-centric exam portal optimized for android tablets and phones.</p>
                </li>
                <li>
                  <strong>Timetable Access</strong>
                  <p>Real-time department timetable syncing directly to your device calendar.</p>
                </li>
                <li>
                  <strong>Results Tracking</strong>
                  <p>Intuitive performance graphs, exam scorecards, and semester CGPA calculator.</p>
                </li>
                <li>
                  <strong>AI Evaluation Feedback</strong>
                  <p>Detailed query-by-query breakdown and visual AI assistant evaluation reports.</p>
                </li>
                <li>
                  <strong>Course Management Support</strong>
                  <p>View archives, current courses, and department notices on the go.</p>
                </li>
                <li>
                  <strong>Improved Performance</strong>
                  <p>Low latency scanning, offline cached student profiles, and secure token authentication.</p>
                </li>
              </ul>
            </div>

            <div className={styles.historyCard}>
              <h3 className={styles.sectionTitle}>
                <History size={18} className={styles.titleIcon} />
                Version History
              </h3>
              <div className={styles.historyList}>
                <div className={`${styles.historyItem} ${styles.historyActive}`}>
                  <div className={styles.historyMeta}>
                    <strong>v1.0.0</strong>
                    <span className={styles.activeLabel}>Active</span>
                  </div>
                  <span className={styles.historyDate}>June 3, 2026</span>
                  <p className={styles.historySummary}>Initial stable launch. Custom camera integration, AI grader client, and secure exams flow.</p>
                </div>
                <div className={styles.historyItem}>
                  <div className={styles.historyMeta}>
                    <strong>v1.1.0 (Upcoming)</strong>
                    <span className={styles.plannedLabel}>Planned</span>
                  </div>
                  <span className={styles.historyDate}>Q3 2026</span>
                  <p className={styles.historySummary}>Push notifications for exam schedules, offline scan queueing, and biometrics lock.</p>
                </div>
                <div className={styles.historyItem}>
                  <div className={styles.historyMeta}>
                    <strong>v2.0.0 (Future)</strong>
                    <span className={styles.plannedLabel}>Future</span>
                  </div>
                  <span className={styles.historyDate}>2027</span>
                  <p className={styles.historySummary}>Multi-department support, proctoring AI suite integration, and voice feedback.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DownloadApp;
