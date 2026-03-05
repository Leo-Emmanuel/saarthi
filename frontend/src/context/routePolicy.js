/**
 * Route policy — maps user roles to their default landing pages.
 *
 * Separated from AuthContext so authentication and routing concerns
 * remain independent.
 */

const ROLE_PATHS = {
    admin: '/admin',
    teacher: '/teacher',
    student: '/student',
};

/** Resolve the default landing page for a given role. */
export const getPathForRole = (role) => ROLE_PATHS[role] || '/student';
