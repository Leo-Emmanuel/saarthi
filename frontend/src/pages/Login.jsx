import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPathForRole } from '../context/routePolicy';
import { Link, useNavigate } from 'react-router-dom';
import useTTS from '../hooks/useTTS';
import usePageTitle from '../hooks/usePageTitle';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const { initUnlock } = useTTS();
    usePageTitle('Login');

    const handleSubmit = async (e) => {
        e.preventDefault();
        initUnlock(); // Unlock global TTS context unconditionally on user click
        setError('');

        const trimmedEmail = email.trim();
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
        const passwordOk = password.trim().length > 0;

        setEmailError(emailOk ? '' : 'Invalid email address');
        setPasswordError(passwordOk ? '' : 'Password is required');

        if (!emailOk || !passwordOk) return;

        const res = await login(email, password);
        if (res.success) {
            navigate(getPathForRole(res.role));
        } else {
            setError(res.error);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4"
            style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
            <div
                className="max-w-md w-full"
                style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius)',
                    border: '3px solid var(--border)',
                    padding: 32,
                    boxShadow: '0 0 24px rgba(0,0,0,0.6)',
                }}
            >
                <h2
                    className="text-center mb-6"
                    style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}
                >
                    Login to Saarthi
                </h2>
                {error && (
                    <div
                        className="mb-4"
                        style={{
                            background: 'rgba(255,68,68,0.15)',
                            color: 'var(--danger)',
                            padding: 12,
                            borderRadius: 'var(--radius)',
                            border: '2px solid var(--danger)',
                        }}
                    >
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email-input" className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>
                            Email
                        </label>
                        <input
                            type="email"
                            id="email-input"
                            name="email"
                            autoComplete="username"
                            aria-describedby={emailError ? 'email-error' : undefined}
                            aria-invalid={!!emailError}
                            className="w-full"
                            style={{
                                padding: 10,
                                background: 'var(--card)',
                                borderRadius: 'var(--radius)',
                                border: '3px solid var(--border)',
                                color: 'var(--text)',
                                outline: 'none',
                            }}
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (emailError) setEmailError('');
                            }}
                            required
                        />
                        {emailError && (
                            <p id="email-error" role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginTop: 6 }}>
                                {emailError}
                            </p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="password-input" className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>
                            Password
                        </label>
                        <input
                            type="password"
                            id="password-input"
                            name="password"
                            autoComplete="current-password"
                            aria-describedby={passwordError ? 'password-error' : undefined}
                            aria-invalid={!!passwordError}
                            className="w-full"
                            style={{
                                padding: 10,
                                background: 'var(--card)',
                                borderRadius: 'var(--radius)',
                                border: '3px solid var(--border)',
                                color: 'var(--text)',
                                outline: 'none',
                            }}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (passwordError) setPasswordError('');
                            }}
                            required
                        />
                        {passwordError && (
                            <p id="password-error" role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginTop: 6 }}>
                                {passwordError}
                            </p>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="w-full"
                        style={{
                            background: 'var(--accent)',
                            color: 'var(--bg)',
                            padding: '12px 16px',
                            borderRadius: '50px',
                            fontWeight: 800,
                            border: 'none',
                            fontSize: 15,
                        }}
                    >
                        Login
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <div className="mt-2 border-t pt-2">
                        <Link
                            to="/voice-login"
                            className="flex items-center justify-center gap-2"
                            style={{ color: 'var(--accent2)', fontWeight: 700 }}
                        >
                            🎤 Login with Voice (Student)
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

