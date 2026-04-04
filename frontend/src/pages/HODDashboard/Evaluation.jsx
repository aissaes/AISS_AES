import React, { useEffect, useState } from 'react';
import { BookOpen, FileText, Upload, Cpu, CheckCircle2, PlayCircle, AlertCircle, RefreshCw, Users } from 'lucide-react';
import { timetableAPI, hodAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './HODDashboard.module.css';

const Evaluation = () => {
  const { toast } = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // File & Evaluation Modals
  const [kbModal, setKbModal] = useState({ open: false, exam: null, type: 'pdf', textUpload: '' });
  const [uploading, setUploading] = useState(false);

  const [evalModal, setEvalModal] = useState({ open: false, exam: null, specificStudentId: '' });
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await timetableAPI.getAll();
      const timetables = res.data.timetables || [];
      // Flatten all exams from all timetables
      const allExams = timetables.flatMap(t => 
        (t.exams || []).map(e => ({ 
          ...e, 
          parentTimetable: `${t.course} Sem ${t.semester} - ${t.examType}` 
        }))
      );
      setExams(allExams);
    } catch {
      toast('Failed to load exams from timetables.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPDF = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      toast('Extracting text from PDF (this may take a moment)...', 'info');
      const formData = new FormData();
      formData.append('pdf', file);
      
      const extractRes = await hodAPI.extractPDF(formData);
      const extractedText = extractRes.data.extractedText;

      toast('PDF parsed! Uploading to Vector Database...', 'info');
      await hodAPI.uploadVectorText(kbModal.exam._id, { text: extractedText });

      toast('Knowledge base updated successfully!', 'success');
      setKbModal({ open: false, exam: null, type: 'pdf', textUpload: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to process PDF', 'error');
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  const handleUploadText = async () => {
    if (!kbModal.textUpload.trim()) {
      toast('Please enter some text.', 'warning');
      return;
    }
    setUploading(true);
    try {
      toast('Uploading text to Vector Database...', 'info');
      await hodAPI.uploadVectorText(kbModal.exam._id, { text: kbModal.textUpload });
      toast('Knowledge base updated successfully!', 'success');
      setKbModal({ open: false, exam: null, type: 'pdf', textUpload: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to upload notes', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleTriggerEval = async () => {
    setEvaluating(true);
    try {
      if (evalModal.specificStudentId) {
        toast('Evaluating single student...', 'info');
        const res = await hodAPI.evaluateStudent(evalModal.exam._id, evalModal.specificStudentId);
        toast(res.data.message || 'Student evaluated successfully!', 'success');
      } else {
        toast('Initiating batch evaluation for all pending students...', 'info');
        const res = await hodAPI.evaluateAllStudents(evalModal.exam._id);
        toast(res.data.message || 'Batch evaluation initiated!', 'success');
      }
      setEvalModal({ open: false, exam: null, specificStudentId: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Evaluation failed.', 'error');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <div>
            <h2 className={styles.bannerTitle}>AI Evaluation System</h2>
            <p className={styles.bannerRole}>Upload knowledge base notes & trigger grading</p>
          </div>
        </div>
        <button className={styles.ghostBtn} onClick={fetchExams} disabled={loading}>
          <RefreshCw size={14} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Cpu size={18} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Exam Management</h3>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div className={styles.spinner} style={{ margin: 'auto' }} />
          ) : exams.length === 0 ? (
            <div className={styles.emptyCenter}>
              <span className={styles.emptyIcon}>🤖</span>
              <p className={styles.emptyText}>No exams found in timetables.</p>
            </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {exams.map(exam => (
                  <div key={exam._id} className={styles.examItem} style={{ border: '1px solid var(--border-base)', padding: '16px', borderRadius: '12px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: '1 1 300px' }}>
                      <h4 className={styles.examTitle}>
                        {exam.subjectName} <span className={styles.examCode}>{exam.subjectCode}</span>
                      </h4>
                      <p className={styles.examMeta} style={{ marginTop: '8px' }}>
                         <BookOpen size={13} /> {exam.parentTimetable}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => setKbModal({ open: true, exam, type: 'pdf', textUpload: '' })}
                        style={{ border: '1px solid var(--border-base)' }}
                      >
                        <Upload size={14} /> Upload Notes (KB)
                      </button>
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => setEvalModal({ open: true, exam, specificStudentId: '' })}
                        style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
                      >
                        <PlayCircle size={14} /> Trigger AI Eval
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          )}
        </div>
      </div>

      {/* ── Knowledge Base Upload Modal ── */}
      <Modal
        isOpen={kbModal.open}
        onClose={() => !uploading && setKbModal({ open: false, exam: null, type: 'pdf', textUpload: '' })}
        title={`Upload Knowledge Base: ${kbModal.exam?.subjectName}`}
      >
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-1)', padding: '4px', borderRadius: '8px' }}>
            <button 
              className={styles.tabBtn} 
              style={{ flex: 1, background: kbModal.type === 'pdf' ? 'var(--bg-3)' : 'transparent', color: kbModal.type === 'pdf' ? 'var(--text-1)' : 'var(--text-3)' }}
              onClick={() => setKbModal(prev => ({ ...prev, type: 'pdf' }))}
            >
              PDF Book/Notes
            </button>
            <button 
              className={styles.tabBtn} 
              style={{ flex: 1, background: kbModal.type === 'text' ? 'var(--bg-3)' : 'transparent', color: kbModal.type === 'text' ? 'var(--text-1)' : 'var(--text-3)' }}
              onClick={() => setKbModal(prev => ({ ...prev, type: 'text' }))}
            >
              Raw Text
            </button>
          </div>

          {kbModal.type === 'pdf' ? (
             <div style={{ border: '2px dashed var(--border-base)', borderRadius: '12px', padding: '40px 20px', textAlign: 'center' }}>
                <FileText size={32} style={{ color: 'var(--text-3)', margin: '0 auto 12px auto' }} />
                <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '16px' }}>Select a PDF document containing the study material or answer key.</p>
                <input 
                  type="file" 
                  accept=".pdf" 
                  id="pdf-upload" 
                  style={{ display: 'none' }} 
                  onChange={handleUploadPDF}
                  disabled={uploading}
                />
                <label htmlFor="pdf-upload" className={styles.primaryModalBtn} style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.7 : 1, display: 'inline-block' }}>
                  {uploading ? 'Processing PDF...' : 'Choose PDF File'}
                </label>
             </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Paste relevant notes, textbook extracts, or answer keys directly here.</p>
                <textarea 
                  className={styles.modalTextarea} 
                  rows={8}
                  placeholder="Paste text here..."
                  value={kbModal.textUpload}
                  onChange={e => setKbModal(prev => ({ ...prev, textUpload: e.target.value }))}
                  disabled={uploading}
                />
                <button 
                  className={styles.primaryModalBtn} 
                  onClick={handleUploadText} 
                  disabled={uploading || !kbModal.textUpload.trim()}
                  style={{ alignSelf: 'flex-end', marginTop: '8px' }}
                >
                  {uploading ? 'Uploading...' : 'Save to Vector DB'}
                </button>
             </div>
          )}
        </div>
      </Modal>

      {/* ── Trigger Evaluation Modal ── */}
      <Modal
         isOpen={evalModal.open}
         onClose={() => !evaluating && setEvalModal({ open: false, exam: null, specificStudentId: '' })}
         title={`Evaluate Exam: ${evalModal.exam?.subjectName}`}
      >
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
           <div className={styles.modalAlertWarn} style={{ margin: 0 }}>
             <AlertCircle size={18} style={{ flexShrink: 0 }} />
             <p>This action will engage AI models to grade handwritten scripts. Please ensure the Knowledge Base has been populated.</p>
           </div>

           <div style={{ border: '1px solid var(--border-base)', borderRadius: '12px', padding: '16px', background: 'var(--bg-3)' }}>
             <h4 style={{ color: 'var(--text-1)', fontSize: '0.95rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Users size={16} /> Batch Evaluate All
             </h4>
             <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '12px', lineHeight: 1.5 }}>
               Automatically grade all unscored submissions for this exam simultaneously. This might take several minutes depending on the volume.
             </p>
             <button 
               className={styles.successModalBtn} 
               onClick={handleTriggerEval}
               disabled={evaluating}
             >
               {evaluating && !evalModal.specificStudentId ? 'Evaluating...' : 'Start Batch Evaluation'}
             </button>
           </div>

           <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.9rem', fontWeight: 600 }}>OR</div>

           <div style={{ border: '1px solid var(--border-base)', borderRadius: '12px', padding: '16px' }}>
             <h4 style={{ color: 'var(--text-1)', fontSize: '0.95rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Users size={16} /> Evaluate Single Student
             </h4>
             <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '12px', lineHeight: 1.5 }}>
               Test the system or forcefully re-evaluate a specific student by entering their ID.
             </p>
             <input 
               type="text" 
               className={styles.formInput} 
               placeholder="Student ID (Mongo ID)" 
               value={evalModal.specificStudentId}
               onChange={(e) => setEvalModal(prev => ({ ...prev, specificStudentId: e.target.value }))}
               style={{ marginBottom: '12px' }}
               disabled={evaluating}
             />
             <button 
               className={styles.primaryModalBtn} 
               onClick={handleTriggerEval}
               disabled={evaluating || !evalModal.specificStudentId.trim()}
             >
               {evaluating && evalModal.specificStudentId ? 'Evaluating...' : 'Evaluate Single Student'}
             </button>
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default Evaluation;
