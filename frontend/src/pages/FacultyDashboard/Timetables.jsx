import React, { useEffect, useState } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import { timetableAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import TimetableDisplay from '../../components/TimetableDisplay/TimetableDisplay';
import styles from './FacultyDashboard.module.css';

const FacultyTimetables = () => {
  const { toast } = useToast();
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTimetables = async () => {
    setLoading(true);
    try {
      const res = await timetableAPI.getAll();
      setTimetables(res.data.timetables || []);
    } catch {
      toast('Failed to load timetables.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTimetables(); }, []);

  return (
    <div className={styles.pageWrap}>
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <div>
            <h2 className={styles.bannerTitle}>Examination Timetables</h2>
            <p className={styles.bannerRole}>View your department's exam schedules and assigned faculty</p>
          </div>
        </div>
        <button className={styles.ghostBtn} onClick={fetchTimetables} disabled={loading}>
          <RefreshCw size={14} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft || ''}>
            <Calendar size={18} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Department Schedules</h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                {timetables.length} timetable{timetables.length !== 1 ? 's' : ''} published
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div className={styles.emptyCenter}><div className={styles.spinner} /></div>
          ) : (
            <TimetableDisplay timetables={timetables} role="Faculty" />
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyTimetables;
