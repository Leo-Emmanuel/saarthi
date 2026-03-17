import axios from 'axios';

const resolvedHost = typeof window !== 'undefined' && window.location?.hostname
    ? window.location.hostname
    : 'localhost';
const allowDynamicHost = resolvedHost === 'localhost' || resolvedHost === '127.0.0.1';
const fallbackBaseURL = allowDynamicHost ? `http://${resolvedHost}:5000/api` : '/api';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || fallbackBaseURL,
    // Fix 1: send cookies (httpOnly JWT) with every request
    withCredentials: true,
});

// Fix 1: CSRF token handling for cookie-based JWT.
// Flask-JWT-ExtendedSets a CSRF cookie; we read it and send it
// as a header on every mutating request.
api.interceptors.request.use((config) => {
    // Read the CSRF token from the cookie set by Flask-JWT-Extended
    const csrfToken = getCookie('csrf_access_token');
    console.log('[axios] CSRF token from cookie:', csrfToken); // DEBUG
    console.log('[axios] Current cookies:', document.cookie); // DEBUG
    if (csrfToken) {
        config.headers['X-CSRF-TOKEN'] = csrfToken;
        console.log('[axios] Set X-CSRF-TOKEN header:', csrfToken); // DEBUG
    } else {
        console.warn('[axios] WARNING: No CSRF token found!'); // DEBUG
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Unauthorised/Expired JWT: Clear frontend persistence
            localStorage.removeItem('user');

            // Only redirect if we are not already on the login or public routes
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/voice-login' && window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Read a cookie value by name.
 * The CSRF cookie is NOT httpOnly, so JavaScript can read it.
 */
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

export default api;
