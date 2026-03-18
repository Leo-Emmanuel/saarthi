import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../config/axios';
import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';
import '../styles/dashboard.css';
import { useTeacherSocket } from '../hooks/useTeacherSocket';
import { normalizeSubmission, exportToCSV } from './teacherDashboardUtils';

export default function TeacherDashboard() {
    usePageTitle('Teacher Dashboard');
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchSubmissions = useCallback(async () => {
        setLoading(true);
        setFetchError('');
        try {
            const res = await api.get('/evaluation/submissions');
            setSubmissions(res.data.items || res.data);
        } catch (error) {
            console.error(error);
            setFetchError('Failed to load submissions. Please refresh and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    const handleNewSubmission = useCallback((submission) => {
        console.log('[SOCKET] received new_submission', submission);
        setSubmissions(prev => {
            if (prev.some((s) => s._id === submission._id)) {
                return prev;
            }
            return [submission, ...prev];
        });
    }, []);

    const { connected: socketConnected } = useTeacherSocket(handleNewSubmission);

    const filteredSubmissions = useMemo(() => {
        return submissions
            .map(normalizeSubmission)
            .filter((sub) => {
                if (statusFilter === 'pending' && sub.is_graded) return false;
                if (statusFilter === 'graded' && !sub.is_graded) return false;
                if (searchTerm.trim()) {
                    const q = searchTerm.trim().toLowerCase();
                    return String(sub.student_name || '').toLowerCase().includes(q);
                }
                return true;
            });
    }, [submissions, statusFilter, searchTerm]);

    const scoreBadge = (score, graded) => {
        if (!graded) return 'badge-info';
        const val = Number(score) || 0;
        if (val >= 70) return 'badge-success';
        if (val >= 40) return 'badge-warn';
        return 'badge-danger';
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
                <div className="page-title-row">
                    <h1 style={{ fontSize: 28, fontWeight: 600 }}>Teacher Dashboard</h1>
                    <div className="realtime-indicator">
                        <span className="realtime-dot" style={{ opacity: socketConnected ? 1 : 0.3 }} />
                        {socketConnected ? 'Live updates' : 'Disconnected'}
                    </div>
                </div>
                <div className="table-shell">
                    {fetchError && (
                        <div className="p-3" role="alert" style={{ color: 'var(--danger)' }}>
                            {fetchError}
                        </div>
                    )}
                    <div className="table-header">
                        <div style={{ display: 'flex', gap: 12 }}>
                            <select
                                aria-label="Filter by grading status"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="input-dark"
                            >
                                <option value="all">All</option>
                                <option value="pending">Pending</option>
                                <option value="graded">Graded</option>
                            </select>
                            <div className="table-search">
                                <span>🔎</span>
                                <input
                                    aria-label="Search by student name"
                                    type="text"
                                    placeholder="Search student name"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-dark"
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" className="btn btn-outline" onClick={fetchSubmissions}>
                                ↻ Refresh
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => exportToCSV(filteredSubmissions)}>
                                Export CSV
                            </button>
                        </div>
                    </div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Student ID</th>
                                <th>Exam Title</th>
                                <th>Submitted At</th>
                                <th>Score</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="8" className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                                        <span role="status" aria-live="polite">Loading submissions…</span>
                                    </td>
                                </tr>
                            )}
                            {filteredSubmissions.map(sub => (
                                <tr key={sub._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span>{sub.student_name}</span>
                                            {sub.flagged && (
                                                <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <span aria-hidden="true">⚠️</span> Flagged
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="mono">{sub.studentId || sub.student_id || '—'}</td>
                                    <td>{sub.examTitle || sub.exam_title || '—'}</td>
                                    <td>
                                        {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '—'}
                                    </td>
                                    <td>
                                        <span className={`badge ${scoreBadge(sub.score ?? 0, sub.is_graded)}`}>
                                            {sub.is_graded
                                                ? `${sub.score ?? 0}/${sub.total_marks ?? 0}`
                                                : '—'}
                                        </span>
                                    </td>
                                    <td>
                                        {sub.is_graded ? (
                                            <span className="badge badge-success">Graded</span>
                                        ) : (
                                            <span className="badge badge-warn">Pending</span>
                                        )}
                                    </td>
                                    <td>
                                        <Link
                                            to={`/evaluation/${sub._id}`}
                                            className="btn btn-outline"
                                        >
                                            Evaluate
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && filteredSubmissions.length === 0 && (
                        <div className="p-6 text-center" style={{ color: 'var(--muted)' }}>
                            No submissions found.
                        </div>
                    )}
                </div>
        </div>
    );
}
