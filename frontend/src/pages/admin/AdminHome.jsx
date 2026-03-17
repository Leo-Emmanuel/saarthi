import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/axios';
import '../../styles/dashboard.css';

export default function AdminHome() {
    const [stats, setStats] = useState({
        total_students: 0,
        total_exams: 0,
        total_submissions: 0,
        submissions_in_progress: 0,
        submissions_submitted: 0,
    });
    const [recent, setRecent] = useState([]);

    useEffect(() => {
        let alive = true;
        api.get('/admin/stats')
            .then(res => {
                if (alive) setStats(res.data || {});
            })
            .catch(() => {
                /* noop */
            });
        api.get('/evaluation/submissions?per_page=5')
            .then(res => {
                if (alive) setRecent(res.data.items || []);
            })
            .catch(() => {
                /* noop */
            });
        return () => { alive = false; };
    }, []);

    return (
        <div className="max-w-5xl">
            <div className="page-title-row">
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
                Admin Dashboard
                </h1>
            </div>
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div className="dash-card" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 12, right: 12, color: 'var(--accent)' }}>👥</div>
                    <div className="stat-number">{stats.total_students ?? 0}</div>
                    <div className="stat-label">Total Students</div>
                    <Link to="/admin/students" className="btn btn-primary">Manage Students</Link>
                </div>
                <div className="dash-card" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 12, right: 12, color: 'var(--accent)' }}>📝</div>
                    <div className="stat-number">{stats.total_exams ?? 0}</div>
                    <div className="stat-label">Total Exams</div>
                    <Link to="/admin/exams" className="btn btn-primary">Manage Exams</Link>
                </div>
                <div className="dash-card" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 12, right: 12, color: 'var(--accent)' }}>⏳</div>
                    <div className="stat-number">{stats.submissions_in_progress ?? 0}</div>
                    <div className="stat-label">Pending Submissions</div>
                    <Link to="/admin/exams" className="btn btn-primary">View Exams</Link>
                </div>
            </div>

            <div className="dash-card" style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Recent Activity</div>
                {recent.length === 0 && (
                    <div style={{ color: 'var(--text-secondary)' }}>No recent submissions.</div>
                )}
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {recent.map((item) => (
                        <li key={item._id} style={{ color: 'var(--text-secondary)' }}>
                            {item.student} submitted {item.exam_id} at {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : '—'}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
