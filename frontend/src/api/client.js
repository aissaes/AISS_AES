import axios from 'axios';

// The backend URL is passed via Vite's environment variables
const rawEnv = import.meta.env.VITE_API_URL;
const baseURL = rawEnv || 'http://localhost:5000';

const client = axios.create({
  baseURL,
  withCredentials: true,
});

// Global error handler
client.interceptors.response.use(
  (res) => res,
  (error) => {
    let errorMessage = 'An unexpected error occurred.';

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 400) {
        errorMessage = data?.message || 'Invalid request. Please check your input.';
      } else if (status === 401) {
        errorMessage = data?.message || 'Invalid credentials. Please log in again.';
      } else if (status === 403) {
        errorMessage = data?.message || 'You do not have permission to perform this action.';
      } else if (status === 404) {
        errorMessage = data?.message || 'Requested resource not found.';
      } else if (status >= 500) {
        errorMessage = data?.message || 'Internal server error. Please try again later.';
      } else {
        errorMessage = data?.message || `Error: ${status}`;
      }
    } else if (error.request) {
      errorMessage = 'Server is not responding. Please check your internet connection or try again later.';
    } else {
      errorMessage = error.message || 'Failed to make the request.';
    }

    error.message = errorMessage;

    if (!error.response) {
      error.response = { data: { message: errorMessage } };
    } else if (!error.response.data) {
      error.response.data = { message: errorMessage };
    } else if (typeof error.response.data === 'object' && !error.response.data.message) {
      error.response.data.message = errorMessage;
    }

    return Promise.reject(error);
  }
);

/* ══════════════════════════════════════════════════════
   Faculty Auth API
   Routes: /faculty/auth/*
══════════════════════════════════════════════════════ */
export const authAPI = {
  register: (data) => client.post('/faculty/auth/register', data),
  login: (data) => client.post('/faculty/auth/login', data),
  verifyOTP: (data) => client.post('/faculty/auth/verify-otp', data),
  logout: () => client.post('/faculty/auth/logout'),
};

/* ══════════════════════════════════════════════════════
   Overall Admin Auth API
   Routes: /overallAdmin/auth/*
══════════════════════════════════════════════════════ */
export const overallAdminAuthAPI = {
  login: (data) => client.post('/overallAdmin/auth/login', data),
  verifyOTP: (data) => client.post('/overallAdmin/auth/verify-otp', data),
  logout: () => client.post('/overallAdmin/auth/logout'),
};

/* ══════════════════════════════════════════════════════
   Faculty API (all authenticated faculty)
   Routes: /faculty/*
══════════════════════════════════════════════════════ */
export const facultyAPI = {
  getMe: () => client.get('/faculty/me'),
  updateProfile: (data) => client.put('/faculty/profile', data),
  changePassword: (data) => client.put('/faculty/change-password', data),
  getApprovals: () => client.get('/faculty/approvals'),
  approve: (id) => client.post('/faculty/approve', { facultyId: id }),
  reject: (id, reason) => client.post('/faculty/reject', { facultyId: id, rejectedReason: reason }),
  getDeptFaculty: (department) => client.get('/faculty', { params: department ? { department } : {} }),
};

/* ══════════════════════════════════════════════════════
   HOD API
   Routes: /faculty/hod/*
══════════════════════════════════════════════════════ */
export const hodAPI = {
  transfer: (targetFacultyId) => client.post('/faculty/hod/transfer', { newHODId: targetFacultyId }),
};

/* ══════════════════════════════════════════════════════
   College Admin API (was incorrectly named "superAdminAPI")
   Routes: /faculty/collegeadmin/*
══════════════════════════════════════════════════════ */
export const collegeAdminAPI = {
  getCollegeFaculty: () => client.get('/faculty/collegeadmin/college'),
  updateDepartments: (departments) => client.put('/faculty/collegeadmin/update-departments', { departments }),
  makeHOD: (facultyId) => client.post('/faculty/collegeadmin/make-hod', { facultyId }),
  transfer: (facultyId, newDepartment) => client.post('/faculty/collegeadmin/transfer', { facultyId, newDepartment }),
};

// Backward compat alias
export const superAdminAPI = collegeAdminAPI;

/* ══════════════════════════════════════════════════════
   Overall Admin API (Platform God Mode)
   Routes: /overallAdmin/*
══════════════════════════════════════════════════════ */
export const overallAdminAPI = {
  changePassword: (data) => client.put('/overallAdmin/change-password', data),
  getPendingColleges: () => client.get('/overallAdmin/pending-colleges'),
  approveCollege: (collegeId) => client.put(`/overallAdmin/approve-college/${collegeId}`),
  transfer: (data) => client.post('/overallAdmin/transfer-overalladmin', data),
};

/* ══════════════════════════════════════════════════════
   Timetable API
   Routes: /faculty/timetable/*
══════════════════════════════════════════════════════ */
export const timetableAPI = {
  getAll: () => client.get('/faculty/timetable'),
  getById: (id) => client.get(`/faculty/timetable/${id}`),
  create: (data) => client.post('/faculty/timetable/create', data),
  addExam: (timetableId, data) => client.post(`/faculty/timetable/${timetableId}/add-exam`, data),
  getExamById: (examId) => client.get(`/faculty/timetable/exam/${examId}`),
  updateExam: (examId, data) => client.put(`/faculty/timetable/exam/${examId}`, data),
  deleteExam: (examId) => client.delete(`/faculty/timetable/exam/${examId}`),
};

/* ══════════════════════════════════════════════════════
   Question Paper API
   Routes: /faculty/question-paper/*
══════════════════════════════════════════════════════ */
export const questionPaperAPI = {
  getAssignments: () => client.get('/faculty/question-paper/assignments'),
  // upload payload: { examId, instructions: [String], sections: [[{text, marks, imageUrl}]], sectionChoices }
  upload: (data) => client.post('/faculty/question-paper/upload', data),
  // update payload: { instructions, sections, sectionChoices } — resets status to Pending
  update: (paperId, data) => client.put(`/faculty/question-paper/update/${paperId}`, data),
  getPending: () => client.get('/faculty/question-paper/pending'),
  getApproved: () => client.get('/faculty/question-paper/approved'),
  // review payload: { status: "Approved"|"Rejected", feedback: "..." }
  review: (paperId, data) => client.put(`/faculty/question-paper/review/${paperId}`, data),
  getById: (paperId) => client.get(`/faculty/question-paper/${paperId}`),
};

/* ══════════════════════════════════════════════════════
   College API (Public — no auth)
   Routes: /college/*
══════════════════════════════════════════════════════ */
export const collegeAPI = {
  getList: () => client.get('/college/list'),
  getDepartments: (collegeId) => client.get(`/college/${collegeId}/departments`),
  registerRequest: (data) => client.post('/college/request', data),
};

export default client;
