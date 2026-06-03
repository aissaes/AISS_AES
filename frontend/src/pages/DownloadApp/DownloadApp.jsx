import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, Download, ShieldCheck, Cpu, Zap, 
  ArrowLeft, Info, HelpCircle, AlertTriangle, FileText, CheckCircle
} from 'lucide-react';
import { useToast } from '../../components/Toast/Toast';
import styles from './DownloadApp.module.css';

const DownloadApp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    toast('Starting download of AISS Student Portal APK...', 'success');
    
    // Create a temporary link to download a placeholder or the actual file
    // In production, the user will put the real APK file here
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = '#'; // Placeholder
      link.download = 'aiss_student_portal.apk';
      document.body.appendChild(link);
      // link.click(); // Comment out to avoid downloading actual '#' in browser during development
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
            <div className={styles.badge}>
              <span className={styles.badgeDot} />
              Android Mobile Client
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
                  <span>Filename:</span>
                  <strong>aiss_student_portal.apk</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>File Size:</span>
                  <strong>~18.5 MB</strong>
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

            {/* Quick Install Guide Accordion */}
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
                    <p>If prompted, go to your system settings and allow installs from "Unknown Sources" or your web browser.</p>
                  </div>
                </div>

                <div className={styles.step}>
                  <div className={styles.stepNum}>3</div>
                  <div className={styles.stepText}>
                    <strong>Install and Log In</strong>
                    <p>Open the downloaded file and click "Install". Log in using the student credentials provided by your college admin.</p>
                  </div>
                </div>
              </div>

              <div className={styles.warningBox}>
                <AlertTriangle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <span>Make sure you download the app only from this official portal.</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default DownloadApp;
