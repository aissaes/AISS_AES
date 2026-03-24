import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Users, RefreshCw } from 'lucide-react';
import { timetableAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import styles from './FacultyDashboard.module.css';

/* ══════════════════════════════════════════════════════
   FACULTY TIMETABLE VIEW
   
   Read-only view of department timetables.
   Backend: GET /faculty/timetable → { timetables: [...] }
   Shows: examType, course, semester, and exam details.
══════════════════════════════════════════════════════ */

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
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Examination Timetables</h2>
          <p className={styles.pageSub}>View your department's exam schedules and assigned faculty</p>
        </div>
        <button onClick={fetchTimetables} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-2)',
          color: 'var(--text-2)', cursor: 'pointer', fontSize: 13
        }}>
          <RefreshCw size={14} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Calendar size={18} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Department Schedules</h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{timetables.length} timetable{timetables.length !== 1 ? 's' : ''} published</p>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div className={styles.emptyCenter}><div className={styles.spinner} /></div>
          ) : timetables.length === 0 ? (
            <div className={styles.emptyCenter}>
              <span className={styles.emptyIcon}>📅</span>
              <p className={styles.emptyText}>No timetables have been published by your HOD yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 20 }}>
              {timetables.map(t => (
                <div key={t._id} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, border: '1px solid var(--border-2)', borderRadius: 12, background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ color: 'var(--text-0)', fontSize: 18, fontWeight: 600 }}>{t.examType}</h4>
                      <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>
                        {t.course} — Semester {t.semester}
                      </p>
                    </div>
                    <span style={{ padding: '4px 12px', background: 'var(--primary-dim, rgba(99,102,241,0.1))', color: 'var(--primary)', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                      {t.exams?.length || 0} Exams
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Subject</th>
                          <th>Code</th>
                          <th>Max Marks</th>
                          <th>Assigned Faculty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.exams?.map(e => (
                          <tr key={e._id}>
                            <td style={{ color: 'var(--text-1)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={13} color="var(--primary)" />
                                {new Date(e.date).toLocaleDateString()}
                              </div>
                            </td>
                            <td style={{ color: 'var(--text-1)', fontWeight: 500 }}>{e.subjectName}</td>
                            <td className={styles.mutedCell}>
                              <span style={{ padding: '2px 8px', background: 'var(--bg-3)', borderRadius: 12, fontSize: 12 }}>{e.subjectCode}</span>
                            </td>
                            <td className={styles.mutedCell}>{e.maxMarks}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Users size={13} color="var(--primary)" />
                                <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{e.assignedFaculty?.name || 'Not Assigned'}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyTimetables;
