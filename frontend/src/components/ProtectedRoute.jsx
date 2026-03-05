import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPathForRole } from '../context/routePolicy';

/**
 * ProtectedRoute — guards authenticated pages with optional role enforcement.
 *
 * Props:
 *   children      — the page to render if access is granted
 *   requiredRole  — if set ('admin' | 'teacher' | 'student'), ONLY that role
 *                   may access; wrong-role users are bounced to their own page
 *
 * Behaviour:
 *   1. While initializing (hydrating localStorage) → show a neutral loader
 *   2. No authenticated user → redirect to /login
 *   3. Wrong role → redirect to the user's own default page
 *   4. OK → render children
 */
export default function ProtectedRoute({ children, requiredRole }) {
    const { user, initializing } = useAuth();

    // 1. Hydration in progress — don't flash a redirect
    if (initializing) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg)',
                    color: 'var(--muted)',
                    fontSize: 16,
                }}
            >
                Loading…
            </div>
        );
    }

    // 2. Not logged in → go to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Wrong role → bounce to the user's own dashboard
    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to={getPathForRole(user.role)} replace />;
    }

    // 4. Access granted
    return children;
}
