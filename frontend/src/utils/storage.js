/**
 * Minimal Local Storage Utility
 * 
 * Only stores the active ROLE string (e.g. 'faculty', 'hod', 'collegeAdmin')
 * so the app knows which dashboard to route to on page load.
 * 
 * NO sensitive data (profile, email, phone, IDs) is stored here.
 * The backend handles auth via HTTP-only cookies.
 * Profile data lives only in React memory (AuthContext).
 */

const ROLE_KEY = 'aiss_active_role';

export const storage = {
  /** Store the authenticated role for quick routing on next page load */
  setRole(role) {
    try { localStorage.setItem(ROLE_KEY, role); } catch { /* private mode */ }
  },

  /** Get the last authenticated role, or null */
  getRole() {
    try { return localStorage.getItem(ROLE_KEY) ?? null; } catch { return null; }
  },

  /** Clear stored role on logout */
  clear() {
    try { localStorage.removeItem(ROLE_KEY); } catch { /* ignore */ }
  },
};
