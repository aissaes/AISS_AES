import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, AlertTriangle, Play, Info, Eye, Clipboard, Trash2, Cpu } from 'lucide-react';
import styles from './SecretTest.module.css';

const SecretTest = () => {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [activeTab, setActiveTab] = useState('full'); // 'full' | 'vector' | 'ocr' | 'eval'
  const [cleanupStatus, setCleanupStatus] = useState({ loading: false, message: null });

  // Tab 1: Full Pipeline State
  const [fullForm, setFullForm] = useState({
    questionText: '',
    maxMarks: 10,
    file: null,
  });
  const [fullStatus, setFullStatus] = useState({ loading: false, data: null, error: null });

  // Tab 2: Vector Test State
  const [vectorForm, setVectorForm] = useState({
    contentType: 'answer_key',
    file: null,
  });
  const [vectorStatus, setVectorStatus] = useState({ loading: false, data: null, error: null });

  // Tab 3: OCR Test State
  const [ocrForm, setOcrForm] = useState({
    file: null,
  });
  const [ocrStatus, setOcrStatus] = useState({ loading: false, data: null, error: null });

  // Tab 4: Evaluation Test State
  const [evalForm, setEvalForm] = useState({
    studentAnswer: '',
    answerKey: '',
    contextNotes: '',
    maxMarks: 10,
  });
  const [evalStatus, setEvalStatus] = useState({ loading: false, data: null, error: null });

  // Trigger Database Cleanup
  const handleCleanup = async () => {
    if (!window.confirm("Are you sure you want to delete all sandbox mock records from the database?")) return;
    setCleanupStatus({ loading: true, message: null });
    try {
      const res = await axios.delete(`${baseURL}/test/sandbox/cleanup`);
      setCleanupStatus({ loading: false, message: res.data.message });
      setTimeout(() => setCleanupStatus({ loading: false, message: null }), 4000);
    } catch (err) {
      setCleanupStatus({ loading: false, message: `Error: ${err.message}` });
    }
  };

  // Full Pipeline Submit
  const handleFullPipeline = async (e) => {
    e.preventDefault();
    if (!fullForm.questionText || !fullForm.file) {
      setFullStatus({ loading: false, data: null, error: 'Please enter question text and upload an answer sheet image.' });
      return;
    }
    setFullStatus({ loading: true, data: null, error: null });
    const formData = new FormData();
    formData.append('file', fullForm.file);
    formData.append('questionText', fullForm.questionText);
    formData.append('maxMarks', fullForm.maxMarks);

    try {
      const res = await axios.post(`${baseURL}/test/sandbox/evaluate-full`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      setFullStatus({ loading: false, data: res.data, error: null });
    } catch (err) {
      setFullStatus({
        loading: false,
        data: null,
        error: err.response?.data?.error || err.response?.data?.message || err.message,
      });
    }
  };

  // Vectorize Test Submit
  const handleVectorize = async (e) => {
    e.preventDefault();
    if (!vectorForm.file) {
      setVectorStatus({ loading: false, data: null, error: 'Please select a PDF document.' });
      return;
    }
    setVectorStatus({ loading: true, data: null, error: null });

    try {
      // 1. Get ImageKit authentication parameters from backend
      const authRes = await axios.get(`${baseURL}/test/sandbox/imagekit-auth`, {
        withCredentials: true,
      });
      const { token, expire, signature, publicKey } = authRes.data;

      // 2. Upload file directly to ImageKit bypassing Vercel limits
      const ikFormData = new FormData();
      ikFormData.append("file", vectorForm.file);
      ikFormData.append("fileName", vectorForm.file.name);
      ikFormData.append("publicKey", publicKey);
      ikFormData.append("signature", signature);
      ikFormData.append("expire", expire);
      ikFormData.append("token", token);
      ikFormData.append("folder", "/teacher_materials");

      const ikUploadRes = await axios.post("https://upload.imagekit.io/api/v1/files/upload", ikFormData);
      if (!ikUploadRes.data || !ikUploadRes.data.url) {
        throw new Error("Direct ImageKit upload failed.");
      }

      const fileUrl = ikUploadRes.data.url;

      // 3. Send the file URL to vectorize endpoint
      const res = await axios.post(`${baseURL}/test/sandbox/vectorize-by-url`, {
        fileUrl,
        contentType: vectorForm.contentType,
      }, {
        withCredentials: true,
      });

      setVectorStatus({ loading: false, data: res.data, error: null });
    } catch (err) {
      setVectorStatus({
        loading: false,
        data: null,
        error: err.response?.data?.error || err.response?.data?.message || err.message,
      });
    }
  };

  // OCR Test Submit
  const handleOCR = async (e) => {
    e.preventDefault();
    if (!ocrForm.file) {
      setOcrStatus({ loading: false, data: null, error: 'Please upload an image or PDF.' });
      return;
    }
    setOcrStatus({ loading: true, data: null, error: null });
    const formData = new FormData();
    formData.append('file', ocrForm.file);

    try {
      const res = await axios.post(`${baseURL}/test/sandbox/ocr`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      setOcrStatus({ loading: false, data: res.data, error: null });
    } catch (err) {
      setOcrStatus({
        loading: false,
        data: null,
        error: err.response?.data?.error || err.response?.data?.message || err.message,
      });
    }
  };

  // Direct Text Evaluation Submit
  const handleEvalText = async (e) => {
    e.preventDefault();
    if (!evalForm.studentAnswer || !evalForm.answerKey) {
      setEvalStatus({ loading: false, data: null, error: 'Please enter student answer and answer key.' });
      return;
    }
    setEvalStatus({ loading: true, data: null, error: null });
    try {
      const res = await axios.post(`${baseURL}/test/sandbox/evaluate-text`, {
        studentAnswer: evalForm.studentAnswer,
        answerKey: evalForm.answerKey,
        contextNotes: evalForm.contextNotes,
        maxMarks: evalForm.maxMarks,
      }, {
        withCredentials: true,
      });
      setEvalStatus({ loading: false, data: res.data, error: null });
    } catch (err) {
      setEvalStatus({
        loading: false,
        data: null,
        error: err.response?.data?.error || err.response?.data?.message || err.message,
      });
    }
  };

  // Helper to parse double JSON response from FastAPI if stringified
  const renderEvaluationJSON = (evalOutput) => {
    if (!evalOutput) return null;
    let parsed = evalOutput;
    if (typeof evalOutput === 'string') {
      try {
        const cleaned = evalOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (e) {
        return <pre className={styles.json}>{evalOutput}</pre>;
      }
    }
    return (
      <div className={styles.resultDetailsGrid}>
        <div className={styles.detailsCard}>
          <h4>Grading Output</h4>
          <div className={styles.scoreBadgeContainer}>
            <span className={styles.scoreBadge}>{parsed.score ?? '--'}</span>
            <span className={styles.scoreLabel}>Score Awarded</span>
          </div>
          <p><strong>Reasoning:</strong> {parsed.reasoning || 'N/A'}</p>
        </div>
        <div className={styles.detailsCard}>
          <h4>AI Detailed Critique</h4>
          <p><strong>Strengths:</strong> {parsed.strengths || 'N/A'}</p>
          <p><strong>Weaknesses:</strong> {parsed.weaknesses || 'N/A'}</p>
          <p><strong>Feedback:</strong> {parsed.feedback || 'N/A'}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <div>
            <h1 className={styles.title}>AI Agent Evaluation Sandbox</h1>
            <p className={styles.subtitle}>Test and analyze OCR, vector retrieval, and prompt chain workflows</p>
          </div>
          <button className={styles.cleanupBtn} onClick={handleCleanup} disabled={cleanupStatus.loading}>
            <Trash2 size={15} /> {cleanupStatus.loading ? 'Deleting...' : 'Reset Sandbox DB'}
          </button>
        </div>
        {cleanupStatus.message && (
          <div className={styles.success} style={{ marginTop: 12 }}>
            <CheckCircle size={14} /> {cleanupStatus.message}
          </div>
        )}
      </header>

      {/* Tabs list */}
      <nav className={styles.tabsList}>
        <button className={activeTab === 'full' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('full')}>
          <Cpu size={16} /> Full Pipeline Test
        </button>
        <button className={activeTab === 'vector' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('vector')}>
          <FileText size={16} /> Vector Test
        </button>
        <button className={activeTab === 'ocr' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('ocr')}>
          <Eye size={16} /> OCR Test
        </button>
        <button className={activeTab === 'eval' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('eval')}>
          <Clipboard size={16} /> Evaluation Test
        </button>
      </nav>

      {/* Tab Contents: FULL PIPELINE */}
      {activeTab === 'full' && (
        <div className={styles.tabContentGrid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Run End-to-End Evaluation</h2>
            <form onSubmit={handleFullPipeline} className={styles.form}>
              <div className={styles.field}>
                <label>Question Text</label>
                <textarea
                  className={styles.builderTextarea}
                  rows={3}
                  placeholder="e.g., What is a deadlock and what are its four necessary conditions?"
                  value={fullForm.questionText}
                  onChange={(e) => setFullForm({ ...fullForm, questionText: e.target.value })}
                />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Max Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={fullForm.maxMarks}
                    onChange={(e) => setFullForm({ ...fullForm, maxMarks: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label>Student Answer Sheet Image</label>
                <input
                  type="file"
                  accept="image/*,application/pdf,.docx,.doc"
                  onChange={(e) => setFullForm({ ...fullForm, file: e.target.files[0] })}
                />
              </div>
              <button type="submit" className={styles.evalBtn} disabled={fullStatus.loading}>
                <Play size={15} /> {fullStatus.loading ? 'Grading Answer...' : 'Run Pipeline'}
              </button>
            </form>
            {fullStatus.error && <div className={styles.error}><AlertTriangle size={14} /> {fullStatus.error}</div>}
          </div>

          <div className={styles.resultsCard}>
            <h2 className={styles.cardTitle}>Pipeline Diagnostics</h2>
            {fullStatus.data ? (
              <div className={styles.diagnosticsWrapper}>
                {renderEvaluationJSON(fullStatus.data.aiResponse?.evaluation)}

                <div className={styles.accordionSection}>
                  <h3>Developer Diagnostics</h3>
                  <div className={styles.diagField}>
                    <label>Extracted OCR Text</label>
                    <pre className={styles.json}>{fullStatus.data.aiResponse?.extracted_text || 'No text extracted.'}</pre>
                  </div>
                  <div className={styles.diagField}>
                    <label>Retrieved Reference Context (Pinecone)</label>
                    <div className={styles.chunksList}>
                      {fullStatus.data.aiResponse?.context_notes?.length > 0 ? (
                        fullStatus.data.aiResponse.context_notes.map((note, i) => (
                          <pre key={i} className={styles.json} style={{ color: '#fb7185' }}>Chunk {i + 1}: {note}</pre>
                        ))
                      ) : (
                        <p className={styles.noChunks} style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                          Reference keys and notes are matched and injected internally by the agent's Pinecone retrieval step.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={styles.diagField}>
                    <label>Auditor Status (Recheck Node)</label>
                    <pre className={styles.json} style={{ color: '#38bdf8' }}>
                      Recheck Auditor Decision: {fullStatus.data.aiResponse?.recheck_status || 'N/A'}{'\n'}
                      Auditor Loop Count: {fullStatus.data.aiResponse?.revision_count || 0}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Cpu size={36} />
                <p>Run the end-to-end evaluation pipeline on the left to see LangGraph step outputs and intermediate audits here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents: VECTOR TEST */}
      {activeTab === 'vector' && (
        <div className={styles.tabContentGrid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Vector Indexing Test</h2>
            <p className={styles.infoText}>Processes reference guides, chunks them dynamically, and vectorizes them into Pinecone.</p>
            <form onSubmit={handleVectorize} className={styles.form}>
              <div className={styles.field}>
                <label>Content Type</label>
                <select
                  value={vectorForm.contentType}
                  onChange={(e) => setVectorForm({ ...vectorForm, contentType: e.target.value })}
                >
                  <option value="answer_key">Answer Key / Rubric</option>
                  <option value="notes">Lecture Notes / Syllabus</option>
                  <option value="rubric">Marking Criteria Guidelines</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>PDF Document</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setVectorForm({ ...vectorForm, file: e.target.files[0] })}
                />
              </div>
              <button type="submit" className={styles.btn} disabled={vectorStatus.loading}>
                {vectorStatus.loading ? 'Vectorizing...' : 'Vectorize Document'}
              </button>
            </form>
            {vectorStatus.error && <div className={styles.error}><AlertTriangle size={14} /> {vectorStatus.error}</div>}
          </div>

          <div className={styles.resultsCard}>
            <h2 className={styles.cardTitle}>Vector Output</h2>
            {vectorStatus.data ? (
              <div className={styles.diagnosticsWrapper}>
                <div className={styles.success}>
                  <CheckCircle size={14} /> Materials successfully vectorized!
                </div>
                <div className={styles.diagField} style={{ marginTop: 16 }}>
                  <label>Hosted Document Link</label>
                  <a href={vectorStatus.data.fileUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                    {vectorStatus.data.fileUrl}
                  </a>
                </div>
                <div className={styles.diagField}>
                  <label>AI Agent Response</label>
                  <pre className={styles.json}>{JSON.stringify(vectorStatus.data.aiResponse, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <FileText size={36} />
                <p>Upload teacher keys or notes to vectorize them into the sandbox Pinecone index namespace.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents: OCR TEST */}
      {activeTab === 'ocr' && (
        <div className={styles.tabContentGrid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>OCR Text Extraction Test</h2>
            <p className={styles.infoText}>Test the optical character recognition accuracy on handwritten answer sheets.</p>
            <form onSubmit={handleOCR} className={styles.form}>
              <div className={styles.field}>
                <label>Image Page File</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setOcrForm({ ...ocrForm, file: e.target.files[0] })}
                />
              </div>
              <button type="submit" className={styles.btn} disabled={ocrStatus.loading}>
                {ocrStatus.loading ? 'Extracting text...' : 'Run OCR Parser'}
              </button>
            </form>
            {ocrStatus.error && <div className={styles.error}><AlertTriangle size={14} /> {ocrStatus.error}</div>}
          </div>

          <div className={styles.resultsCard}>
            <h2 className={styles.cardTitle}>Parsed Handwriting Output</h2>
            {ocrStatus.data ? (
              <div className={styles.diagnosticsWrapper}>
                <div className={styles.diagField}>
                  <label>Extracted Text</label>
                  <pre className={styles.json} style={{ whiteSpace: 'pre-wrap', maxHeight: '400px' }}>
                    {ocrStatus.data.extractedText || 'No text detected.'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Eye size={36} />
                <p>Upload a handwritten script snapshot to view the parsed OCR string output here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents: EVALUATION TEST */}
      {activeTab === 'eval' && (
        <div className={styles.tabContentGrid}>
          <div className={styles.card} style={{ gridColumn: 'span 2' }}>
            <h2 className={styles.cardTitle}>Direct Text Prompt Evaluation</h2>
            <p className={styles.infoText}>Paste text answers directly to grade them against a key. Bypasses OCR and Vector DB lookups.</p>
            <form onSubmit={handleEvalText} className={styles.form}>
              <div className={styles.evalTextInputsRow}>
                <div className={styles.field}>
                  <label>Student Answer Text</label>
                  <textarea
                    className={styles.builderTextarea}
                    rows={6}
                    placeholder="Paste the student's answer text here..."
                    value={evalForm.studentAnswer}
                    onChange={(e) => setEvalForm({ ...evalForm, studentAnswer: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>Teacher Answer Key</label>
                  <textarea
                    className={styles.builderTextarea}
                    rows={6}
                    placeholder="Paste the correct answer key guidelines here..."
                    value={evalForm.answerKey}
                    onChange={(e) => setEvalForm({ ...evalForm, answerKey: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>Context Notes / reference guidelines (optional)</label>
                <textarea
                  className={styles.builderTextarea}
                  rows={3}
                  placeholder="Paste auxiliary marking notes or lecture concepts here..."
                  value={evalForm.contextNotes}
                  onChange={(e) => setEvalForm({ ...evalForm, contextNotes: e.target.value })}
                />
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Max Marks Possible</label>
                  <input
                    type="number"
                    min="1"
                    value={evalForm.maxMarks}
                    onChange={(e) => setEvalForm({ ...evalForm, maxMarks: Number(e.target.value) })}
                  />
                </div>
              </div>

              <button type="submit" className={styles.evalBtn} disabled={evalStatus.loading} style={{ alignSelf: 'flex-end' }}>
                <Play size={15} /> {evalStatus.loading ? 'Evaluating...' : 'Evaluate Text'}
              </button>
            </form>
            {evalStatus.error && <div className={styles.error}><AlertTriangle size={14} /> {evalStatus.error}</div>}

            {evalStatus.data && (
              <div className={styles.evaluationTextResult} style={{ marginTop: 24 }}>
                <h3 className={styles.cardTitle} style={{ marginBottom: 12 }}>Evaluation Output</h3>
                {renderEvaluationJSON(evalStatus.data.aiResponse?.evaluation)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecretTest;
