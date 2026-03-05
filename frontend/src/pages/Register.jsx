import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // ✅ Role is NOT user-selectable on registration — self-registered accounts
    // are always created as 'student'. Elevated roles (teacher/admin) must be
    // assigned by an administrator after account creation.
    const SELF_REGISTER_ROLE = 'student';
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await register(name, email, password, SELF_REGISTER_ROLE);
        if (res.success) {
            navigate('/login');
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
                    Register for Saarthi
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
                        <label htmlFor="name" className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            autoComplete="name"
                            className="w-full"
                            style={{
                                padding: 10,
                                background: 'var(--card)',
                                borderRadius: 'var(--radius)',
                                border: '3px solid var(--border)',
                                color: 'var(--text)',
                                outline: 'none',
                            }}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            autoComplete="email"
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
                            autoComplete="new-password"
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
                    {/* Role is fixed to 'student' for public registration.
                        Teachers and admins are assigned roles by an administrator. */}
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
                        Register
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--accent)' }}>
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
