import React from 'react';
import { Plus, Users, Trash2 } from 'lucide-react';
import styles from './TimetableEditor.module.css';

/* -- Single Exam Form (used in both create and add-exam modals) -- */
export const ExamForm = ({ exam, index, onChange, onRemove, canRemove, facultyList, coursesList = [] }) => {
  const handleCourseChange = (courseId) => {
    const selectedCourse = coursesList.find(c => c._id === courseId);
    if (selectedCourse) {
      onChange('courseId', selectedCourse._id);
      onChange('subjectName', selectedCourse.courseName);
      onChange('subjectCode', selectedCourse.courseCode);
    } else {
      onChange('courseId', '');
      onChange('subjectName', '');
      onChange('subjectCode', '');
    }
  };

  return (
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
          <label className={styles.fieldLabel}>Select Course / Subject</label>
          <select
            className={styles.fieldInput}
            value={exam.courseId || ''}
            onChange={e => handleCourseChange(e.target.value)}
          >
            <option value="">Select Course...</option>
            {coursesList.map(c => (
              <option value={c._id} key={c._id}>
                {c.courseCode} - {c.courseName}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Subject Info (Auto-populated)</label>
          <input
            className={styles.fieldInput}
            style={{ backgroundColor: 'var(--bg-3)', opacity: 0.8, cursor: 'not-allowed' }}
            disabled
            value={exam.subjectCode ? `${exam.subjectCode} - ${exam.subjectName}` : 'No course selected'}
            placeholder="Select a course to populate"
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
};

/* -- Timetable Meta Form (semester, exam type) -- */
export const TimetableMetaForm = ({ formData, onChange, semestersList = [] }) => (
  <div className={styles.metaSection}>
    <h4 className={styles.metaTitle}>Timetable Details</h4>
    <div className={styles.gridTwo}>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Semester</label>
        <select
          className={styles.fieldInput}
          value={formData.semester || ''}
          onChange={e => onChange({ ...formData, semester: e.target.value })}
        >
          <option value="">Select Semester...</option>
          {semestersList.map(s => (
            <option value={s._id} key={s._id}>
              {s.semesterName} ({s.academicYear})
            </option>
          ))}
        </select>
      </div>
      <div className={styles.fieldGroup}>
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

/* -- Add Another Subject Button -- */
export const AddSubjectButton = ({ onClick }) => (
  <button type="button" onClick={onClick} className={styles.addSubjectBtn}>
    <Plus size={16} /> Add Another Subject
  </button>
);
