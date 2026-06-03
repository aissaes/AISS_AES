import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, AlertTriangle, Play, Info } from 'lucide-react';
import styles from './SecretTest.module.css';

const SecretTest = () => {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // State for Panel A (Teacher Materials)
  const [materialForm, setMaterialForm] = useState({
    examId: '',
    contentType: 'answer_key',
    questionId: '',
    file: null,
  });
  const [materialStatus, setMaterialStatus] = useState({ loading: false, success: null, error: null });

  // State for Panel B (Student Answer Sheet)
  const [answerForm, setAnswerForm] = useState({
    examId: '',
    studentId: '',
    questionNo: '',
    file: null,
  });
  const [answerStatus, setAnswerStatus] = useState({ loading: false, success: null, error: null });

  // State for Panel C (Trigger Evaluation)
  const [evalForm, setEvalForm] = useState({
    examId: '',
    studentId: '',
  });
  const [evalStatus, setEvalStatus] = useState({ loading: false, data: null, error: null });

  // Material Upload handler
  const handleMaterialUpload = async (e) => {
    e.preventDefault();
    if (!materialForm.examId || !materialForm.file) {
      setMaterialStatus({ loading: false, success: null, error: 'Please enter Exam ID and select a PDF file.' });
      return;
    }

    setMaterialStatus({ loading: true, success: null, error: null });
    const formData = new FormData();
    formData.append('file', materialForm.file);
    formData.append('examId', materialForm.examId);
    formData.append('contentType', materialForm.contentType);
    if (materialForm.questionId) {
      formData.append('questionId', materialForm.questionId);
    }

    try {
      const res = await axios.post(`${baseURL}/test/upload-material`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      setMaterialStatus({
        loading: false,
        success: `Successfully vectorized! File URL: ${res.data.fileUrl}`,
        error: null,
      });
    } catch (err) {
      setMaterialStatus({
        loading: false,
        success: null,
        error: err.response?.data?.message || err.response?.data?.error || err.message,
      });
    }
  };

  // Student Answer Upload handler
  const handleAnswerUpload = async (e) => {
    e.preventDefault();
    if (!answerForm.examId || !answerForm.studentId || !answerForm.questionNo || !answerForm.file) {
      setAnswerStatus({ loading: false, success: null, error: 'Please fill all fields and select an answer image.' });
      return;
    }

    setAnswerStatus({ loading: true, success: null, error: null });
    const formData = new FormData();
    formData.append('file', answerForm.file);
    formData.append('examId', answerForm.examId);
    formData.append('studentId', answerForm.studentId);
    formData.append('questionNo', answerForm.questionNo);

    try {
      const res = await axios.post(`${baseURL}/test/upload-answer`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      setAnswerStatus({
        loading: false,
        success: `Uploaded & linked successfully! Page URL: ${res.data.fileUrl}`,
        error: null,
      });
    } catch (err) {
      setAnswerStatus({
        loading: false,
        success: null,
        error: err.response?.data?.message || err.response?.data?.error || err.message,
      });
    }
  };

  // Trigger Evaluation handler
  const handleTriggerEvaluation = async (e) => {
    e.preventDefault();
    if (!evalForm.examId || !evalForm.studentId) {
      setEvalStatus({ loading: false, data: null, error: 'Please enter both Exam ID and Student ID.' });
      return;
    }

    setEvalStatus({ loading: true, data: null, error: null });

    try {
      const res = await axios.post(`${baseURL}/test/trigger-evaluate`, {
        examId: evalForm.examId,
        studentId: evalForm.studentId,
      }, {
        withCredentials: true,
      });
      setEvalStatus({
        loading: false,
        data: res.data.result,
        error: null,
      });
    } catch (err) {
      setEvalStatus({
        loading: false,
        data: null,
        error: err.response?.data?.message || err.response?.data?.error || err.message,
      });
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>AISS AES Evaluation Sandbox</h1>
        <p className={styles.subtitle}>Secret Test Page for Uploading Materials, Answer Sheets, and Triggering AI Evaluation</p>
      </header>

      <div className={styles.warningBox}>
        <Info size={16} />
        <span>This is a developer utility screen. These actions bypass standard checks to ease manual debugging of the vector engine and AI scorer.</span>
      </div>

      <div className={styles.grid}>
        {/* Panel A */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <FileText className={styles.icon} />
            <h2 className={styles.cardTitle}>1. Upload Faculty Materials</h2>
          </div>
          <form onSubmit={handleMaterialUpload} className={styles.form}>
            <div className={styles.field}>
              <label>Exam ID (Mongoose ObjectID)</label>
              <input
                type="text"
                placeholder="e.g. 65db..."
                value={materialForm.examId}
                onChange={(e) => setMaterialForm({ ...materialForm, examId: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Content Type</label>
              <select
                value={materialForm.contentType}
                onChange={(e) => setMaterialForm({ ...materialForm, contentType: e.target.value })}
              >
                <option value="answer_key">Answer Key / Rubric</option>
                <option value="notes">Lecture Notes / Syllabus</option>
                <option value="rubric">Custom Evaluation Rubric</option>
              </select>
            </div>
            {materialForm.contentType === 'answer_key' && (
              <div className={styles.field}>
                <label>Question ID (optional - e.g. S1-Q1)</label>
                <input
                  type="text"
                  placeholder="e.g. S1-Q1"
                  value={materialForm.questionId}
                  onChange={(e) => setMaterialForm({ ...materialForm, questionId: e.target.value })}
                />
              </div>
            )}
            <div className={styles.field}>
              <label>PDF Document</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setMaterialForm({ ...materialForm, file: e.target.files[0] })}
              />
            </div>
            <button type="submit" className={styles.btn} disabled={materialStatus.loading}>
              {materialStatus.loading ? 'Vectorizing...' : 'Upload & Vectorize'}
            </button>
          </form>
          {materialStatus.success && <div className={styles.success}><CheckCircle size={14} /> {materialStatus.success}</div>}
          {materialStatus.error && <div className={styles.error}><AlertTriangle size={14} /> {materialStatus.error}</div>}
        </section>

        {/* Panel B */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <Upload className={styles.icon} />
            <h2 className={styles.cardTitle}>2. Upload Scanned Script Page</h2>
          </div>
          <form onSubmit={handleAnswerUpload} className={styles.form}>
            <div className={styles.field}>
              <label>Exam ID (Mongoose ObjectID)</label>
              <input
                type="text"
                placeholder="e.g. 65db..."
                value={answerForm.examId}
                onChange={(e) => setAnswerForm({ ...answerForm, examId: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Student ID (Mongoose ObjectID)</label>
              <input
                type="text"
                placeholder="e.g. 65c9..."
                value={answerForm.studentId}
                onChange={(e) => setAnswerForm({ ...answerForm, studentId: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Question No / ID</label>
              <input
                type="text"
                placeholder="e.g. S1-Q1 or 1"
                value={answerForm.questionNo}
                onChange={(e) => setAnswerForm({ ...answerForm, questionNo: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Scanned Image File (JPEG/PNG)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAnswerForm({ ...answerForm, file: e.target.files[0] })}
              />
            </div>
            <button type="submit" className={styles.btn} disabled={answerStatus.loading}>
              {answerStatus.loading ? 'Uploading...' : 'Link Answer Page'}
            </button>
          </form>
          {answerStatus.success && <div className={styles.success}><CheckCircle size={14} /> {answerStatus.success}</div>}
          {answerStatus.error && <div className={styles.error}><AlertTriangle size={14} /> {answerStatus.error}</div>}
        </section>
      </div>

      {/* Panel C */}
      <section className={`${styles.card} ${styles.fullCard}`}>
        <div className={styles.cardHeader}>
          <Play className={styles.icon} />
          <h2 className={styles.cardTitle}>3. Trigger AI Evaluation & Result Inspector</h2>
        </div>
        <form onSubmit={handleTriggerEvaluation} className={styles.formRow}>
          <div className={styles.field}>
            <label>Exam ID</label>
            <input
              type="text"
              placeholder="e.g. 65db..."
              value={evalForm.examId}
              onChange={(e) => setEvalForm({ ...evalForm, examId: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label>Student ID</label>
            <input
              type="text"
              placeholder="e.g. 65c9..."
              value={evalForm.studentId}
              onChange={(e) => setEvalForm({ ...evalForm, studentId: e.target.value })}
            />
          </div>
          <button type="submit" className={styles.evalBtn} disabled={evalStatus.loading}>
            {evalStatus.loading ? 'Evaluating...' : 'Run Evaluation Engine'}
          </button>
        </form>

        {evalStatus.error && <div className={styles.error} style={{ marginTop: 16 }}><AlertTriangle size={14} /> {evalStatus.error}</div>}

        {evalStatus.data && (
          <div className={styles.resultBox}>
            <h3>Evaluation Completed - Result Object</h3>
            <div className={styles.scoreSummary}>
              Total Score Obtained: <strong>{evalStatus.data.totalMarksObtained}</strong> · Status: <strong>{evalStatus.data.status}</strong>
            </div>
            <pre className={styles.json}>
              {JSON.stringify(evalStatus.data, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
};

export default SecretTest;
