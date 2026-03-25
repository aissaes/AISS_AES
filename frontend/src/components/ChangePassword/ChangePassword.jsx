import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import Modal from '../Modal/Modal';
import styles from './ChangePassword.module.css';

const ChangePasswordModal = ({ isOpen, onClose, onSubmit }) => {
  const [step, setStep] = useState('form'); // 'form' | 'confirm'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setStep('form');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError('');
    setSubmitting(false);
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  // Password strength checker
  const getStrength = (pw) => {
    if (!pw) return { score: 0, label: '', cls: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length >= 12) score++;

    if (score <= 1) return { score: 1, label: 'Weak', cls: 'weak' };
    if (score <= 2) return { score: 2, label: 'Fair', cls: 'fair' };
    if (score <= 3) return { score: 3, label: 'Good', cls: 'good' };
    return { score: 4, label: 'Strong', cls: 'strong' };
  };

  const strength = getStrength(newPassword);

  const handleProceedToConfirm = () => {
    setError('');

    if (!currentPassword.trim()) {
      setError('Current password is required.');
      return;
    }
    if (!newPassword.trim()) {
      setError('New password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setStep('confirm');
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ currentPassword, newPassword });
      resetForm();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Password change failed.');
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'confirm' ? 'Confirm Password Change' : 'Change Password'}
    >
      {step === 'form' ? (
        <div className={styles.formContainer}>
          <div className={styles.iconHeader}>
            <div className={styles.iconCircle}>
              <KeyRound size={24} />
            </div>
            <p className={styles.headerText}>
              Enter your current password and choose a new one.
            </p>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Current Password</label>
            <div className={styles.inputWrapper}>
              <input
                type={showCurrent ? 'text' : 'password'}
                className={styles.input}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <button 
                type="button" 
                className={styles.eyeBtn} 
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>New Password</label>
            <div className={styles.inputWrapper}>
              <input
                type={showNew ? 'text' : 'password'}
                className={styles.input}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <button 
                type="button" 
                className={styles.eyeBtn} 
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword && (
              <div className={styles.strengthBar}>
                <div className={styles.strengthTrack}>
                  <div className={`${styles.strengthFill} ${styles[strength.cls]}`} style={{ width: `${strength.score * 25}%` }} />
                </div>
                <span className={`${styles.strengthLabel} ${styles[strength.cls]}`}>{strength.label}</span>
              </div>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Confirm New Password</label>
            <div className={styles.inputWrapper}>
              <input
                type={showConfirm ? 'text' : 'password'}
                className={styles.input}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
              <button 
                type="button" 
                className={styles.eyeBtn} 
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && newPassword && (
              <span className={confirmPassword === newPassword ? styles.matchGood : styles.matchBad}>
                {confirmPassword === newPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </span>
            )}
          </div>

          <div className={styles.footerBtns}>
            <button className={styles.cancelBtn} onClick={handleClose} disabled={submitting}>Cancel</button>
            <button className={styles.nextBtn} onClick={handleProceedToConfirm}>
              Continue →
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.confirmContainer}>
          <div className={styles.confirmIconCircle}>
            <ShieldCheck size={32} />
          </div>

          <h3 className={styles.confirmTitle}>Are you sure?</h3>
          <p className={styles.confirmText}>
            You're about to change your password. You'll need to use your new password on your next sign-in.
          </p>

          <div className={styles.confirmWarningBox}>
            <AlertTriangle size={16} />
            <span>This action cannot be undone. Make sure you remember your new password.</span>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.footerBtns}>
            <button className={styles.cancelBtn} onClick={() => setStep('form')} disabled={submitting}>
              ← Go Back
            </button>
            <button className={styles.confirmBtn} onClick={handleFinalSubmit} disabled={submitting}>
              {submitting ? 'Changing…' : 'Confirm Change'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ChangePasswordModal;
