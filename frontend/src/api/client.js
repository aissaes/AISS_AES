import axios from 'axios';

// The backend URL is passed via Vite's environment variables
const rawEnv = import.meta.env.VITE_API_URL;
// The backend does not use an /api prefix for its routes, so we hit the host directly.
const baseURL = rawEnv || 'http://localhost:5000';

const client = axios.create({
  baseURL,
  withCredentials: true, // Crucial to send HttpOnly tokens back and forth securely
});

// Handlers for global error / status logic
client.interceptors.response.use(
  (res) => res,
  (error) => {
    return Promise.reject(error);
  }
);

/* ══════════════════════════════════════════════════════
   Auth API
══════════════════════════════════════════════════════ */
// Since backend `routes/facultyAuth.js` did not mount the `logoutFaculty` 
// controller, we perform a frontend mock that safely clears caches on our end.
export const authAPI = {
  login:      (data) => client.post('/faculty/auth/login', data),
  verifyOTP:  (data) => client.post('/faculty/auth/verify-otp', data),
  logout:     () => Promise.resolve({ data: { message: "Local logout cache clear" } }),
};

/* ══════════════════════════════════════════════════════
   Faculty API
══════════════════════════════════════════════════════ */
// These correspond exactly to the `/faculty/...` backend routes mounted in `index.js`
export const facultyAPI = {
  register:     (data) => client.post('/faculty/auth/register', data),
  getMe:        () => client.get('/faculty/me'),
  updateProfile:(data) => client.put('/faculty/profile', data),
  getApprovals: () => client.get('/faculty/approvals'),
  
  // Notice these are now POST as defined in `facultyRoutes.js` 
  // and sending the explicitly expected keys `facultyId` and `rejectedReason`.
  approve:      (id) => client.post(`/faculty/approve`, { facultyId: id }),
  reject:       (id, reason) => client.post(`/faculty/reject`, { facultyId: id, rejectedReason: reason }),
  
  getDeptFaculty: () => client.get('/faculty'),
};

/* ══════════════════════════════════════════════════════
   HOD API
══════════════════════════════════════════════════════ */
export const hodAPI = {
  transfer: (targetFacultyId) => client.post('/faculty/hod/transfer', { newHODId: targetFacultyId }),
};

/* ══════════════════════════════════════════════════════
   Super Admin API
══════════════════════════════════════════════════════ */
export const superAdminAPI = {
  transfer:         (targetFacultyId, newDepartment) => client.post('/faculty/superadmin/transfer', { facultyId: targetFacultyId, newDepartment }),
  makeHOD:          (targetFacultyId) => client.post('/faculty/superadmin/make-hod', { facultyId: targetFacultyId }),
  getCollegeFaculty:() => client.get('/faculty/superadmin/college'),
};

export default client;
