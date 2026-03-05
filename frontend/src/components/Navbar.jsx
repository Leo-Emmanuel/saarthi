import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav
            className="w-full flex items-center justify-between px-4 py-3"
            style={{
                background: 'var(--surface)',
                borderBottom: '3px solid var(--accent)',
                color: 'var(--text)',
            }}
            aria-label="Saarthi navigation"
        >
            <Link to="/" className="flex items-center gap-2">
                <span
                    aria-hidden="true"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '10px',
                        background: 'var(--accent)',
                        color: 'var(--bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 18,
                    }}
                >
                    S
                </span>
                <span
                    style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--accent)',
                    }}
                >
                    Saarthi
                </span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
                <span style={{ color: 'var(--muted)' }}>
                    Welcome, {user?.name} ({user?.role})
                </span>
                <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Logout"
                    style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        background: 'var(--danger)',
                        color: 'var(--bg)',
                        fontWeight: 700,
                        border: 'none',
                    }}
                >
                    Logout
                </button>
            </div>
        </nav>
    );
}
