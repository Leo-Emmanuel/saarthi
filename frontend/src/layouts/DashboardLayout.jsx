import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

/**
 * DashboardLayout — shared shell for student and teacher views.
 *
 * Renders the common <Navbar> once, then an <Outlet> so nested routes
 * (StudentDashboard, TeacherDashboard) render as content below it.
 */
export default function DashboardLayout() {
    return (
        <div
            className="min-h-screen dash-shell"
            style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
            <Navbar />
            <Outlet />
        </div>
    );
}
