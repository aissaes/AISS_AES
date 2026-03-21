/**
 * AISS_AES — Encrypted Local Storage Utility
 *
 * Uses **Web Crypto API** (AES-256-GCM) — zero external dependencies.
 * Role-isolated storage so Faculty, HOD and SuperAdmin caches never cross.
 *
 *   Faculty    →  'aiss_fa_v1'
 *   HOD        →  'aiss_hod_v1'
 *   SuperAdmin →  'aiss_sa_v1'
 *
 * Usage:
 *   await secureStorage.set('hod', { profile, pendingCount })
 *   const data = await secureStorage.get('hod')
 *   secureStorage.setRole('hod')
 *   secureStorage.getRole()
 *   secureStorage.clear('hod')   // clears one role
 *   secureStorage.clear()        // clears all AISS storage
 */

// ── Storage key names ───────────────────────────────────
const STORE_KEYS = {
  superAdmin: 'aiss_sa_v1',
  hod:        'aiss_hod_v1',
  faculty:    'aiss_fa_v1',
  _role:      'aiss_active_role', // plain text: last authenticated role
};

// Fixed salt — changing this invalidates ALL cached entries
const SALT = new TextEncoder().encode('AISS_SYSTEM_SALT_2026_SECURE');

// ── Key derivation ───────────────────────────────────────
async function deriveKey(role) {
  const passphrase = `AISS_AES_SYSTEM__${role.toUpperCase()}__PRIVATE_KEY`;
  const raw = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: 120_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── Helpers ──────────────────────────────────────────────
function storeKey(role) {
  return STORE_KEYS[role] ?? `aiss_${role}_v1`;
}

// ── API ──────────────────────────────────────────────────
export const secureStorage = {

  /**
   * Encrypt and store `data` under the role-specific AES-256-GCM key.
   * A random 12-byte IV is prepended to the ciphertext before base64 encoding.
   */
  async set(role, data) {
    if (!role || typeof window === 'undefined') return;
    try {
      const key     = await deriveKey(role);
      const iv      = crypto.getRandomValues(new Uint8Array(12));
      const payload = new TextEncoder().encode(JSON.stringify({ data, ts: Date.now() }));
      const cipher  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);

      const combined = new Uint8Array(12 + cipher.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(cipher), 12);

      localStorage.setItem(storeKey(role), btoa(String.fromCharCode(...combined)));
    } catch {
      /* Graceful: unsupported browser or private-mode storage restrictions */
    }
  },

  /**
   * Decrypt and return cached data for a role.
   * Returns `null` if missing, expired, or decryption fails.
   *
   * @param {string} role
   * @param {number} maxAgeMs  TTL in milliseconds.  Default = 30 minutes.
   */
  async get(role, maxAgeMs = 30 * 60 * 1000) {
    if (!role || typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(storeKey(role));
      if (!stored) return null;

      const key      = await deriveKey(role);
      const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
      const iv       = combined.slice(0, 12);
      const cipher   = combined.slice(12);

      const plain        = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
      const { data, ts } = JSON.parse(new TextDecoder().decode(plain));

      if (Date.now() - ts > maxAgeMs) {
        this.clear(role);
        return null;
      }
      return data;
    } catch {
      return null; // decryption failure = treat as cache miss
    }
  },

  /**
   * Clear one role's cache, or all AISS caches when called with no argument.
   */
  clear(role) {
    if (role) {
      localStorage.removeItem(storeKey(role));
    } else {
      Object.values(STORE_KEYS).forEach(k => localStorage.removeItem(k));
    }
  },

  /** Store the authenticated role in plain text for quick lookup on next load. */
  setRole(role) {
    localStorage.setItem(STORE_KEYS._role, role);
  },

  /** The last authenticated role, or null if not set. */
  getRole() {
    return localStorage.getItem(STORE_KEYS._role) ?? null;
  },
};
