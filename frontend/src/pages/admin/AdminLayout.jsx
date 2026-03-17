import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import useTTS from '../../hooks/useTTS';
import { useAuth } from '../../context/AuthContext';
import '../../styles/dashboard.css';

export default function AdminLayout() {
    const location = useLocation();
    const { speak } = useTTS();
    const { user, logout } = useAuth();

    useEffect(() => {
        let currentPage = 'Dashboard';
        if (location.pathname.includes('/admin/students')) currentPage = 'Students';
        if (location.pathname.includes('/admin/exams')) currentPage = 'Exams';
        if (location.pathname.includes('/admin/staff')) currentPage = 'Staff';
        if (location.pathname.includes('/admin/settings')) currentPage = 'Settings';
        speak(`You are on the ${currentPage} page`);
    }, [location.pathname, speak]);

    return (
        <div className="dash-shell" style={{ display: 'flex' }}>
            <nav className="dash-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="dash-logo">Admin Panel</div>
                <div className="dash-nav">
                    <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')}>🏠 Dashboard</NavLink>
                    <NavLink to="/admin/students" className={({ isActive }) => (isActive ? 'active' : '')}>👥 Students</NavLink>
                    <NavLink to="/admin/exams" className={({ isActive }) => (isActive ? 'active' : '')}>📝 Exams</NavLink>
                    <NavLink to="/admin/staff" className={({ isActive }) => (isActive ? 'active' : '')}>👥 Staff</NavLink>
                    <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? 'active' : '')}>⚙️ Settings</NavLink>
                </div>
                <div className="dash-sidebar-footer">
                    <div className="dash-user">
                        <div><strong>{user?.name || 'Admin'}</strong></div>
                        <div>{user?.role || 'admin'}</div>
                    </div>
                    <button type="button" className="btn btn-outline" onClick={logout}>
                        Logout
                    </button>
                </div>
            </nav>
            <main style={{ flex: 1, padding: 24 }}>
                <Outlet />
            </main>
        </div>
    );
}
