import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPathForRole } from '../context/routePolicy';
import { Link, useNavigate } from 'react-router-dom';
import useTTS from '../hooks/useTTS';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const { initUnlock } = useTTS();

    const handleSubmit = async (e) => {
        e.preventDefault();
        initUnlock(); // Unlock global TTS context unconditionally on user click
        setError('');
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
                        <label htmlFor="email" className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            autoComplete="username"
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
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            autoComplete="current-password"
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
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
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
                    <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                        Don't have an account?{' '}
                        <Link to="/register" style={{ color: 'var(--accent)' }}>
                            Register
                        </Link>
                    </p>
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

