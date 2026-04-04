import React, { useState } from 'react';
import { Calendar, Users, Eye, Plus, ChevronDown, ChevronUp, Trash2, Key } from 'lucide-react';
import styles from './TimetableDisplay.module.css';

const TimetableDisplay = ({ timetables, role, onAddExam, onDeleteExam, onManageAccess }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!timetables || timetables.length === 0) {
    return (
      <div className={styles.emptyCenter}>
        <span className={styles.emptyIcon}>📅</span>
        <p className={styles.emptyText}>No timetables available yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.ttList}>
      {timetables.map(t => {
        const isExpanded = expandedId === t._id;
        return (
          <div key={t._id} className={styles.ttCard}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : t._id)}
              className={styles.ttHeader}
            >
              <div className={styles.ttHeaderLeft}>
                <div className={styles.ttIconWrap}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h4 className={styles.ttTitle}>
                    {t.examType}
                    <span className={styles.ttBadge}>{t.exams?.length || 0} Exams</span>
                  </h4>
                  <p className={styles.ttSub}>
                    {t.course} — Semester {t.semester}
                  </p>
                </div>
              </div>

              <div className={styles.ttHeaderRight}>
                {role === 'HOD' && onAddExam && (
                  <button
                    className={styles.addBtn}
                    onClick={e => {
                      e.stopPropagation();
                      onAddExam(t);
                    }}
                  >
                    <Plus size={14} /> Add Exam
                  </button>
                )}
                <div className={styles.expandIcon}>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className={styles.ttBody}>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Subject</th>
                        <th>Code</th>
                        <th>Max Marks</th>
                        <th>Assigned Faculty</th>
                        {role === 'HOD' && (
                          <>
                            <th>Paper Status</th>
                            <th>Actions</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {t.exams?.map(e => (
                        <tr key={e._id}>
                          <td>
                            <div className={styles.dateCell}>
                              <span className={styles.dateText}>{new Date(e.date).toLocaleDateString()}</span>
                              <span className={styles.timeText}>
                                {new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(e.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className={styles.subjectText}>{e.subjectName}</td>
                          <td><span className={styles.codeBadge}>{e.subjectCode}</span></td>
                          <td className={styles.mutedText}>{e.maxMarks}</td>
                          <td>
                            <div className={styles.facultyCell}>
                              <Users size={14} className={styles.facultyIcon} />
                              <span>{e.assignedFaculty?.name || 'Not Assigned'}</span>
                            </div>
                          </td>
                          {role === 'HOD' && (
                            <>
                              <td>
                                <span className={`${styles.statusBadge} ${e.isPaperQuestionUploaded ? styles.successBadge : styles.pendingBadge}`}>
                                  {e.isPaperQuestionUploaded ? 'Uploaded' : 'Awaiting'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {onManageAccess && (
                                    <button onClick={() => onManageAccess(e)} className={styles.manageAccessBtn} title="Manage Exam Access">
                                      <Key size={16} />
                                    </button>
                                  )}
                                  {onDeleteExam && (
                                    <button onClick={() => onDeleteExam(e._id, e.subjectName)} className={styles.deleteBtn} title="Delete Course Exam">
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TimetableDisplay;
