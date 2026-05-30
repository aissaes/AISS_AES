import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Cpu, UserCheck, Clock, FileCheck2, AlertCircle, UserPlus, Upload, BookOpen, FileText } from 'lucide-react';
import apiClient, { evaluationAPI, timetableAPI, questionPaperAPI } from '../../api/client';
import { useToast } from '../../components/Toast/Toast';
import Modal from '../../components/Modal/Modal';
import styles from './FacultyDashboard.module.css';

const ExamGrading = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
  const [materialsFileType, setMaterialsFileType] = useState('notes');
  const [materialsSelectedQuestionId, setMaterialsSelectedQuestionId] = useState('');
  const [materialsFile, setMaterialsFile] = useState(null);
  const [uploadingMaterials, setUploadingMaterials] = useState(false);
  const [availableQuestionIds, setAvailableQuestionIds] = useState([]);



  useEffect(() => {
    fetchExamAndSubmissions();
  }, [examId]);

  const fetchExamAndSubmissions = async () => {
    setLoading(true);
    try {
      // 1. Fetch Exam Meta
      const examRes = await timetableAPI.getExamById(examId);
      const fetchedExam = examRes.data.exam;
      setExam(fetchedExam);

      // 2. Fetch Appeared Students
      const studentRes = await evaluationAPI.getAppearedStudents(examId);
      setStudents(studentRes.data.students || []);

      // 3. Fetch Grading Results
      const resultRes = await evaluationAPI.getResultOverview(examId);
      setResults(resultRes.data.results || []);

      // 4. Fetch Question Paper to extract Question IDs for materials modal
      if (fetchedExam && fetchedExam.questionPaper) {
        try {
          const paperId = fetchedExam.questionPaper._id || fetchedExam.questionPaper;
          const paperRes = await questionPaperAPI.getById(paperId);
          const paper = paperRes.data.paper;
          if (paper && paper.sections) {
            const ids = [];
            paper.sections.forEach(section => {
              section.forEach(q => {
                if (q.questionId) {
                  ids.push(q.questionId);
                }
                if (q.children && q.children.length > 0) {
                  q.children.forEach(subQ => {
                    if (subQ.questionId) {
                      ids.push(subQ.questionId);
                    }
                  });
                }
              });
            });
            setAvailableQuestionIds(ids);
            if (ids.length > 0) {
              setMaterialsSelectedQuestionId(ids[0]);
            }
          }
        } catch (paperErr) {
          console.error("Failed to load question paper details:", paperErr);
        }
      }
    } catch (err) {
      toast('Failed to load submissions list.', 'error');
    } finally {
      setLoading(false);
    }
  };



  const handleUploadMaterials = async (e) => {
    e.preventDefault();
    if (!materialsFile) {
      toast("Please select a PDF file.", "warning");
      return;
    }
    if (materialsFileType === 'answer_key' && !materialsSelectedQuestionId) {
      toast("Please select a question ID.", "warning");
      return;
    }

    setUploadingMaterials(true);
    try {
      const formData = new FormData();
      formData.append('pdf_file', materialsFile);

      toast("Uploading PDF to storage...", "info");
      const uploadRes = await apiClient.post('/upload-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!uploadRes.data || !uploadRes.data.pdfUrl) {
        throw new Error("PDF upload failed.");
      }

      const fileUrl = uploadRes.data.pdfUrl;

      toast("Vectorizing materials with AI...", "info");
      const payload = {
        fileUrl,
        contentType: materialsFileType
      };
      if (materialsFileType === 'answer_key') {
        payload.questionId = materialsSelectedQuestionId;
      }

      const res = await evaluationAPI.uploadMaterials(examId, payload);
      if (res.data.success) {
        toast("Materials vectorized successfully!", "success");
        setIsMaterialsModalOpen(false);
        setMaterialsFile(null);
      } else {
        toast(res.data.message || "Failed to vectorize materials.", "error");
      }
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || err.message || "Error uploading materials.", "error");
    } finally {
      setUploadingMaterials(false);
    }
  };

  const handleTriggerAI = async (studentId) => {
    setActionLoading(prev => ({ ...prev, [studentId]: true }));
    toast('Triggering AI Evaluation in parallel. Please wait...', 'info');
    try {
      const res = await evaluationAPI.triggerAIEvaluation(examId, studentId);
      if (res.data.success) {
        toast(`AI evaluation complete! Total Marks: ${res.data.totalMarks}`, 'success');
        fetchExamAndSubmissions();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'AI evaluation triggered but server encountered an issue.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleTriggerAllPending = async () => {
    const pendingStudents = students.filter(student => {
      const result = results.find(r => r.student?._id === student._id);
      return !result || result.status === 'Evaluating';
    });

    if (pendingStudents.length === 0) {
      toast('No pending evaluations found!', 'warning');
      return;
    }

    toast(`Triggering evaluations for ${pendingStudents.length} students concurrently...`, 'info');
    
    // Concurrently trigger all AI evaluations
    const promises = pendingStudents.map(student => handleTriggerAI(student._id));
    await Promise.all(promises);
  };

  // Stats calculation
  const totalSubmissions = students.length;
  const gradedCount = results.filter(r => r.status === 'Completed').length;
  const pendingCount = totalSubmissions - gradedCount;

  return (
    <div className={styles.pageWrap}>
      {/* Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button 
          onClick={() => navigate('/faculty/evaluations')}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Back to Courses
        </button>
      </div>

      {exam && (
        <div className={styles.banner}>
          <div className={styles.bannerLeft}>
            <div>
              <h2 className={styles.bannerTitle}>{exam.subjectName} Submissions</h2>
              <p className={styles.bannerRole}>{exam.subjectCode} · Semester {exam.semester} · Max Marks: {exam.maxMarks}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              className={styles.primaryBtn} 
              onClick={() => setIsMaterialsModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#7c3aed',
              }}
            >
              <Upload size={14} /> Teaching Materials
            </button>

            <button className={styles.ghostBtn} onClick={fetchExamAndSubmissions} disabled={loading}>
              <RefreshCw size={14} className={loading ? styles.spin : ''} /> Refresh
            </button>

            {pendingCount > 0 && (
              <button 
                className={styles.primaryBtn} 
                onClick={handleTriggerAllPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--warning)',
                }}
              >
                <Cpu size={14} /> Evaluate All Pending
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className={styles.statsGrid} style={{ marginBottom: 24 }}>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.statIconWrap}><UserCheck size={22} /></div>
          <div>
            <p className={styles.statValue}>{totalSubmissions}</p>
            <p className={styles.statLabel}>Appeared Students</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.statIconWrap}><FileCheck2 size={22} /></div>
          <div>
            <p className={styles.statValue}>{gradedCount}</p>
            <p className={styles.statLabel}>Graded Submissions</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.amber}`}>
          <div className={styles.statIconWrap}><Clock size={22} /></div>
          <div>
            <p className={styles.statValue}>{pendingCount}</p>
            <p className={styles.statLabel}>Pending Evaluation</p>
          </div>
        </div>
      </div>

      {/* Submissions List Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Student Submissions & Grades</h3>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div className={styles.spinner} style={{ margin: 'auto' }} />
          ) : students.length === 0 ? (
            <div className={styles.emptyCenter}>
              <AlertCircle size={48} color="#94a3b8" />
              <p className={styles.emptyText} style={{ marginTop: 12 }}>No answer scripts have been uploaded for this exam yet.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569', fontSize: '13px', fontWeight: 600 }}>
                  <th style={{ padding: '12px 8px' }}>Student Name</th>
                  <th style={{ padding: '12px 8px' }}>Roll Number</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                  <th style={{ padding: '12px 8px' }}>Total Marks</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const result = results.find(r => r.student?._id === student._id);
                  const isEvaluating = result?.status === 'Evaluating';
                  const isCompleted = result?.status === 'Completed';
                  
                  let statusLabel = 'Not Evaluated';
                  let statusBg = '#e2e8f0';
                  let statusColor = '#475569';
                  
                  if (isEvaluating) {
                    statusLabel = 'Evaluating';
                    statusBg = '#fef3c7';
                    statusColor = '#d97706';
                  } else if (isCompleted) {
                    statusLabel = 'Completed';
                    statusBg = '#dcfce7';
                    statusColor = '#15803d';
                  }

                  const marks = isCompleted ? result.totalMarksObtained : '—';
                  const isPendingAI = actionLoading[student._id];

                  return (
                    <tr key={student._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#1e293b' }}>
                      <td style={{ padding: '16px 8px', fontWeight: 600 }}>{student.name}</td>
                      <td style={{ padding: '16px 8px' }}>{student.rollNumber || 'N/A'}</td>
                      <td style={{ padding: '16px 8px' }}>
                        <span 
                          style={{
                            background: statusBg,
                            color: statusColor,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '16px 8px', fontWeight: 700, fontSize: '15px' }}>{marks}</td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button
                            className={styles.primaryBtn}
                            onClick={() => handleTriggerAI(student._id)}
                            disabled={isPendingAI}
                            style={{
                              background: isCompleted ? '#f1f5f9' : 'var(--primary)',
                              color: isCompleted ? '#334155' : 'white',
                              border: isCompleted ? '1px solid #cbd5e1' : 'none',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Cpu size={14} /> 
                            {isPendingAI ? 'Processing...' : isCompleted ? 'Re-evaluate' : 'AI Grade'}
                          </button>
                          
                          {isCompleted && (
                            <button
                              className={styles.primaryBtn}
                              onClick={() => navigate(`/faculty/evaluations/${examId}/student/${student._id}`)}
                              style={{
                                fontSize: '13px',
                              }}
                            >
                              Review & Grade
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Teaching Materials Modal ── */}
      <Modal
        isOpen={isMaterialsModalOpen}
        onClose={() => !uploadingMaterials && setIsMaterialsModalOpen(false)}
        title="Upload Teaching Materials"
      >
        <form onSubmit={handleUploadMaterials} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 5px' }}>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
            Upload course notes, syllabi, rubrics, or specific answer keys. The AI agent will automatically chunk and vectorize the document to use as reference material when grading.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className={styles.modalLabel}>Material Type</label>
            <select
              className={styles.modalInput}
              value={materialsFileType}
              onChange={(e) => setMaterialsFileType(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="notes">Course Notes / Rubric / Syllabus (notes)</option>
              <option value="answer_key">Answer Key for Specific Question (answer_key)</option>
            </select>
          </div>

          {materialsFileType === 'answer_key' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
              <label className={styles.modalLabel}>Select Question ID</label>
              {availableQuestionIds.length === 0 ? (
                <div style={{ color: '#d97706', fontSize: '0.85rem', padding: '8px 12px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  No questions found. Make sure the question paper has been approved.
                </div>
              ) : (
                <select
                  className={styles.modalInput}
                  value={materialsSelectedQuestionId}
                  onChange={(e) => setMaterialsSelectedQuestionId(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {availableQuestionIds.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className={styles.modalLabel}>Upload Document (PDF)</label>
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '24px 16px',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.01)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && file.type === 'application/pdf') {
                setMaterialsFile(file);
              } else {
                toast("Please drop a valid PDF file.", "error");
              }
            }}
            >
              <input
                type="file"
                accept="application/pdf"
                id="materials-file-upload"
                style={{ display: 'none' }}
                onChange={(e) => setMaterialsFile(e.target.files[0])}
              />
              <label htmlFor="materials-file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <Upload size={18} />
                </div>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                    {materialsFile ? materialsFile.name : 'Choose a file or drag it here'}
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    {materialsFile ? `Size: ${(materialsFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDF files up to 10MB'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setIsMaterialsModalOpen(false)}
              disabled={uploadingMaterials}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={uploadingMaterials || !materialsFile || (materialsFileType === 'answer_key' && availableQuestionIds.length === 0)}
              style={{ background: 'linear-gradient(135deg, var(--primary), #7c3aed)' }}
            >
              {uploadingMaterials ? 'Uploading...' : 'Upload & Process'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ExamGrading;
