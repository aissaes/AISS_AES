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
    let errorMessage = 'An unexpected error occurred.';

    if (error.response) {
      // Server responded with a status other than 2xx
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
      // Request was made but no response received (e.g., network error or server offline)
      errorMessage = 'Server is not responding. Please check your internet connection or try again later.';
    } else {
      // Something happened while setting up the request
      errorMessage = error.message || 'Failed to make the request.';
    }

    // Attach the clean message directly to the error object
    error.message = errorMessage;

    // Ensure components relying on `err.response?.data?.message` still work flawlessly
    // particularly for network errors where error.response is undefined
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
   Auth API
══════════════════════════════════════════════════════ */
// Since backend `routes/facultyAuth.js` did not mount the `logoutFaculty` 
// controller, we perform a frontend mock that safely clears caches on our end.
export const authAPI = {
  register: (data) => client.post('/faculty/auth/register', data),
  login: (data) => client.post('/faculty/auth/login', data),
  verifyOTP: (data) => client.post('/faculty/auth/verify-otp', data),
  logout: () => client.post('/faculty/auth/logout'),
};

/* ══════════════════════════════════════════════════════
   Faculty API
══════════════════════════════════════════════════════ */
// These correspond exactly to the `/faculty/...` backend routes mounted in `index.js`
export const facultyAPI = {
  getMe: () => client.get('/faculty/me'),
  updateProfile: (data) => client.put('/faculty/profile', data),
  getApprovals: () => client.get('/faculty/approvals'),

  // Notice these are now POST as defined in `facultyRoutes.js` 
  // and sending the explicitly expected keys `facultyId` and `rejectedReason`.
  approve: (id) => client.post(`/faculty/approve`, { facultyId: id }),
  reject: (id, reason) => client.post(`/faculty/reject`, { facultyId: id, rejectedReason: reason }),

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
  transfer: (targetFacultyId, newDepartment) => client.post('/faculty/superadmin/transfer', { facultyId: targetFacultyId, newDepartment }),
  makeHOD: (targetFacultyId) => client.post('/faculty/superadmin/make-hod', { facultyId: targetFacultyId }),
  getCollegeFaculty: () => client.get('/faculty/superadmin/college'),
};

export default client;
