import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { authApi } from './authApi';
import {
    normaliseUser,
    loadStoredUser,
    persistAuth,
    clearAuth,
} from './authStorage';

const AuthContext = createContext();

// ── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Run an async action with busy-state management.
 * Uses a counter so concurrent calls don't reset busy prematurely.
 */
async function withBusy(busyRef, setBusy, action) {
    busyRef.current += 1;
    setBusy(true);
    try {
        return await action();
    } finally {
        busyRef.current -= 1;
        if (busyRef.current === 0) setBusy(false);
    }
}

/**
 * Common login flow: call API, validate response, persist user data, set state.
 *
 * Fix 1: the JWT token is now in an httpOnly cookie set by the server.
 * We no longer receive or store the token — only the user profile (role/name).
 *
 * @returns {{ success: boolean, role?: string, error?: string }}
 */
async function authenticateAndPersist(apiFn, extraFields, setUser) {
    const result = await apiFn();
    if (!result.success) return { success: false, error: result.error };

    const { role, name } = result.data;

    const userData = normaliseUser({ name, role, ...extraFields });
    // Fix 1: token param is ignored by persistAuth — cookie handles auth
    persistAuth(null, userData);
    setUser(userData);

    return { success: true, role };
}

// ── Provider (identity state only) ───────────────────────────────────────────

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    /** True only during the one-time localStorage hydration on mount. */
    const [initializing, setInitializing] = useState(true);
    /** True while any auth request is in flight. */
    const [busy, setBusy] = useState(false);
    const busyCount = useRef(0);

    // Hydrate from localStorage on mount (profile only — token is in cookie)
    useEffect(() => {
        const stored = loadStoredUser();
        if (stored) {
            setUser(stored);
        }
        setInitializing(false);
    }, []);

    const login = useCallback(
        (email, password) =>
            withBusy(busyCount, setBusy, () =>
                authenticateAndPersist(
                    () => authApi.login(email, password),
                    { email },
                    setUser,
                ),
            ),
        [],
    );

    const pinLogin = useCallback(
        (studentId, pin) =>
            withBusy(busyCount, setBusy, () =>
                authenticateAndPersist(
                    () => authApi.pinLogin(studentId, pin),
                    { studentId },
                    setUser,
                ),
            ),
        [],
    );

    /** @returns {{ success: boolean, error?: string }} */
    const register = useCallback(
        async (name, email, password, role) => {
            const result = await withBusy(busyCount, setBusy, () =>
                authApi.register(name, email, password, role),
            );
            return result.success
                ? { success: true }
                : { success: false, error: result.error };
        },
        [],
    );

    /** @returns {{ success: boolean, error?: string }} */
    const registerStudent = useCallback(
        async (name, studentId, department, pin) => {
            const result = await withBusy(busyCount, setBusy, () =>
                authApi.registerStudent(name, studentId, department, pin),
            );
            return result.success
                ? { success: true }
                : { success: false, error: result.error };
        },
        [],
    );

    const logout = useCallback(async () => {
        // Fix 1: call the server to clear the httpOnly cookie
        await authApi.logout();
        clearAuth();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                initializing,
                busy,
                /** @deprecated Use `initializing` or `busy`. True when either is active. */
                loading: initializing || busy,
                login,
                register,
                registerStudent,
                pinLogin,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
