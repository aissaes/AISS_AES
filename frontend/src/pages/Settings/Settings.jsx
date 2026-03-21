import React, { useEffect, useState } from 'react';
import { Save, User, Phone, Building2, BookOpen, Lock, CheckCircle2 } from 'lucide-react';
import { facultyAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import styles from './Settings.module.css';

const Settings = () => {
  const { toast } = useToast();

  const [form, setForm]     = useState({ name: '', phone: '', department: '', college: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    facultyAPI.getMe()
      .then(r => {
        const u = r.data.profile;
        setForm({ name: u.name || '', phone: u.phone || '', department: u.department || '', college: u.college || '', password: '' });
      })
      .catch(() => setError('Failed to load profile data.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.password) { setError('Current password is required to save changes.'); return; }
    setError('');
    setSaving(true);
    try {
      await facultyAPI.updateProfile(form);
      toast('Profile updated successfully!', 'success');
      setForm(p => ({ ...p, password: '' }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Update failed.';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <User size={20} />
        </div>
        <div>
          <h2 className={styles.headerTitle}>Account Settings</h2>
          <p className={styles.headerSub}>Update your personal profile. Requires current password to save.</p>
        </div>
      </div>

      {error && (
        <div className={styles.alertError} role="alert">{error}</div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="s-name">Full Name</label>
            <div className={styles.inputWrap}>
              <User size={15} className={styles.inputIcon} />
              <input id="s-name" name="name" type="text" className={styles.input}
                value={form.name} onChange={handleChange} required placeholder="Dr. Jane Doe" />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="s-phone">Phone</label>
            <div className={styles.inputWrap}>
              <Phone size={15} className={styles.inputIcon} />
              <input id="s-phone" name="phone" type="tel" className={styles.input}
                value={form.phone} onChange={handleChange} required placeholder="9876543210" />
            </div>
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Department <span className={styles.readOnly}>(read-only)</span></label>
            <div className={styles.inputWrap}>
              <BookOpen size={15} className={styles.inputIcon} />
              <input type="text" className={`${styles.input} ${styles.disabled}`}
                value={form.department} disabled />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>College <span className={styles.readOnly}>(read-only)</span></label>
            <div className={styles.inputWrap}>
              <Building2 size={15} className={styles.inputIcon} />
              <input type="text" className={`${styles.input} ${styles.disabled}`}
                value={form.college} disabled />
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="s-pass">
            Current Password <span className={styles.required}>*required</span>
          </label>
          <div className={styles.inputWrap}>
            <Lock size={15} className={styles.inputIcon} />
            <input id="s-pass" name="password" type="password" className={styles.input}
              value={form.password} onChange={handleChange} placeholder="Enter your password to confirm changes" />
          </div>
          <p className={styles.hint}>For security, every profile update requires your current password.</p>
        </div>

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={saving || !form.password}
          >
            {saving
              ? <><span className={styles.btnSpinner} />Saving…</>
              : <><Save size={16} />Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
