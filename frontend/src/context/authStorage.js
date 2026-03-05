/**
 * Auth persistence — localStorage for user profile data only.
 *
 * Fix 1: JWT token is now stored in an httpOnly cookie managed by the browser.
 * We only persist the user profile (role, name) in localStorage so the frontend
 * knows the user's role for routing without making an API call.
 */

const USER_KEY = 'user';

/** Ensure every user object has a consistent shape. */
export function normaliseUser({ name, role, email, studentId } = {}) {
    return {
        name: name || '',
        role: role || 'student',
        email: email || null,
        studentId: studentId || null,
    };
}

/**
 * Load the stored user profile.
 * Returns the user object or null if not found/corrupt.
 */
export function loadStoredUser() {
    const user = _readUser();
    if (!user) {
        clearAuth();
        return null;
    }
    return user;
}

/**
 * Check whether a user profile is stored (implies logged in).
 * The actual auth state is the httpOnly cookie, but this lets the
 * frontend know the role for routing on page load.
 */
export function hasStoredSession() {
    return _readUser() !== null;
}

/**
 * Persist user profile data (no token — that's in the httpOnly cookie).
 */
export function persistAuth(token, user) {
    // token parameter kept for backward compat but is ignored —
    // the cookie is managed by the browser.
    if (!user) {
        clearAuth();
        return;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Remove user profile from localStorage. */
export function clearAuth() {
    localStorage.removeItem(USER_KEY);
}

// ── Private helpers ──────────────────────────────────────────────────────────

function _readUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? normaliseUser(parsed) : null;
    } catch {
        return null;
    }
}
