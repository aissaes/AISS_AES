import React from 'react';
import { Plus, Users, Trash2 } from 'lucide-react';
import styles from './TimetableEditor.module.css';

/* ── Single Exam Form (used in both create and add-exam modals) ── */
export const ExamForm = ({ exam, index, onChange, onRemove, canRemove, facultyList }) => (
  <div className={styles.examCard}>
    <div className={styles.examCardHeader}>
      <span className={styles.examIndex}>Subject {index + 1}</span>
      {canRemove && (
        <button onClick={onRemove} className={styles.removeBtn}>
          <Trash2 size={14} /> Remove
        </button>
      )}
    </div>

    <div className={styles.gridTwo}>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Subject Name</label>
        <input
          className={styles.fieldInput}
          placeholder="e.g. Advanced Networks"
          value={exam.subjectName}
          onChange={e => onChange('subjectName', e.target.value)}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Subject Code</label>
        <input
          className={styles.fieldInput}
          placeholder="CS401"
          value={exam.subjectCode}
          onChange={e => onChange('subjectCode', e.target.value)}
        />
      </div>
    </div>

    <div className={styles.gridThree}>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Date</label>
        <input
          type="date"
          className={styles.fieldInput}
          value={exam.date}
          onChange={e => onChange('date', e.target.value)}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Start Time</label>
        <input
          type="time"
          className={styles.fieldInput}
          value={exam.startTime}
          onChange={e => onChange('startTime', e.target.value)}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>End Time</label>
        <input
          type="time"
          className={styles.fieldInput}
          value={exam.endTime}
          onChange={e => onChange('endTime', e.target.value)}
        />
      </div>
    </div>

    <div className={styles.gridMarks}>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Max Marks</label>
        <input
          type="number"
          className={styles.fieldInput}
          value={exam.maxMarks}
          onChange={e => onChange('maxMarks', Number(e.target.value))}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          <Users size={13} /> Assign Faculty (Emailed)
        </label>
        <select
          className={styles.fieldInput}
          value={exam.assignedFaculty}
          onChange={e => onChange('assignedFaculty', e.target.value)}
        >
          <option value="">Select Faculty…</option>
          {facultyList.map(f => (
            <option value={f._id} key={f._id}>{f.name} ({f.email})</option>
          ))}
        </select>
      </div>
    </div>
  </div>
);

/* ── Timetable Meta Form (course, semester, exam type) ── */
export const TimetableMetaForm = ({ formData, onChange }) => (
  <div className={styles.metaSection}>
    <h4 className={styles.metaTitle}>Timetable Details</h4>
    <div className={styles.gridTwo}>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Course</label>
        <input
          className={styles.fieldInput}
          value={formData.course}
          onChange={e => onChange({ ...formData, course: e.target.value })}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Semester</label>
        <input
          type="number"
          min="1"
          max="8"
          className={styles.fieldInput}
          value={formData.semester}
          onChange={e => onChange({ ...formData, semester: Number(e.target.value) })}
        />
      </div>
      <div className={`${styles.fieldGroup} ${styles.spanFull}`}>
        <label className={styles.fieldLabel}>Exam Type</label>
        <select
          className={styles.fieldInput}
          value={formData.examType}
          onChange={e => onChange({ ...formData, examType: e.target.value })}
        >
          <option>Mid Semester Examination</option>
          <option>End Semester Examination</option>
          <option>Special Mid Semester Examination</option>
          <option>Special End Semester Examination</option>
        </select>
      </div>
    </div>
  </div>
);

/* ── Add Another Subject Button ── */
export const AddSubjectButton = ({ onClick }) => (
  <button type="button" onClick={onClick} className={styles.addSubjectBtn}>
    <Plus size={16} /> Add Another Subject
  </button>
);
