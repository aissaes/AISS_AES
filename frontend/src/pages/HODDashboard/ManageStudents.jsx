import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Users, FileText, Plus, Upload, Search, MoreVertical, Edit2, Trash2, Eye, XCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '../../components/Toast/Toast';
import { hodAPI } from '../../api/client';
import Modal from '../../components/Modal/Modal';
import styles from './HODDashboard.module.css';

const ManageStudents = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState({ open: false, id: null, name: '' });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form Data
  const initialForm = { name: '', email: '', rollNumber: '', department: '', semester: '', year: '' };
  const [formData, setFormData] = useState(initialForm);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // CSV
  const fileInputRef = useRef(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvFile, setCsvFile] = useState(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await hodAPI.getStudents();
      setStudents(Array.isArray(data.students) ? data.students : []);
    } catch (err) {
      toast('Error loading students.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Add Student
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await hodAPI.addStudent(formData);
      toast('Student added successfully!', 'success');
      setIsAddOpen(false);
      setFormData(initialForm);
      fetchStudents();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add student.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Student
  const openEdit = (student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      rollNumber: student.rollNumber || '',
      department: student.department || '',
      semester: student.semester || '',
      year: student.year || ''
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await hodAPI.updateStudent(selectedStudent._id, formData);
      toast('Student updated successfully!', 'success');
      setIsEditOpen(false);
      setSelectedStudent(null);
      setFormData(initialForm);
      setStudents(prev => prev.map(s => s._id === selectedStudent._id ? { ...s, ...formData } : s));
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update student.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // View Student
  const openView = (student) => {
    setSelectedStudent(student);
    setIsViewOpen(true);
  };

  // Delete Student
  const confirmDelete = async () => {
    setActionLoading(true);
    try {
      await hodAPI.deleteStudent(isDeleteOpen.id);
      toast('Student deleted.', 'success');
      setStudents(prev => prev.filter(s => s._id !== isDeleteOpen.id));
      setIsDeleteOpen({ open: false, id: null, name: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete student.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle CSV Selection and Parse
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').filter(row => row.trim() !== '');
      if (rows.length < 2) {
        toast('CSV is empty or missing data rows.', 'warning');
        return;
      }

      // Basic standard parsing assuming comma separated and no internal commas
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      
      const parsedData = [];
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(',').map(v => v.trim());
        const rowObj = {};
        headers.forEach((h, index) => {
          rowObj[h] = values[index] || '';
        });
        parsedData.push(rowObj);
      }
      setCsvPreview(parsedData);
    };
    reader.readAsText(file);
  };

  // Upload CSV
  const handleCsvUpload = async () => {
    if (csvPreview.length === 0) {
      toast('No valid data found in CSV.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await hodAPI.bulkUploadStudents({ students: csvPreview });
      toast(`Successfully uploaded ${csvPreview.length} students!`, 'success');
      setIsUploadOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      fetchStudents();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to upload students.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const closeUploadModal = () => {
    if (actionLoading) return;
    setIsUploadOpen(false);
    setCsvFile(null);
    setCsvPreview([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Manage Students</h2>
          <p className={styles.pageSub}>View and manage students in your department</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={styles.refreshBtn} onClick={fetchStudents} disabled={loading}>
            <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
          </button>
          <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={() => { setFormData(initialForm); setIsAddOpen(true); }}>
            <Plus size={15} /> Add Student
          </button>
          <button className={styles.actionBtn} onClick={() => setIsUploadOpen(true)} style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-light)', borderColor: 'rgba(99,102,241,0.3)' }}>
            <Upload size={15} /> Upload CSV
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Users size={17} className={styles.cardHeaderIcon} />
            <h3 className={styles.cardTitle}>Student Directory</h3>
          </div>
        </div>
        {loading ? (
          <div className={styles.tableLoader}><div className={styles.spinner} /></div>
        ) : students.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🎓</span>
            <p className={styles.emptyText}>No students found in your department.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roll Number</th>
                  <th>Email</th>
                  <th>Semester/Year</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.miniAvatar}>{(s.name || 'S')[0].toUpperCase()}</div>
                        {s.name}
                      </div>
                    </td>
                    <td className={styles.mutedCell}>{s.rollNumber}</td>
                    <td className={styles.mutedCell}>{s.email}</td>
                    <td className={styles.mutedCell}>{s.semester ? `Sem ${s.semester}` : '-'} / {s.year ? `Yr ${s.year}` : '-'}</td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button className={styles.actionBtn} onClick={() => openView(s)} title="View"><Eye size={13} /></button>
                        <button className={styles.actionBtn} onClick={() => openEdit(s)} title="Edit"><Edit2 size={13} /></button>
                        <button className={`${styles.actionBtn} ${styles.rejectBtn}`} onClick={() => setIsDeleteOpen({ open: true, id: s._id, name: s.name })} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      <Modal isOpen={isAddOpen} onClose={() => !actionLoading && setIsAddOpen(false)} title="Add New Student" footer={
        <>
          <button className={styles.cancelModalBtn} type="button" onClick={() => setIsAddOpen(false)} disabled={actionLoading}>Cancel</button>
          <button className={styles.successModalBtn} type="submit" form="addStudentForm" disabled={actionLoading}>{actionLoading ? 'Adding...' : 'Add Student'}</button>
        </>
      }>
        <form id="addStudentForm" onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className={styles.formRow}>
            <label>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input required type="text" name="name" className={styles.formInput} value={formData.name} onChange={handleChange} placeholder="e.g. John Doe" disabled={actionLoading} />
          </div>
          <div className={styles.formRow}>
            <label>Roll Number <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input required type="text" name="rollNumber" className={styles.formInput} value={formData.rollNumber} onChange={handleChange} placeholder="e.g. CS2023001" disabled={actionLoading} />
          </div>
          <div className={styles.formRow}>
            <label>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input required type="email" name="email" className={styles.formInput} value={formData.email} onChange={handleChange} placeholder="e.g. john@example.com" disabled={actionLoading} />
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className={styles.formRow} style={{ flex: 1 }}>
              <label>Semester</label>
              <input type="number" name="semester" className={styles.formInput} value={formData.semester} onChange={handleChange} placeholder="e.g. 5" disabled={actionLoading} />
            </div>
            <div className={styles.formRow} style={{ flex: 1 }}>
              <label>Year</label>
              <input type="number" name="year" className={styles.formInput} value={formData.year} onChange={handleChange} placeholder="e.g. 3" disabled={actionLoading} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal isOpen={isEditOpen} onClose={() => !actionLoading && setIsEditOpen(false)} title="Edit Student" footer={
        <>
          <button className={styles.cancelModalBtn} type="button" onClick={() => setIsEditOpen(false)} disabled={actionLoading}>Cancel</button>
          <button className={styles.successModalBtn} type="submit" form="editStudentForm" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save Changes'}</button>
        </>
      }>
        <form id="editStudentForm" onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className={styles.formRow}>
            <label>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input required type="text" name="name" className={styles.formInput} value={formData.name} onChange={handleChange} disabled={actionLoading} />
          </div>
          <div className={styles.formRow}>
            <label>Roll Number <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input required type="text" name="rollNumber" className={styles.formInput} value={formData.rollNumber} onChange={handleChange} disabled={actionLoading} />
          </div>
          <div className={styles.formRow}>
            <label>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input required type="email" name="email" className={styles.formInput} value={formData.email} onChange={handleChange} disabled={actionLoading} />
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className={styles.formRow} style={{ flex: 1 }}>
              <label>Semester</label>
              <input type="number" name="semester" className={styles.formInput} value={formData.semester} onChange={handleChange} disabled={actionLoading} />
            </div>
            <div className={styles.formRow} style={{ flex: 1 }}>
              <label>Year</label>
              <input type="number" name="year" className={styles.formInput} value={formData.year} onChange={handleChange} disabled={actionLoading} />
            </div>
          </div>
        </form>
      </Modal>

      {/* View Student Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Student Details" footer={
        <button className={styles.cancelModalBtn} onClick={() => setIsViewOpen(false)}>Close</button>
      }>
        {selectedStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--border-base)' }}>
              <div className={styles.miniAvatar} style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                {(selectedStudent.name || 'S')[0].toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-1)', fontSize: '1.2rem' }}>{selectedStudent.name}</h3>
                <p style={{ margin: '2px 0 0', color: 'var(--text-3)', fontSize: '0.85rem' }}>{selectedStudent.rollNumber}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)' }}>Email</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: 'var(--text-2)' }}>{selectedStudent.email}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)' }}>Department</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: 'var(--text-2)' }}>{selectedStudent.department || '-'}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)' }}>Semester</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: 'var(--text-2)' }}>{selectedStudent.semester || '-'}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)' }}>Year</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: 'var(--text-2)' }}>{selectedStudent.year || '-'}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen.open} onClose={() => !actionLoading && setIsDeleteOpen({ open: false, id: null, name: '' })} title="Delete Student" footer={
        <>
          <button className={styles.cancelModalBtn} onClick={() => setIsDeleteOpen({ open: false, id: null, name: '' })} disabled={actionLoading}>Cancel</button>
          <button className={styles.dangerModalBtn} onClick={confirmDelete} disabled={actionLoading}>{actionLoading ? 'Deleting...' : 'Yes, Delete'}</button>
        </>
      }>
        <div className={styles.modalAlertDanger}>
          <AlertTriangle size={16} />
          <div>
            <strong>Are you sure?</strong>
            <p style={{ marginTop: '4px', fontWeight: 400 }}>You are about to permanently delete <strong>{isDeleteOpen.name}</strong>. This action cannot be undone.</p>
          </div>
        </div>
      </Modal>

      {/* Upload CSV Modal */}
      <Modal className={csvPreview.length > 0 ? styles.wideModal : ''} isOpen={isUploadOpen} onClose={closeUploadModal} title="Bulk Upload Students" footer={
        <>
          <button className={styles.cancelModalBtn} onClick={closeUploadModal} disabled={actionLoading}>Cancel</button>
          {csvPreview.length > 0 && <button className={styles.successModalBtn} onClick={handleCsvUpload} disabled={actionLoading}>{actionLoading ? 'Uploading...' : `Upload ${csvPreview.length} Students`}</button>}
        </>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className={styles.modalAlertWarn}>
            <FileText size={16} />
            <div>
              <strong>CSV Format Requirements:</strong>
              <p style={{ marginTop: '4px', fontWeight: 400 }}>Ensure the first row is standard headers: <code>name, email, rollnumber, semester</code> (department is auto-set by backend). No internal commas within data fields.</p>
            </div>
          </div>
          
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-base)', color: 'var(--text-1)' }} disabled={actionLoading} />

          {csvPreview.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-1)', fontSize: '0.95rem' }}>Preview ({csvPreview.length} records)</h4>
                <button className={styles.actionBtn} onClick={() => { setCsvPreview([]); setCsvFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} disabled={actionLoading}><RefreshCw size={13} /> Clear</button>
              </div>
              <div className={styles.tableWrap} style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-base)', borderRadius: '8px' }}>
                <table className={styles.table} style={{ margin: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#111827' }}>
                    <tr>
                      {Object.keys(csvPreview[0] || {}).map((header, i) => (
                        <th key={i}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} className={styles.mutedCell}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvPreview.length > 10 && <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', textAlign: 'center', marginTop: '10px' }}>Showing first 10 rows</p>}
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
};

export default ManageStudents;
