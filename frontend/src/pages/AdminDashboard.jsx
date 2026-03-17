import Navbar from '../components/Navbar';
import StudentPanel from './StudentPanel';
import ExamPanel from './ExamPanel';
import usePageTitle from '../hooks/usePageTitle';

/**
 * AdminDashboard — thin layout that composes the two admin panels.
 *
 * Domain logic lives in StudentPanel, ExamPanel, and adminApi.
 */
export default function AdminDashboard() {
    usePageTitle('Admin Dashboard');
    return (
        <div
            className="min-h-screen"
            style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
            <Navbar />
            <div className="max-w-4xl mx-auto p-6">
                <h1
                    className="mb-6"
                    style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}
                >
                    Admin Dashboard
                </h1>
                <StudentPanel />
                <ExamPanel />
            </div>
        </div>
    );
}
