/**
 * Auth API — HTTP layer for authentication endpoints.
 *
 * All methods return a standardised result:
 *   { success: true, data }   on success
 *   { success: false, error } on failure
 *
 * This keeps transport-level error handling out of the React layer.
 */
import api from '../config/axios';

/** Wrap an API call with consistent error handling. */
async function safe(promise, fallbackMsg = 'Request failed') {
    try {
        const response = await promise;
        return { success: true, data: response.data };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.error || fallbackMsg,
            fields: error.response?.data?.fields || null,
            code: error.response?.data?.code || null,
            locked_until: error.response?.data?.locked_until || null,
        };
    }
}

export const authApi = {
    login: (email, password) =>
        safe(api.post('/auth/login', { email, password }), 'Login failed'),

    /**
     * Student authentication via numeric PIN.
     *
     * Maps to the `/auth/login-voice` endpoint — the backend uses a single
     * endpoint for all non-password student auth, whether the PIN is entered
     * via the voice UI or typed manually.
     */
    pinLogin: (studentId, pin) =>
        safe(api.post('/auth/login-voice', { studentId, pin }), 'Login failed'),

    register: (name, email, password, role) =>
        safe(api.post('/auth/register', { name, email, password, role }), 'Registration failed'),

    registerStudent: (name, studentId, department, pin) =>
        safe(
            api.post('/auth/register-student', { name, studentId, department, pin }),
            'Student Registration failed',
        ),

    /** Fix 1: cookie-based logout — clears the httpOnly JWT cookie. */
    logout: () =>
        safe(api.post('/auth/logout'), 'Logout failed'),
};
