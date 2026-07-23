import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  const [materialsScope, setMaterialsScope] = useState('entire_exam');
  const [replaceMaterialId, setReplaceMaterialId] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMaterialTitle, setHistoryMaterialTitle] = useState('');
  const [materialsFile, setMaterialsFile] = useState(null);
  const [uploadingMaterials, setUploadingMaterials] = useState(false);
  const [availableQuestionIds, setAvailableQuestionIds] = useState([]);
  const [publishConfirm, setPublishConfirm] = useState({ open: false, isCurrentlyPublished: false });
  const [materialsList, setMaterialsList] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchExamAndSubmissions(1);
  }, [examId]);

  // Silent polling helper
  const pollSubmissionsStatus = async (page = currentPage) => {
    try {
      const studentRes = await evaluationAPI.getAppearedStudents(examId, { page, limit });
      if (studentRes.data.success) {
        setStudents(studentRes.data.students || []);
        setTotalStudents(studentRes.data.totalCount || 0);
      }
      const resultRes = await evaluationAPI.getResultOverview(examId, { page: 1, limit: 10000 });
      if (resultRes.data.success) {
        setResults(resultRes.data.results || []);
      }
    } catch (err) {
      console.error("Silent polling failed:", err);
    }
  };

  // Background polling effect if there is any 'Evaluating' status
  useEffect(() => {
    const hasEvaluating = students.some(student => {
      const result = results.find(r => r.student?._id === student._id);
      return result?.status === 'Evaluating';
    });

    if (!hasEvaluating) return;

    const interval = setInterval(() => {
      pollSubmissionsStatus(currentPage);
    }, 5000);

    return () => clearInterval(interval);
  }, [students, results, currentPage]);

  const fetchMaterials = async () => {
    setMaterialsLoading(true);
    try {
      const res = await evaluationAPI.getMaterials(examId);
      if (res.data.success) {
        setMaterialsList(res.data.materials || []);
      }
    } catch (err) {
      console.error("Failed to load materials:", err);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const fetchExamAndSubmissions = async (page = 1) => {
    setLoading(true);
    try {
      // 1. Fetch Exam Meta
      const examRes = await timetableAPI.getExamById(examId);
      const fetchedExam = examRes.data.exam;
      setExam(fetchedExam);

      // 2. Fetch Appeared Students
      const studentRes = await evaluationAPI.getAppearedStudents(examId, { page, limit });
      setStudents(studentRes.data.students || []);
      setTotalStudents(studentRes.data.totalCount || 0);
      setCurrentPage(studentRes.data.page || page);

      // 3. Fetch Grading Results
      const resultRes = await evaluationAPI.getResultOverview(examId, { page: 1, limit: 10000 });
      setResults(resultRes.data.results || []);

      // Fetch materials
      fetchMaterials();

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

  const handleTogglePublishResults = () => {
    if (!exam) return;
    setPublishConfirm({ open: true, isCurrentlyPublished: exam.resultsPublished === true });
  };

  const confirmTogglePublish = async () => {
    const isCurrentlyPublished = publishConfirm.isCurrentlyPublished;
    const action = isCurrentlyPublished ? "unpublish" : "publish";
    setPublishConfirm({ open: false, isCurrentlyPublished: false });
    try {
      toast(`${isCurrentlyPublished ? 'Unpublishing' : 'Publishing'} results...`, 'info');
      const res = await evaluationAPI.publishResults(examId, !isCurrentlyPublished);
      if (res.data.success) {
        toast(res.data.message || `Results ${isCurrentlyPublished ? 'unpublished' : 'published'} successfully!`, 'success');
        setExam(prev => ({
          ...prev,
          resultsPublished: res.data.resultsPublished
        }));
      }
    } catch (err) {
      toast(err.response?.data?.message || `Failed to ${action} results.`, 'error');
    }
  };



  const handleUploadMaterials = async (e) => {
    e.preventDefault();
    if (!materialsFile) {
      toast("Please select a file.", "warning");
      return;
    }

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedDocTypes = ['application/pdf'];

    const isAnswerKeyOrRubric = materialsFileType === 'answer_key' || materialsFileType === 'rubric';

    if (!isAnswerKeyOrRubric && !allowedDocTypes.includes(materialsFile.type)) {
      toast("Invalid file type. Please upload a PDF.", "error");
      return;
    }
    if (isAnswerKeyOrRubric && !allowedImageTypes.concat(allowedDocTypes).includes(materialsFile.type)) {
      toast("Invalid file type. Please upload a PDF or an Image (JPEG/PNG/WEBP).", "error");
      return;
    }

    if (isAnswerKeyOrRubric && materialsScope === 'question' && !materialsSelectedQuestionId) {
      toast("Please select a question ID.", "warning");
      return;
    }

    setUploadingMaterials(true);
    try {
      toast("Requesting upload credentials...", "info");
      const authRes = await apiClient.get('/imagekit/auth?uploadType=materials');
      const { token, expire, signature, publicKey, folder } = authRes.data;

      toast("Uploading file directly to storage...", "info");
      const ikFormData = new FormData();
      ikFormData.append("file", materialsFile);
      ikFormData.append("fileName", materialsFile.name);
      ikFormData.append("publicKey", publicKey);
      ikFormData.append("signature", signature);
      ikFormData.append("expire", expire);
      ikFormData.append("token", token);
      ikFormData.append("folder", folder);

      const ikUploadRes = await axios.post("https://upload.imagekit.io/api/v1/files/upload", ikFormData);
      if (!ikUploadRes.data || !ikUploadRes.data.url) {
        throw new Error("Direct upload failed.");
      }

      const fileUrl = ikUploadRes.data.url;

      toast("Vectorizing materials with AI...", "info");
      const payload = {
        fileUrl,
        contentType: materialsFileType,
        imageKitFileId: ikUploadRes.data.fileId,
        title: materialsFile.name,
        replaceMaterialId: replaceMaterialId
      };
      
      if (isAnswerKeyOrRubric) {
        if (replaceMaterialId) {
          const original = materialsList.find(m => m._id === replaceMaterialId);
          payload.scope = original?.scope || 'entire_exam';
          payload.questionId = original?.questionId || null;
        } else {
          payload.scope = materialsScope;
          payload.questionId = materialsScope === 'question' ? materialsSelectedQuestionId : null;
        }
      }

      const res = await evaluationAPI.uploadMaterials(examId, payload);
      if (res.data.success) {
        toast("Materials vectorized successfully!", "success");
        setIsMaterialsModalOpen(false);
        setMaterialsFile(null);
        setReplaceMaterialId(null);
        fetchMaterials();
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

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm("Are you sure you want to delete this teaching material? This will delete the document from storage and all vectorized chunks from the AI database.")) {
      return;
    }
    toast("Deleting reference material...", "info");
    try {
      const res = await evaluationAPI.deleteMaterial(examId, materialId);
      if (res.data.success) {
        toast("Material deleted successfully!", "success");
        fetchMaterials();
      } else {
        toast(res.data.message || "Failed to delete material.", "error");
      }
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || "Failed to delete material.", "error");
    }
  };

  const handleReplaceMaterialInit = (material) => {
    setReplaceMaterialId(material._id);
    setMaterialsFileType(material.materialType);
    if (material.questionId) {
      setMaterialsSelectedQuestionId(material.questionId);
      setMaterialsScope('question');
    } else {
      setMaterialsScope(material.scope || 'entire_exam');
    }
    setMaterialsFile(null);
    setIsMaterialsModalOpen(true);
  };

  const handleViewHistory = async (material) => {
    setHistoryMaterialTitle(material.title);
    setHistoryList([]);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await evaluationAPI.getMaterialHistory(examId, material._id);
      if (res.data.success) {
        setHistoryList(res.data.history || []);
      }
    } catch (err) {
      toast("Failed to load version history.", "error");
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTriggerAI = async (studentId) => {
    // Prevent duplicate evaluation triggers
    const currentResult = results.find(r => r.student?._id === studentId);
    if (currentResult?.status === 'Evaluating') {
      toast('AI evaluation is already in progress.', 'warning');
      return;
    }

    setActionLoading(prev => ({ ...prev, [studentId]: true }));
    toast('Queueing AI evaluation in the background...', 'info');
    try {
      const res = await evaluationAPI.triggerAIEvaluation(examId, studentId);
      if (res.data.success) {
        toast('AI evaluation queued. Monitoring status in the background...', 'success');
        
        // Instantly update local result status to 'Evaluating' so UI reflects it immediately
        setResults(prevResults => {
          const updated = [...prevResults];
          const idx = updated.findIndex(r => r.student?._id === studentId);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], status: 'Evaluating' };
          } else {
            updated.push({ student: { _id: studentId }, status: 'Evaluating', evaluations: [] });
          }
          return updated;
        });

        // Trigger poll immediately
        pollSubmissionsStatus(currentPage);
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
      return !result || (result.status !== 'Evaluating' && result.status !== 'Completed');
    });

    if (pendingStudents.length === 0) {
      toast('No pending evaluations found!', 'warning');
      return;
    }

    toast(`Queueing evaluations for ${pendingStudents.length} students concurrently...`, 'info');
    
    // Concurrently trigger all AI evaluations
    const promises = pendingStudents.map(student => handleTriggerAI(student._id));
    await Promise.all(promises);
  };

  const renderMaterialCard = (item) => {
    let statusBg = 'var(--warning-dim)';
    let statusColor = 'var(--warning)';
    if (item.status === 'active') {
      statusBg = 'var(--success-dim)';
      statusColor = 'var(--success)';
    } else if (item.status === 'failed') {
      statusBg = 'var(--danger-dim)';
      statusColor = 'var(--danger)';
    }

    return (
      <div 
        key={item._id} 
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-2)',
          borderRadius: '10px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{
              background: statusBg,
              color: statusColor,
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase'
            }}>
              {item.status}
            </span>
            <div style={{ display: 'flex', gap: '6px', fontSize: '0.75rem', color: 'var(--text-3)' }}>
              <span>Ver: {item.version}</span>
              {item.chunkCount !== undefined && (
                <>
                  <span>·</span>
                  <span>Chunks: {item.chunkCount}</span>
                </>
              )}
            </div>
          </div>
          <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-1)', lineBreak: 'anywhere' }}>
            {item.title}
          </h5>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-3)' }}>
            Uploaded on {new Date(item.uploadedAt || item.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border-2)', paddingTop: '8px' }}>
          <a 
            href={item.imageKitUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.ghostBtn}
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: '5px 0',
              fontSize: '0.75rem',
              textDecoration: 'none',
              textAlign: 'center'
            }}
          >
            View
          </a>
          <button 
            onClick={() => handleReplaceMaterialInit(item)}
            className={styles.ghostBtn}
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: '5px 0',
              fontSize: '0.75rem'
            }}
          >
            Replace
          </button>
          <button 
            onClick={() => handleViewHistory(item)}
            className={styles.ghostBtn}
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: '5px 0',
              fontSize: '0.75rem'
            }}
          >
            History
          </button>
          <button 
            onClick={() => handleDeleteMaterial(item._id)}
            className={styles.dangerBtn}
            style={{
              padding: '5px 8px',
              fontSize: '0.75rem'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  const renderMaterialCategory = (title, description, items) => {
    const totalFiles = items.length;
    const totalChunks = items.reduce((sum, item) => sum + (item.chunkCount || 0), 0);
    const lastUpdated = items.length > 0 
      ? new Date(Math.max(...items.map(item => new Date(item.uploadedAt || item.createdAt)))).toLocaleDateString()
      : 'N/A';

    return (
      <div style={{ borderBottom: '1px solid var(--border-2)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}>{title}</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-3)' }}>{description}</p>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', background: 'var(--surface-3)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-2)', display: 'flex', gap: '12px' }}>
            <span>Files: <strong>{totalFiles}</strong></span>
            <span>Chunks: <strong>{totalChunks}</strong></span>
            <span>Last Updated: <strong>{lastUpdated}</strong></span>
          </div>
        </div>

        {items.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', marginTop: '12px' }}>
            {items.map(item => renderMaterialCard(item))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-3)', fontStyle: 'italic', paddingLeft: '8px' }}>
            No active materials in this category.
          </p>
        )}
      </div>
    );
  };

  const renderAnswerKeysCategory = (title, description, items) => {
    const entireExamKeys = items.filter(m => m.scope !== 'question' || !m.questionId);
    const questionKeys = items.filter(m => m.scope === 'question' && m.questionId);

    const totalFiles = items.length;
    const totalChunks = items.reduce((sum, item) => sum + (item.chunkCount || 0), 0);
    const lastUpdated = items.length > 0 
      ? new Date(Math.max(...items.map(item => new Date(item.uploadedAt || item.createdAt)))).toLocaleDateString()
      : 'N/A';

    return (
      <div style={{ paddingBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}>{title}</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-3)' }}>{description}</p>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', background: 'var(--surface-3)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-2)', display: 'flex', gap: '12px' }}>
            <span>Files: <strong>{totalFiles}</strong></span>
            <span>Chunks: <strong>{totalChunks}</strong></span>
            <span>Last Updated: <strong>{lastUpdated}</strong></span>
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <h5 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Course-Wide Answer Key
          </h5>
          {entireExamKeys.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-3)', fontStyle: 'italic', paddingLeft: '8px' }}>
              No course-wide answer keys active.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', paddingLeft: '8px' }}>
              {entireExamKeys.map(item => renderMaterialCard(item))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px' }}>
          <h5 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Question-Specific Answer Keys
          </h5>
          {questionKeys.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-3)', fontStyle: 'italic', paddingLeft: '8px' }}>
              No question-specific answer keys active.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', paddingLeft: '8px' }}>
              {questionKeys.map(item => (
                <div key={item._id} style={{ position: 'relative', marginTop: '6px' }}>
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '10px',
                    background: '#7c3aed',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    zIndex: 1,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                  }}>
                    Question {item.questionId}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    {renderMaterialCard(item)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
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
            color: 'var(--text-2)',
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
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button 
              className={styles.primaryBtn} 
              onClick={handleTogglePublishResults}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: exam.resultsPublished ? 'var(--success)' : 'var(--primary)',
                border: 'none',
              }}
            >
              <FileCheck2 size={14} /> 
              {exam.resultsPublished ? 'Results Published' : 'Publish Results'}
            </button>

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

      {/* Redesigned Knowledge Base & Grading Materials Dashboard */}
      <div className={styles.card} style={{ marginBottom: 24 }}>
        <div className={styles.cardHeader} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className={styles.cardHeaderLeft} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen className={styles.cardHeaderIcon} size={18} />
            <h3 className={styles.cardTitle}>Knowledge Base and Grading Materials</h3>
          </div>
          <button 
            className={styles.primaryBtn} 
            onClick={() => {
              setReplaceMaterialId(null);
              setMaterialsFileType('notes');
              setMaterialsScope('entire_exam');
              setMaterialsFile(null);
              setIsMaterialsModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#7c3aed',
              fontSize: '13px'
            }}
          >
            <Upload size={14} /> Add Material
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {materialsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <div className={styles.spinner} />
            </div>
          ) : materialsList.length === 0 ? (
            <div className={styles.emptyCenter} style={{ padding: '40px 20px' }}>
              <FileText size={36} color="#94a3b8" style={{ opacity: 0.6 }} />
              <p className={styles.emptyText} style={{ marginTop: 8 }}>No teaching reference materials active for this course or exam.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {renderMaterialCategory(
                "Lecture Notes and Study Material",
                "Used as supporting reference during grading",
                materialsList.filter(m => m.materialType === 'notes')
              )}

              {renderMaterialCategory(
                "Syllabus and Course Outline",
                "Defines official course scope and learning objectives",
                materialsList.filter(m => m.materialType === 'syllabus')
              )}

              {renderMaterialCategory(
                "Rubrics and Marking Guidelines",
                "Controls marking criteria and scoring expectations",
                materialsList.filter(m => m.materialType === 'rubric')
              )}

              {renderAnswerKeysCategory(
                "Answer Keys",
                "Primary source of truth for evaluation",
                materialsList.filter(m => m.materialType === 'answer_key')
              )}
            </div>
          )}
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
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-1)', color: 'var(--text-3)', fontSize: '13px', fontWeight: 600 }}>
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
                  const isFailed = result?.status === 'Failed';
                  const isUncertain = result?.status === 'Uncertain';
                  
                  let statusLabel = 'Not Evaluated';
                  let statusBg = 'var(--surface-3)';
                  let statusColor = 'var(--text-2)';
                  
                  if (isEvaluating) {
                    statusLabel = 'Evaluating';
                    statusBg = 'var(--warning-dim)';
                    statusColor = 'var(--warning)';
                  } else if (isCompleted) {
                    statusLabel = 'Completed';
                    statusBg = 'var(--success-dim)';
                    statusColor = 'var(--success)';
                  } else if (isUncertain) {
                    statusLabel = 'Review Required';
                    statusBg = 'rgba(245, 158, 11, 0.12)';
                    statusColor = 'var(--warning)';
                  } else if (isFailed) {
                    const hasOCRFailed = result?.evaluations?.some(ev => ev.aiReasoning?.startsWith('OCR_FAILED:'));
                    statusLabel = hasOCRFailed ? 'OCR Failed' : 'Evaluation Failed';
                    statusBg = 'var(--danger-dim)';
                    statusColor = 'var(--danger)';
                  }

                  const marks = (isCompleted || isUncertain) ? `${result.totalMarksObtained} / ${exam?.maxMarks || 30}` : '-';
                  const isPendingAI = actionLoading[student._id];

                  return (
                    <tr key={student._id} style={{ borderBottom: '1px solid var(--border-2)', fontSize: '14px', color: 'var(--text-1)' }}>
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
                            disabled={isPendingAI || isEvaluating}
                            style={{
                              background: (isCompleted || isUncertain) ? 'var(--surface-3)' : 'var(--primary)',
                              color: (isCompleted || isUncertain) ? 'var(--text-2)' : 'white',
                              border: (isCompleted || isUncertain) ? '1px solid var(--border-2)' : 'none',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Cpu size={14} /> 
                            {isPendingAI || isEvaluating ? 'Evaluating...' : (isCompleted || isUncertain) ? 'Re-evaluate' : isFailed ? 'Retry AI' : 'AI Grade'}
                          </button>
                          
                          {(isCompleted || isFailed || isUncertain) && (
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
            
            {totalStudents > limit && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '10px 8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>
                  Showing {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalStudents)} of {totalStudents} appeared students
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (currentPage > 1) {
                        const prevPage = currentPage - 1;
                        setCurrentPage(prevPage);
                        fetchExamAndSubmissions(prevPage);
                      }
                    }}
                    disabled={currentPage === 1}
                    className={styles.ghostBtn}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    Previous
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 600, color: 'var(--text-1)' }}>
                    Page {currentPage} of {Math.ceil(totalStudents / limit)}
                  </span>
                  <button
                    onClick={() => {
                      if (currentPage < Math.ceil(totalStudents / limit)) {
                        const nextPage = currentPage + 1;
                        setCurrentPage(nextPage);
                        fetchExamAndSubmissions(nextPage);
                      }
                    }}
                    disabled={currentPage === Math.ceil(totalStudents / limit)}
                    className={styles.ghostBtn}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
          )}
        </div>
      </div>

      {/* -- Teaching Materials Upload/Replace Modal -- */}
      <Modal
        isOpen={isMaterialsModalOpen}
        onClose={() => !uploadingMaterials && setIsMaterialsModalOpen(false)}
        title={replaceMaterialId ? "Replace Teaching Material" : "Upload Teaching Materials"}
      >
        <form onSubmit={handleUploadMaterials} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 5px' }}>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
            Upload course notes, syllabi, rubrics, or specific answer keys. The AI agent will automatically chunk and vectorize the document to use as reference material when grading.
          </p>

          {replaceMaterialId && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '6px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              fontSize: '0.82rem',
              color: 'var(--text-1)',
              lineHeight: 1.4
            }}>
              Replacing: <strong>{materialsList.find(m => m._id === replaceMaterialId)?.title}</strong> (Version {materialsList.find(m => m._id === replaceMaterialId)?.version})
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className={styles.modalLabel}>Material Type</label>
            <select
              className={styles.modalInput}
              value={materialsFileType}
              onChange={(e) => setMaterialsFileType(e.target.value)}
              style={{ cursor: 'pointer' }}
              disabled={!!replaceMaterialId}
            >
              <option value="notes">Lecture Notes and Study Material</option>
              <option value="syllabus">Syllabus and Course Outline</option>
              <option value="rubric">Rubric and Marking Guidelines</option>
              <option value="answer_key">Official Question Answer Key (Required for AI Grading)</option>
            </select>
          </div>

          {/* Dynamic Helper Text Box (Emoji-free) */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            background: 'var(--surface-3)',
            border: '1px solid var(--border-2)',
            fontSize: '0.82rem',
            color: 'var(--text-2)',
            lineHeight: 1.4,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            marginTop: '-8px'
          }}>
            {materialsFileType === 'notes' && (
              <>
                <strong style={{ color: 'var(--text-1)' }}>Lecture Notes and Study Material</strong>
                <span>Upload lecture notes, slides, or study materials. AI uses these as supporting context during grading to understand terminology and concepts.</span>
              </>
            )}
            {materialsFileType === 'syllabus' && (
              <>
                <strong style={{ color: 'var(--text-1)' }}>Syllabus and Course Outline</strong>
                <span>Upload syllabus documents or course structures. AI uses this to verify the overall academic scope and course context.</span>
              </>
            )}
            {materialsFileType === 'rubric' && (
              <>
                <strong style={{ color: 'var(--text-1)' }}>Rubric and Marking Guidelines</strong>
                <span>Upload specific grading criteria or grading guidelines. AI uses this to align its scores and feedback format with course standards.</span>
              </>
            )}
            {materialsFileType === 'answer_key' && (
              <>
                <strong style={{ color: 'var(--text-1)' }}>Official Question Answer Key</strong>
                <span>Upload the official correct answer/exemplar for the selected question ID. This acts as the primary grading reference for the AI evaluator.</span>
              </>
            )}
          </div>

          {(materialsFileType === 'answer_key' || materialsFileType === 'rubric') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className={styles.modalLabel}>Scope</label>
              <select
                className={styles.modalInput}
                value={materialsScope}
                onChange={(e) => setMaterialsScope(e.target.value)}
                style={{ cursor: 'pointer' }}
                disabled={!!replaceMaterialId}
              >
                <option value="entire_exam">Entire Exam</option>
                <option value="question">Specific Question</option>
              </select>
            </div>
          )}

          {(materialsFileType === 'answer_key' || materialsFileType === 'rubric') && materialsScope === 'question' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
              <label className={styles.modalLabel}>Select Question ID</label>
              {availableQuestionIds.length === 0 ? (
                <div style={{ color: 'var(--warning)', fontSize: '0.85rem', padding: '8px 12px', background: 'var(--warning-dim)', borderRadius: '6px', border: '1px solid var(--border-2)' }}>
                  No questions found. Make sure the question paper has been approved.
                </div>
              ) : (
                <select
                  className={styles.modalInput}
                  value={materialsSelectedQuestionId}
                  onChange={(e) => setMaterialsSelectedQuestionId(e.target.value)}
                  style={{ cursor: 'pointer' }}
                  disabled={!!replaceMaterialId}
                >
                  {availableQuestionIds.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className={styles.modalLabel}>
              {(materialsFileType === 'answer_key' || materialsFileType === 'rubric') ? 'Upload Document (PDF / Image)' : 'Upload Document (PDF)'}
            </label>
            <div style={{
              border: '2px dashed var(--border-2)',
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
              if (!file) return;
              const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
              const allowedDocTypes = ['application/pdf'];
              const isAnswerKeyOrRubric = materialsFileType === 'answer_key' || materialsFileType === 'rubric';
              const isAllowed = isAnswerKeyOrRubric
                ? allowedImageTypes.concat(allowedDocTypes).includes(file.type)
                : allowedDocTypes.includes(file.type);

              if (isAllowed) {
                setMaterialsFile(file);
              } else {
                const msg = isAnswerKeyOrRubric
                  ? "Please drop a valid PDF or Image (JPEG/PNG/WEBP)."
                  : "Please drop a valid PDF file.";
                toast(msg, "error");
              }
            }}
            >
              <input
                type="file"
                accept={(materialsFileType === 'answer_key' || materialsFileType === 'rubric') ? "application/pdf,image/jpeg,image/png,image/webp" : "application/pdf"}
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
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>
                    {materialsFile ? materialsFile.name : 'Choose a file or drag it here'}
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {materialsFile
                      ? `Size: ${(materialsFile.size / 1024 / 1024).toFixed(2)} MB`
                      : (materialsFileType === 'answer_key' || materialsFileType === 'rubric')
                        ? 'PDF or Image (JPEG/PNG/WEBP) up to 10MB'
                        : 'PDF files up to 10MB'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => {
                setIsMaterialsModalOpen(false);
                setReplaceMaterialId(null);
              }}
              disabled={uploadingMaterials}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={uploadingMaterials || !materialsFile || ((materialsFileType === 'answer_key' || materialsFileType === 'rubric') && materialsScope === 'question' && availableQuestionIds.length === 0)}
              style={{ background: 'linear-gradient(135deg, var(--primary), #7c3aed)' }}
            >
              {uploadingMaterials ? 'Uploading...' : replaceMaterialId ? 'Replace and Process' : 'Upload and Process'}
            </button>
          </div>
        </form>
      </Modal>

      {/* -- Version History Modal (Emoji-free) -- */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Version History: ${historyMaterialTitle}`}
      >
        <div style={{ padding: '10px 5px' }}>
          {historyLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <div className={styles.spinner} />
            </div>
          ) : historyList.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', textAlign: 'center' }}>No version history found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {historyList.map((h) => (
                <div 
                  key={h._id} 
                  style={{
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-2)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--text-1)'
                      }}>
                        Version {h.version}
                      </span>
                      {h.isActiveVersion && (
                        <span style={{
                          background: 'var(--success-dim)',
                          color: 'var(--success)',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          textTransform: 'uppercase'
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-2)', lineBreak: 'anywhere' }}>
                      File: {h.title}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      Uploaded by {h.uploadedBy?.name || 'Faculty'} on {new Date(h.uploadedAt || h.createdAt).toLocaleString()}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      Chunks: {h.chunkCount || 0} | Status: {h.status}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <a 
                      href={h.imageKitUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.ghostBtn}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        textDecoration: 'none',
                        textAlign: 'center'
                      }}
                    >
                      View File
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* -- Publish/Unpublish Results Confirmation Modal -- */}
      <Modal
        isOpen={publishConfirm.open}
        onClose={() => setPublishConfirm({ open: false, isCurrentlyPublished: false })}
        title={publishConfirm.isCurrentlyPublished ? "Unpublish Results" : "Publish Results"}
        size="sm"
        footer={
          <>
            <button
              style={{ padding: '9px 20px', borderRadius: 8, background: 'none', border: '1px solid var(--border-2)', color: 'var(--text-2)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
              onClick={() => setPublishConfirm({ open: false, isCurrentlyPublished: false })}
            >
              Cancel
            </button>
            <button
              style={{ padding: '9px 20px', borderRadius: 8, background: publishConfirm.isCurrentlyPublished ? 'var(--warning)' : 'var(--success)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', boxShadow: publishConfirm.isCurrentlyPublished ? '0 4px 14px rgba(245,158,11,0.3)' : '0 4px 14px rgba(16,185,129,0.3)' }}
              onClick={confirmTogglePublish}
            >
              {publishConfirm.isCurrentlyPublished ? 'Unpublish' : 'Publish'}
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-2)', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Are you sure you want to {publishConfirm.isCurrentlyPublished ? 'unpublish' : 'publish'} the results for this exam?
          Students will {publishConfirm.isCurrentlyPublished ? 'no longer' : 'now'} be able to view their scores and feedback.
        </p>
      </Modal>

    </div>
  );
};

export default ExamGrading;
