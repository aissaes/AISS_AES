import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Home, Settings as SettingsIcon, Users, Database, Shield,
  CheckCircle2, Clock, XCircle, Crown, ArrowRightLeft,
  RefreshCw, AlertTriangle, UserCheck, Search, Building2, Plus, GripVertical, Inbox
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import Modal from '../../components/Modal/Modal';
import Settings from '../Settings/Settings';
import { facultyAPI, collegeAdminAPI, collegeAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast/Toast';
import styles from './CollegeAdminDashboard.module.css';

/* ======================================================
   Departments Tab Component
====================================================== */
const CollegeAdminDepartments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editDeptModal, setEditDeptModal] = useState({ open: false, id: null, name: '', code: '', status: '' });
  const [addDeptModalOpen, setAddDeptModalOpen] = useState(false);
  const [deleteDeptConfirm, setDeleteDeptConfirm] = useState({ open: false, id: null, name: '' });

  const fetchDepartments = useCallback(async () => {
    if (user?.collegeId) {
      const colId = typeof user.collegeId === 'object' ? user.collegeId._id : user.collegeId;
      try {
        const res = await collegeAPI.getDepartments(colId);
        setDepartments(res.data.departments || []);
      } catch (err) {
        toast('Failed to load departments', 'error');
      } finally {
        setLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleAdd = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newDeptName.trim() || !newDeptCode.trim()) return;
    setSaving(true);
    try {
      const res = await collegeAdminAPI.createDepartment({
        name: newDeptName.trim(),
        code: newDeptCode.trim().toUpperCase()
      });
      setDepartments(p => [...p, res.data.department]);
      setNewDeptName('');
      setNewDeptCode('');
      setAddDeptModalOpen(false);
      toast('Department created successfully!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create department', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (dept) => {
    const targetStatus = dept.status === 'Active' ? 'Archived' : 'Active';
    try {
      const res = await collegeAdminAPI.updateDepartment(dept._id, { status: targetStatus });
      setDepartments(p => p.map(d => d._id === dept._id ? res.data.department : d));
      toast(`Department status updated to ${targetStatus}!`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update department', 'error');
    }
  };

  const handleEditSave = async () => {
    if (!editDeptModal.name.trim() || !editDeptModal.code.trim()) return;
    setActionLoading(true);
    try {
      const res = await collegeAdminAPI.updateDepartment(editDeptModal.id, {
        name: editDeptModal.name.trim(),
        code: editDeptModal.code.trim().toUpperCase(),
        status: editDeptModal.status
      });
      setDepartments(p => p.map(d => d._id === editDeptModal.id ? res.data.department : d));
      setEditDeptModal({ open: false, id: null, name: '', code: '', status: '' });
      toast('Department updated successfully!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update department', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (dept) => {
    setDeleteDeptConfirm({ open: true, id: dept._id, name: dept.name });
  };

  const confirmDeleteDept = async () => {
    const { id, name } = deleteDeptConfirm;
    setDeleteDeptConfirm({ open: false, id: null, name: '' });
    try {
      await collegeAdminAPI.deleteDepartment(id);
      setDepartments(p => p.filter(d => d._id !== id));
      toast(`Department '${name}' deleted successfully!`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete department', 'error');
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Manage Departments</h2>
          <p className={styles.pageSub}>Configure academic departments, codes, and active statuses</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Building2 size={17} className={styles.cardHeaderIcon} />
            <h3 className={styles.cardTitle}>Academic Departments</h3>
          </div>
          <button
            className={styles.successModalBtn}
            onClick={() => setAddDeptModalOpen(true)}
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem' }}
          >
            <Plus size={16} /> Add Department
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {loading ? (
             <div className={styles.tableLoader}><div className={styles.spinner} /></div>
          ) : departments.length === 0 ? (
             <Empty text="No departments configured yet." />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Department Name</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept._id}>
                      <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{dept.name}</td>
                      <td><strong>{dept.code}</strong></td>
                      <td>
                        <span className={`${styles.badge} ${dept.status === 'Active' ? styles.badgeSuccess : styles.badgeFaculty}`} style={{ cursor: 'pointer' }} onClick={() => handleToggleStatus(dept)} title="Click to toggle status">
                          {dept.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionBtns} style={{ justifyContent: 'flex-end', gap: '8px' }}>
                          <button className={`${styles.actionBtn} ${styles.hodBtn}`} onClick={() => setEditDeptModal({ open: true, id: dept._id, name: dept.name, code: dept.code, status: dept.status })}>
                            Edit
                          </button>
                          {dept.name !== "Administration" && (
                            <button className={`${styles.actionBtn} ${styles.rejectBtn}`} onClick={() => handleDelete(dept)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Department Modal */}
      <Modal
        isOpen={editDeptModal.open}
        onClose={() => !actionLoading && setEditDeptModal({ open: false, id: null, name: '', code: '', status: '' })}
        title="Edit Department"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setEditDeptModal({ open: false, id: null, name: '', code: '', status: '' })} disabled={actionLoading}>
              Cancel
            </button>
            <button className={styles.successModalBtn} onClick={handleEditSave} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Department Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text"
              className={styles.modalInput}
              value={editDeptModal.name}
              onChange={e => setEditDeptModal(p => ({ ...p, name: e.target.value }))}
              disabled={actionLoading}
              required
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Department Code <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text"
              className={styles.modalInput}
              value={editDeptModal.code}
              onChange={e => setEditDeptModal(p => ({ ...p, code: e.target.value }))}
              disabled={actionLoading}
              required
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Status <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select
              className={styles.modalSelect}
              value={editDeptModal.status}
              onChange={e => setEditDeptModal(p => ({ ...p, status: e.target.value }))}
              disabled={actionLoading}
              style={{ background: 'var(--surface-2)', color: 'var(--text-1)', width: '100%', padding: '10px', border: '1px solid var(--border-2)', borderRadius: '6px' }}
            >
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Add Department Modal */}
      <Modal
        isOpen={addDeptModalOpen}
        onClose={() => !saving && setAddDeptModalOpen(false)}
        title="Add Department"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setAddDeptModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className={styles.successModalBtn} onClick={handleAdd} disabled={saving || !newDeptName.trim() || !newDeptCode.trim()}>
              {saving ? 'Creating...' : 'Create Department'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Department Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text"
              className={styles.modalInput}
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
              placeholder="e.g. Computer Science"
              disabled={saving}
              required
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Department Code <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text"
              className={styles.modalInput}
              value={newDeptCode}
              onChange={e => setNewDeptCode(e.target.value)}
              placeholder="e.g. CSE"
              disabled={saving}
              required
            />
          </div>
        </div>
      </Modal>

      {/* Delete Department Confirmation Modal */}
      <Modal
        isOpen={deleteDeptConfirm.open}
        onClose={() => setDeleteDeptConfirm({ open: false, id: null, name: '' })}
        title="Delete Department"
        size="sm"
        footer={
          <>
            <button
              style={{ padding: '9px 20px', borderRadius: 8, background: 'none', border: '1px solid var(--border-2)', color: 'var(--text-2)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
              onClick={() => setDeleteDeptConfirm({ open: false, id: null, name: '' })}
            >
              Cancel
            </button>
            <button
              style={{ padding: '9px 20px', borderRadius: 8, background: 'var(--danger)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
              onClick={confirmDeleteDept}
            >
              Delete
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-2)', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Are you sure you want to permanently delete the department <strong>"{deleteDeptConfirm.name}"</strong>? This will check for active references first.
        </p>
      </Modal>
    </div>
  );
};

/* ======================================================
   Faculty Roles Tab Component
====================================================== */
const CollegeAdminFaculty = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [allFaculty, setAllFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [makeHODModal, setMakeHODModal] = useState({ open: false, id: null, name: '', dept: '' });
  const [makeHODLoading, setMakeHODLoading] = useState(false);

  const [transferModal, setTransferModal] = useState({ open: false, id: null, name: '' });
  const [newDept, setNewDept] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  const [editFacultyModal, setEditFacultyModal] = useState({ open: false, id: null, name: '', email: '', phone: '', role: '', department: '' });
  const [editFacultyLoading, setEditFacultyLoading] = useState(false);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const res = await collegeAdminAPI.getCollegeFaculty();
      setAllFaculty(Array.isArray(res.data?.faculty) ? res.data.faculty : []);
      if (user?.collegeId) {
        const colId = typeof user.collegeId === 'object' ? user.collegeId._id : user.collegeId;
        const dRes = await collegeAPI.getDepartments(colId);
        setDepartments(dRes.data.departments || []);
      }
    } catch {
      toast('Failed to load faculty list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);

  const confirmMakeHOD = async () => {
    setMakeHODLoading(true);
    try {
      await collegeAdminAPI.makeHOD(makeHODModal.id);
      toast(`${makeHODModal.name} promoted to HOD!`, 'success');
      setMakeHODModal({ open: false, id: null, name: '', dept: '' });
      fetchFaculty();
    } catch (err) {
      toast(err.response?.data?.message || 'Promotion failed.', 'error');
    } finally {
      setMakeHODLoading(false);
    }
  };

  const confirmTransfer = async () => {
    if (!newDept.trim()) { toast('Please enter your new department.', 'warning'); return; }
    setTransferLoading(true);
    try {
      await collegeAdminAPI.transfer(transferModal.id, newDept.trim());
      toast(`Admin role transferred! You have been logged out securely.`, 'success', 5000);
      setTransferModal({ open: false, id: null, name: '' });
      setTimeout(() => window.location.href = '/login', 2500);
    } catch (err) {
      toast(err.response?.data?.message || 'Transfer failed.', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleEditFacultySave = async () => {
    if (!editFacultyModal.name.trim() || !editFacultyModal.email.trim()) {
      toast('Name and Email are required.', 'warning');
      return;
    }
    setEditFacultyLoading(true);
    try {
      await collegeAdminAPI.updateFaculty(editFacultyModal.id, {
        name: editFacultyModal.name.trim(),
        email: editFacultyModal.email.trim(),
        phone: editFacultyModal.phone.trim(),
        role: editFacultyModal.role,
        department: editFacultyModal.department
      });
      toast('Faculty account updated successfully!', 'success');
      setEditFacultyModal({ open: false, id: null, name: '', email: '', phone: '', role: '', department: '' });
      fetchFaculty();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update faculty account.', 'error');
    } finally {
      setEditFacultyLoading(false);
    }
  };

  const filtered = allFaculty.filter(f =>
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.email?.toLowerCase().includes(search.toLowerCase()) ||
    (typeof f.department === 'object' ? f.department?.name : f.department)?.toLowerCase().includes(search.toLowerCase())
  );

  const deptGroups = filtered.reduce((acc, f) => {
    const d = (typeof f.department === 'object' ? f.department?.name : f.department) || 'Other';
    if (!acc[d]) acc[d] = [];
    acc[d].push(f);
    return acc;
  }, {});

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Faculty & Roles</h2>
          <p className={styles.pageSub}>Assign HODs and manage administrative hierarchy</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchFaculty} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Database size={17} className={styles.cardHeaderIcon} />
            <h3 className={styles.cardTitle}>All College Faculty</h3>
          </div>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input type="text" className={styles.searchInput} placeholder="Search faculty..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? <div className={styles.tableLoader}><div className={styles.spinner} /></div> :
        filtered.length === 0 ? <Empty text="No faculty found." /> :
        Object.entries(deptGroups).map(([dept, members]) => (
          <div key={dept}>
            <div className={styles.deptLabel}>{dept}</div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(f => (
                    <tr key={f._id}>
                      <td>
                        <div className={styles.nameCell}>
                          <div className={styles.miniAvatar}>{(f.name||'U')[0].toUpperCase()}</div>
                          <p style={{color:'var(--text-1)',fontWeight:500}}>{f.name}</p>
                        </div>
                      </td>
                      <td className={styles.mutedCell}>{f.email}</td>
                      <td>
                        <span className={`${styles.badge} ${f.role === 'collegeAdmin' ? styles.badgeCA : f.role === 'hod' ? styles.badgeHOD : styles.badgeFaculty}`}>
                           {f.role === 'collegeAdmin' ? <><Crown size={11} /> College Admin</> : f.role === 'hod' ? <><Shield size={11} /> HOD</> : 'Faculty'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionBtns} style={{ justifyContent: 'flex-end', gap: '8px' }}>
                          <button className={`${styles.actionBtn} ${styles.hodBtn}`} onClick={() => setEditFacultyModal({ open: true, id: f._id, name: f.name, email: f.email, phone: f.phone || '', role: f.role, department: typeof f.department === 'object' ? f.department?._id : f.department })}>
                            Edit Details
                          </button>
                          {f.role === 'faculty' && (
                            <button className={`${styles.actionBtn} ${styles.hodBtn}`} onClick={() => setMakeHODModal({ open: true, id: f._id, name: f.name, dept: typeof f.department === 'object' ? f.department?.name : f.department })}>
                              <Crown size={12} /> Make HOD
                            </button>
                          )}
                          {f.role !== 'collegeAdmin' && (
                            <button className={`${styles.actionBtn} ${styles.transferBtn}`} onClick={() => { setNewDept(''); setTransferModal({ open: true, id: f._id, name: f.name }); }}>
                              <ArrowRightLeft size={12} /> Transfer Admin
                            </button>
                          )}
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

      {/* Prompts exactly as before */}
      <Modal isOpen={makeHODModal.open} onClose={() => !makeHODLoading && setMakeHODModal({ open: false, id: null, name: '', dept: '' })} title="Promote to HOD" footer={<><button className={styles.cancelModalBtn} onClick={() => setMakeHODModal({ open: false, id: null, name: '', dept: '' })} disabled={makeHODLoading}>Cancel</button><button className={styles.successModalBtn} onClick={confirmMakeHOD} disabled={makeHODLoading}>{makeHODLoading ? 'Promoting...' : 'Confirm Promotion'}</button></>}>
        <div className={styles.modalConfirmBox}>
          <Crown size={28} color="var(--success)" style={{marginBottom:10}}/>
          <p className={styles.modalConfirmText}>Promote <strong>{makeHODModal.name}</strong> to <strong>Head of Department</strong>{makeHODModal.dept ? ` - ${makeHODModal.dept}` : ''}.</p>
          <p className={styles.modalConfirmSub}>They will receive an email notification indicating their new administrative scope.</p>
        </div>
      </Modal>

      <Modal isOpen={transferModal.open} onClose={() => !transferLoading && setTransferModal({ open: false, id: null, name: '' })} title="Transfer College Admin Role" footer={<><button className={styles.cancelModalBtn} onClick={() => setTransferModal({ open: false, id: null, name: '' })} disabled={transferLoading}>Cancel</button><button className={styles.dangerModalBtn} onClick={confirmTransfer} disabled={transferLoading}>{transferLoading ? 'Transferring...' : 'Transfer & Demote Myself'}</button></>}>
        <div className={styles.modalAlertDanger}>
          <AlertTriangle size={16} />
          <div><strong>Irreversible.</strong><p style={{marginTop:'4px',fontWeight:400}}><strong>{transferModal.name}</strong> becomes the new College Admin. You will lose all admin privileges.</p></div>
        </div>
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Your new department <span style={{color:'var(--danger)'}}>*</span></label>
          <select className={styles.modalInput} value={newDept} onChange={e => setNewDept(e.target.value)} disabled={transferLoading}>
            <option value="" disabled>Select your new department...</option>
            {departments.map(dept => (
              <option key={dept._id || dept} value={dept._id || dept}>
                {dept.name || dept}
              </option>
            ))}
          </select>
        </div>
      </Modal>

      {/* Edit Faculty Modal */}
      <Modal
        isOpen={editFacultyModal.open}
        onClose={() => !editFacultyLoading && setEditFacultyModal({ open: false, id: null, name: '', email: '', phone: '', role: '', department: '' })}
        title="Edit Faculty Member"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setEditFacultyModal({ open: false, id: null, name: '', email: '', phone: '', role: '', department: '' })} disabled={editFacultyLoading}>
              Cancel
            </button>
            <button className={styles.successModalBtn} onClick={handleEditFacultySave} disabled={editFacultyLoading}>
              {editFacultyLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text"
              className={styles.modalInput}
              value={editFacultyModal.name}
              onChange={e => setEditFacultyModal(p => ({ ...p, name: e.target.value }))}
              disabled={editFacultyLoading}
              required
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="email"
              className={styles.modalInput}
              value={editFacultyModal.email}
              onChange={e => setEditFacultyModal(p => ({ ...p, email: e.target.value }))}
              disabled={editFacultyLoading}
              required
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Phone Number</label>
            <input
              type="text"
              className={styles.modalInput}
              value={editFacultyModal.phone}
              onChange={e => setEditFacultyModal(p => ({ ...p, phone: e.target.value }))}
              disabled={editFacultyLoading}
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Role <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select
              className={styles.modalSelect}
              value={editFacultyModal.role}
              onChange={e => setEditFacultyModal(p => ({ ...p, role: e.target.value }))}
              disabled={editFacultyLoading}
              style={{ background: 'var(--surface-2)', color: 'var(--text-1)', width: '100%', padding: '10px', border: '1px solid var(--border-2)', borderRadius: '6px' }}
            >
              <option value="faculty">Faculty</option>
              <option value="hod">HOD</option>
              <option value="collegeAdmin">College Admin</option>
            </select>
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Department <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select
              className={styles.modalSelect}
              value={editFacultyModal.department}
              onChange={e => setEditFacultyModal(p => ({ ...p, department: e.target.value }))}
              disabled={editFacultyLoading}
              style={{ background: 'var(--surface-2)', color: 'var(--text-1)', width: '100%', padding: '10px', border: '1px solid var(--border-2)', borderRadius: '6px' }}
            >
              <option value="" disabled>Select Department</option>
              {departments.filter(d => d.status === 'Active' || d._id === editFacultyModal.department).map(dept => (
                <option key={dept._id} value={dept._id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};


/* ======================================================
   College Admin OVERVIEW (Includes Approvals)
====================================================== */
const CollegeAdminHome = () => {
  const { toast } = useToast();
  const [pending, setPending] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [approvingId, setApprovingId] = useState(null);
  
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, name: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const appRes = await facultyAPI.getApprovals();
      const d = appRes.data?.data || {};
      setPending(Array.isArray(d.pending) ? d.pending : []);
      setRejected(Array.isArray(d.rejected) ? d.rejected : []);
    } catch {
      toast('Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleApprove = async (id, name) => {
    setApprovingId(id);
    try {
      await facultyAPI.approve(id);
      setTimeout(() => setPending(p => p.filter(a => a._id !== id)), 400);
      toast(`✓ ${name} approved!`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Approval failed.', 'error');
      setApprovingId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) { toast('Rejection reason is required.', 'warning'); return; }
    setRejectLoading(true);
    try {
      await facultyAPI.reject(rejectModal.id, rejectReason.trim());
      setPending(p => p.filter(a => a._id !== rejectModal.id));
      toast(`${rejectModal.name} rejected.`, 'info');
      setRejectModal({ open: false, id: null, name: '' });
      setRejectReason('');
    } catch (err) {
      toast(err.response?.data?.message || 'Rejection failed.', 'error');
    } finally {
      setRejectLoading(false);
    }
  };

  const listMap = { pending, rejected };
  const currentList = listMap[tab] || [];

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Admin Overview</h2>
          <p className={styles.pageSub}>Action required on incoming faculty registrations</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchApprovals} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.amber}`}>
          <div className={styles.statIconWrap}><Clock size={20} /></div>
          <div><p className={styles.statValue}>{loading ? '…' : pending.length}</p><p className={styles.statLabel}>Pending Approvals</p></div>
        </div>
        <div className={`${styles.statCard} ${styles.red}`}>
          <div className={styles.statIconWrap}><XCircle size={20} /></div>
          <div><p className={styles.statValue}>{loading ? '…' : rejected.length}</p><p className={styles.statLabel}>Rejected Registrations</p></div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <UserCheck size={17} className={styles.cardHeaderIcon} />
            <h3 className={styles.cardTitle}>Faculty Registration Queue</h3>
          </div>
          <div className={styles.tabBar}>
            {['pending', 'rejected'].map(t => (
              <button key={t} className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)} <span className={styles.tabCount}>{listMap[t].length}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className={styles.tableLoader}><div className={styles.spinner} /></div> :
        currentList.length === 0 ? <Empty text={`No ${tab} requests at this time.`} /> :
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                {tab !== 'rejected' && <th>Email</th>}
                <th>Department</th>
                {tab === 'rejected' && <th>Reason</th>}
                {tab === 'pending' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {currentList.map(item => {
                const isApproving = approvingId === item._id;
                return (
                  <tr key={item._id} className={isApproving ? styles.rowApproving : ''}>
                    <td><div className={styles.nameCell}><div className={styles.miniAvatar}>{(item.name||'U')[0].toUpperCase()}</div>{item.name}</div></td>
                    {tab !== 'rejected' && <td className={styles.mutedCell}>{item.email}</td>}
                    <td className={styles.mutedCell}>{typeof item.department === 'object' ? (item.department?.name || '-') : (item.department || '-')}</td>
                    {tab === 'rejected' && <td className={styles.reasonCell}>{item.rejectedReason || 'N/A'}</td>}
                    {tab === 'pending' && (
                      <td>
                        <div className={styles.actionBtns}>
                          <button className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={() => handleApprove(item._id, item.name)} disabled={!!approvingId}>
                            {isApproving ? <span className={styles.btnSpinner} /> : <CheckCircle2 size={13} />} Approve
                          </button>
                          <button className={`${styles.actionBtn} ${styles.rejectBtn}`} onClick={() => { setRejectReason(''); setRejectModal({ open: true, id: item._id, name: item.name }); }} disabled={!!approvingId}>
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}
      </div>

      <Modal isOpen={rejectModal.open} onClose={() => !rejectLoading && setRejectModal({ open: false, id: null, name: '' })} title={`Reject - ${rejectModal.name}`} footer={<><button className={styles.cancelModalBtn} onClick={() => setRejectModal({ open: false, id: null, name: '' })} disabled={rejectLoading}>Cancel</button><button className={styles.dangerModalBtn} onClick={confirmReject} disabled={rejectLoading}>{rejectLoading ? 'Rejecting...' : 'Confirm Rejection'}</button></>}>
        <div className={styles.modalAlertWarn}><AlertTriangle size={16} /> This permanently deletes the request and emails the applicant.</div>
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>Rejection Reason <span style={{color:'var(--danger)'}}>*</span></label>
          <textarea className={styles.modalTextarea} rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} disabled={rejectLoading} />
        </div>
      </Modal>
    </div>
  );
};

const Empty = ({ text }) => (
  <div className={styles.empty}>
    <Inbox size={36} style={{ color: 'var(--text-3)', display: 'block', margin: '0 auto 12px auto' }} />
    <p className={styles.emptyText}>{text}</p>
  </div>
);

/* ======================================================
   COLLEGE ADMIN MANAGE STUDENTS TAB
====================================================== */
const CollegeAdminStudents = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departments, setDepartments] = useState([]);

  // Modals state
  const [singleModal, setSingleModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [tempPassModal, setTempPassModal] = useState({ open: false, password: '', name: '' });
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });

  // Edit student state
  const [editStudentModal, setEditStudentModal] = useState({ open: false, id: null, name: '', rollNumber: '', email: '', semester: '1', department: '', cgpa: '' });
  const [editStudentLoading, setEditStudentLoading] = useState(false);

  // Single student form
  const [formName, setFormName] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSemester, setFormSemester] = useState('1');
  const [formDept, setFormDept] = useState('');
  const [formCourse, setFormCourse] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk upload state
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkData, setBulkData] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await collegeAdminAPI.getStudents();
      setStudents(Array.isArray(data.students) ? data.students : []);
    } catch {
      toast('Error loading student directory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchDepartments = useCallback(async () => {
    try {
      if (user?.collegeId) {
        const colId = typeof user.collegeId === 'object' ? user.collegeId._id : user.collegeId;
        const res = await collegeAPI.getDepartments(colId);
        setDepartments(res.data.departments || []);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchStudents();
    fetchDepartments();
  }, [fetchStudents, fetchDepartments]);

  // Handle manual single student registration
  const handleAddSingle = async (e) => {
    e.preventDefault();
    const name = formName.trim();
    const rollNo = formRoll.trim();
    const email = formEmail.trim();
    const semester = Number(formSemester);
    const department = formDept;
    const course = formCourse.trim();

    if (!name || !rollNo || !email || !semester) {
      toast('Please fill out all required fields.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await collegeAdminAPI.addStudent({
        name,
        rollNumber: rollNo,
        email,
        semester,
        department,
        course
      });

      if (res.data.student) {
        toast(`Student ${name} registered successfully!`, 'success');
        setFormName('');
        setFormRoll('');
        setFormEmail('');
        setFormSemester('1');
        setFormDept('');
        setFormCourse('');
        setSingleModal(false);
        fetchStudents(); // Refresh list

        // Display the temporary password in a nice prompt
        if (res.data.temporaryPassword) {
          setTempPassModal({
            open: true,
            name: name,
            password: res.data.temporaryPassword,
          });
        }
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add student.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // CSV File parser
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text) => {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length <= 1) {
        toast('CSV file is empty or missing data rows.', 'warning');
        return;
      }

      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      
      const parsedRows = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const rowValues = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        if (rowValues.length < headers.length) continue; // skip broken rows

        // Build row dictionary
        const row = {};
        headers.forEach((header, index) => {
          row[header] = rowValues[index] || '';
        });

        // Map keys cleanly to matches: Name, RollNumber, Email, Course, Department, Semester
        const Name = row.Name || row.name || row.NAME || '';
        const RollNumber = row.RollNumber || row.rollNumber || row.roll_number || row.ROLL_NUMBER || '';
        const Email = row.Email || row.email || row.EMAIL || '';
        const Course = row.Course || row.course || row.COURSE || '';
        const Department = row.Department || row.department || row.dept || row.DEPARTMENT || '';
        const Semester = row.Semester || row.semester || row.sem || row.SEMESTER || '';

        const rowNum = i + 1;
        const missing = [];
        if (!Name) missing.push("Name");
        if (!RollNumber) missing.push("RollNumber");
        if (!Email) missing.push("Email");
        if (!Semester) missing.push("Semester");

        if (missing.length > 0) {
          errors.push(`Row ${rowNum}: Missing fields -> ${missing.join(", ")}`);
        }

        parsedRows.push({
          Name,
          RollNumber,
          Email,
          Course,
          Department,
          Semester,
        });
      }

      setBulkData(parsedRows);
      setBulkErrors(errors);

      if (errors.length > 0) {
        toast(`Found ${errors.length} validation errors in CSV. Please correct them.`, 'error');
      } else {
        toast(`CSV parsed successfully! ${parsedRows.length} students ready for import.`, 'success');
      }
    } catch (err) {
      toast('Failed to parse CSV file structure.', 'error');
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkErrors.length > 0) {
      toast('Please resolve validation mismatches before submitting.', 'warning');
      return;
    }
    if (bulkData.length === 0) {
      toast('No student data loaded to submit.', 'warning');
      return;
    }

    setBulkUploading(true);
    try {
      const res = await collegeAdminAPI.bulkUpload(bulkData);
      if (res.data.successfullyAdded !== undefined) {
        toast(`Import completed! Successfully added ${res.data.successfullyAdded} students.`, 'success');
        setBulkModal(false);
        setBulkFile(null);
        setBulkData([]);
        setBulkErrors([]);
        fetchStudents();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Bulk upload encountered an error.', 'error');
    } finally {
      setBulkUploading(false);
    }
  };

  const handleDeleteStudent = async () => {
    setActionLoading(true);
    try {
      await collegeAdminAPI.deleteStudent(deleteModal.id);
      toast(`Student ${deleteModal.name} removed successfully.`, 'info');
      setDeleteModal({ open: false, id: null, name: '' });
      fetchStudents();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to remove student.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditStudentClick = (student) => {
    setEditStudentModal({
      open: true,
      id: student._id,
      name: student.name || '',
      rollNumber: student.rollNumber || '',
      email: student.email || '',
      semester: typeof student.semester === 'object' && student.semester !== null ? (student.semester.semesterNumber || '1') : (student.semester || '1'),
      department: typeof student.department === 'object' && student.department !== null ? student.department._id : (student.department || ''),
      cgpa: student.cgpa !== undefined ? student.cgpa : ''
    });
  };

  const handleEditStudentSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!editStudentModal.name.trim() || !editStudentModal.rollNumber.trim() || !editStudentModal.email.trim()) {
      toast('Name, Roll Number, and Email are required.', 'warning');
      return;
    }
    setEditStudentLoading(true);
    try {
      await collegeAdminAPI.updateStudent(editStudentModal.id, {
        name: editStudentModal.name.trim(),
        rollNumber: editStudentModal.rollNumber.trim(),
        email: editStudentModal.email.trim(),
        semester: editStudentModal.semester,
        department: editStudentModal.department,
        cgpa: editStudentModal.cgpa ? Number(editStudentModal.cgpa) : undefined
      });
      toast('Student account updated successfully!', 'success');
      setEditStudentModal({ open: false, id: null, name: '', rollNumber: '', email: '', semester: '1', department: '', cgpa: '' });
      fetchStudents();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update student account.', 'error');
    } finally {
      setEditStudentLoading(false);
    }
  };

  // Search filtering
  const filteredStudents = students.filter(s => {
    const term = search.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(term) ||
      (s.rollNumber || '').toLowerCase().includes(term) ||
      (s.email || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className={styles.pageWrap}>
      {/* Page Header */}
      <div className={styles.pageHead}>
        <div>
          <h2 className={styles.pageTitle}>Student Roster</h2>
          <p className={styles.pageSub}>
            Register, overview, or bulk import student records for the entire institution.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={styles.refreshBtn} onClick={fetchStudents} disabled={loading}>
            <RefreshCw size={15} className={loading ? styles.spin : ''} /> Refresh
          </button>
          <button className={styles.actionBtn} onClick={() => setBulkModal(true)} style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.22)' }}>
            <Building2 size={15} /> Bulk Upload CSV
          </button>
          <button className={styles.refreshBtn} onClick={() => setSingleModal(true)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 2px 8px var(--accent-glow)' }}>
            <Plus size={15} /> Add Student
          </button>
        </div>
      </div>

      {/* Directory Search & List */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Users size={17} className={styles.cardHeaderIcon} />
            <div>
              <h3 className={styles.cardTitle}>Student Database Directory</h3>
              <p className={styles.cardSub}>List of all registered students inside your college</p>
            </div>
          </div>
          {/* Search Bar */}
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search name, roll, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.tableLoader}><div className={styles.spinner} /></div>
        ) : filteredStudents.length === 0 ? (
          <Empty text={search ? "No students matching your search criteria." : "No student directories registered. Add a student to start."} />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll Number</th>
                  <th>Email</th>
                  <th>Semester</th>
                  <th>Departments</th>
                  <th>Courses</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student._id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.miniAvatar} style={{ background: 'linear-gradient(135deg, var(--warning), var(--danger))' }}>
                          {(student.name || 'S')[0].toUpperCase()}
                        </div>
                        {student.name}
                      </div>
                    </td>
                    <td><strong>{student.rollNumber}</strong></td>
                    <td className={styles.mutedCell}>{student.email}</td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>
                        Sem {typeof student.semester === 'object' && student.semester !== null ? (student.semester.semesterNumber || student.semester.semesterName || 'N/A') : (student.semester || 'N/A')}
                      </span>
                    </td>
                    <td className={styles.mutedCell}>
                      {student.departmentName || (typeof student.department === 'object' ? student.department?.name : student.department) || '-'}
                    </td>
                    <td className={styles.mutedCell}>
                      {Array.isArray(student.courses) && student.courses.length > 0
                        ? student.courses.map(c => typeof c === 'object' && c !== null ? (c.courseCode || c.courseName) : c).join(', ')
                        : '-'}
                    </td>
                    <td>
                      <div className={styles.actionBtns} style={{ justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          className={`${styles.actionBtn} ${styles.hodBtn}`}
                          onClick={() => handleEditStudentClick(student)}
                        >
                          Edit
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${styles.rejectBtn}`}
                          onClick={() => setDeleteModal({ open: true, id: student._id, name: student.name })}
                        >
                          <XCircle size={13} /> Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD SINGLE STUDENT */}
      <Modal
        isOpen={singleModal}
        onClose={() => !actionLoading && setSingleModal(false)}
        title="Register Student Account"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setSingleModal(false)} disabled={actionLoading}>
              Cancel
            </button>
            <button className={styles.successModalBtn} onClick={handleAddSingle} disabled={actionLoading}>
              {actionLoading ? 'Registering...' : 'Register Student'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddSingle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Student Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text"
              className={styles.modalInput}
              placeholder="e.g. John Doe"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              disabled={actionLoading}
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Roll Number <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text"
              className={styles.modalInput}
              placeholder="e.g. CS2023-042"
              value={formRoll}
              onChange={e => setFormRoll(e.target.value)}
              disabled={actionLoading}
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>University Email <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="email"
              className={styles.modalInput}
              placeholder="e.g. john.doe@aiss.edu"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              disabled={actionLoading}
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Current Semester <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select
              className={styles.modalSelect}
              value={formSemester}
              onChange={e => setFormSemester(e.target.value)}
              disabled={actionLoading}
              style={{ background: 'var(--surface-2)', color: 'var(--text-1)', width: '100%', padding: '10px', border: '1px solid var(--border-2)', borderRadius: '6px' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem} style={{ background: 'var(--surface-1)' }}>Semester {sem}</option>
              ))}
            </select>
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Primary Department (Optional)</label>
            <select
              className={styles.modalSelect}
              value={formDept}
              onChange={e => setFormDept(e.target.value)}
              disabled={actionLoading}
              style={{ background: 'var(--surface-2)', color: 'var(--text-1)', width: '100%', padding: '10px', border: '1px solid var(--border-2)', borderRadius: '6px' }}
            >
              <option value="" style={{ background: 'var(--surface-1)' }}>-- None --</option>
              {departments.filter(d => d.status === 'Active').map(dept => (
                <option key={dept._id} value={dept._id} style={{ background: 'var(--surface-1)' }}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Primary Course Code (Optional)</label>
            <input
              type="text"
              className={styles.modalInput}
              placeholder="e.g. CSE-302"
              value={formCourse}
              onChange={e => setFormCourse(e.target.value)}
              disabled={actionLoading}
            />
          </div>
        </form>
      </Modal>

      {/* MODAL 2: TEMPORARY PASSWORD VIEW */}
      <Modal
        isOpen={tempPassModal.open}
        onClose={() => setTempPassModal({ open: false, password: '', name: '' })}
        title="Student Created Successfully!"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '10px 0' }}>
          <div className={styles.miniAvatar} style={{ width: 60, height: 60, fontSize: '1.5rem', margin: '0 auto', background: 'linear-gradient(135deg, var(--success), #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
          </div>
          <h4 style={{ margin: '8px 0 0 0', color: 'var(--text-1)', fontSize: '1.1rem', fontWeight: 700 }}>
            Temporary Password Generated
          </h4>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
            Account for <strong>{tempPassModal.name}</strong> was created. An automated welcome email containing temporary credentials was dispatched.
          </p>
          <div 
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px dashed var(--success-border)',
              padding: '14px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '2px',
              color: 'var(--success)',
            }}
          >
            {tempPassModal.password}
          </div>
          <button 
            className={styles.successModalBtn} 
            onClick={() => setTempPassModal({ open: false, password: '', name: '' })}
            style={{ marginTop: 12 }}
          >
            Acknowledge & Close
          </button>
        </div>
      </Modal>

      {/* MODAL 3: BULK UPLOAD CSV */}
      <Modal
        isOpen={bulkModal}
        onClose={() => !bulkUploading && setBulkModal(false)}
        title="Bulk Student Import (CSV)"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setBulkModal(false)} disabled={bulkUploading}>
              Cancel
            </button>
            <button 
              className={styles.successModalBtn} 
              onClick={handleBulkSubmit} 
              disabled={bulkUploading || bulkData.length === 0 || bulkErrors.length > 0}
            >
              {bulkUploading ? 'Importing Roster...' : `Submit Bulk Import (${bulkData.length})`}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>
            Upload a CSV containing student rosters. Roster columns must precisely include: <strong style={{ color: 'var(--accent-light)' }}>Name, RollNumber, Email, Course, Department, Semester</strong>.
          </p>

          {/* File Selector Dropzone */}
          <div 
            style={{
              border: '2px dashed var(--border-base)',
              borderRadius: '10px',
              padding: '24px',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.15)',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Database size={32} style={{ color: 'var(--text-3)', marginBottom: 8 }} />
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)', margin: '0 0 4px 0' }}>
              {bulkFile ? bulkFile.name : 'Select student roster CSV file'}
            </p>
            <input
              type="file"
              accept=".csv"
              style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              onChange={handleFileChange}
              disabled={bulkUploading}
            />
          </div>


          {/* Validation Error Logger */}
          {bulkErrors.length > 0 && (
            <div 
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '120px',
                overflowY: 'auto',
              }}
            >
              <h5 style={{ margin: '0 0 6px 0', color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} /> CSV Validation Errors ({bulkErrors.length})
              </h5>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '12px', color: 'var(--danger)', opacity: 0.9, lineHeight: 1.6 }}>
                {bulkErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Data Review Grid */}
          {bulkData.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h5 style={{ margin: 0, color: 'var(--text-1)', fontSize: '13px', fontWeight: 700 }}>
                CSV Preview Directory ({bulkData.length} records parsed)
              </h5>
              <div 
                style={{
                  border: '1px solid var(--border-base)',
                  borderRadius: '8px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  background: 'var(--surface-2)',
                }}
              >
                <table className={styles.table} style={{ fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--table-header-bg)' }}>
                      <th style={{ padding: '6px 12px' }}>Name</th>
                      <th style={{ padding: '6px 12px' }}>Roll Number</th>
                      <th style={{ padding: '6px 12px' }}>Email</th>
                      <th style={{ padding: '6px 12px' }}>Semester</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-base)' }}>
                        <td style={{ padding: '6px 12px' }}>{row.Name}</td>
                        <td style={{ padding: '6px 12px' }}>{row.RollNumber}</td>
                        <td style={{ padding: '6px 12px' }}>{row.Email}</td>
                        <td style={{ padding: '6px 12px' }}>Sem {row.Semester}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 4: DELETE CONFIRMATION */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => !actionLoading && setDeleteModal({ open: false, id: null, name: '' })}
        title="Remove Student Record"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setDeleteModal({ open: false, id: null, name: '' })} disabled={actionLoading}>
              Cancel
            </button>
            <button className={styles.dangerModalBtn} onClick={handleDeleteStudent} disabled={actionLoading}>
              {actionLoading ? 'Deactivating Student...' : 'Confirm Deactivation'}
            </button>
          </>
        }
      >
        <div className={styles.modalAlertDanger}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>Are you sure you want to deactivate {deleteModal.name} from the student database?</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: 400, color: 'var(--danger)', opacity: 0.9 }}>
              This will permanently delete their student record and prevent them from logging in or submitting exam answer scripts.
            </p>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: EDIT STUDENT DETAILS */}
      <Modal
        isOpen={editStudentModal.open}
        onClose={() => !editStudentLoading && setEditStudentModal({ open: false, id: null, name: '', rollNumber: '', email: '', semester: '1', department: '', cgpa: '' })}
        title="Edit Student Account"
        footer={
          <>
            <button className={styles.cancelModalBtn} onClick={() => setEditStudentModal({ open: false, id: null, name: '', rollNumber: '', email: '', semester: '1', department: '', cgpa: '' })} disabled={editStudentLoading}>
              Cancel
            </button>
            <button className={styles.successModalBtn} onClick={handleEditStudentSubmit} disabled={editStudentLoading}>
              {editStudentLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Student Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text"
              className={styles.modalInput}
              value={editStudentModal.name}
              onChange={e => setEditStudentModal(p => ({ ...p, name: e.target.value }))}
              disabled={editStudentLoading}
              required
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Roll Number <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text"
              className={styles.modalInput}
              value={editStudentModal.rollNumber}
              onChange={e => setEditStudentModal(p => ({ ...p, rollNumber: e.target.value }))}
              disabled={editStudentLoading}
              required
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>University Email <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="email"
              className={styles.modalInput}
              value={editStudentModal.email}
              onChange={e => setEditStudentModal(p => ({ ...p, email: e.target.value }))}
              disabled={editStudentLoading}
              required
            />
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Current Semester <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select
              className={styles.modalSelect}
              value={editStudentModal.semester}
              onChange={e => setEditStudentModal(p => ({ ...p, semester: e.target.value }))}
              disabled={editStudentLoading}
              style={{ background: 'var(--surface-2)', color: 'var(--text-1)', width: '100%', padding: '10px', border: '1px solid var(--border-2)', borderRadius: '6px' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem} style={{ background: 'var(--surface-1)' }}>Semester {sem}</option>
              ))}
            </select>
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Primary Department</label>
            <select
              className={styles.modalSelect}
              value={editStudentModal.department}
              onChange={e => setEditStudentModal(p => ({ ...p, department: e.target.value }))}
              disabled={editStudentLoading}
              style={{ background: 'var(--surface-2)', color: 'var(--text-1)', width: '100%', padding: '10px', border: '1px solid var(--border-2)', borderRadius: '6px' }}
            >
              <option value="" style={{ background: 'var(--surface-1)' }}>-- None --</option>
              {departments.filter(d => d.status === 'Active' || d._id === editStudentModal.department).map(dept => (
                <option key={dept._id} value={dept._id} style={{ background: 'var(--surface-1)' }}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>CGPA</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              className={styles.modalInput}
              placeholder="e.g. 8.5"
              value={editStudentModal.cgpa}
              onChange={e => setEditStudentModal(p => ({ ...p, cgpa: e.target.value }))}
              disabled={editStudentLoading}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

/* == Dashboard shell == */
const CollegeAdminDashboard = () => {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetch = () => facultyAPI.getApprovals().then(r => setPendingCount(r.data?.data?.pending?.length || 0)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const navItems = [
    { path: '/collegeadmin',             label: 'Overview',    icon: <Home size={18} />, badge: pendingCount },
    { path: '/collegeadmin/departments', label: 'Departments', icon: <Building2 size={18} /> },
    { path: '/collegeadmin/faculty',     label: 'Faculty',     icon: <Users size={18} /> },
    { path: '/collegeadmin/students',    label: 'Students',    icon: <Users size={18} /> },
    { path: '/collegeadmin/settings',    label: 'Settings',    icon: <SettingsIcon size={18} /> },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <Routes>
        <Route path="/"            element={<CollegeAdminHome />} />
        <Route path="/departments" element={<CollegeAdminDepartments />} />
        <Route path="/faculty"     element={<CollegeAdminFaculty />} />
        <Route path="/students"    element={<CollegeAdminStudents />} />
        <Route path="/settings"    element={<Settings />} />
      </Routes>
    </DashboardLayout>
  );
};

export default CollegeAdminDashboard;
