import { useState, useEffect } from 'react';
import api from '../config/axios';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

export default function TeacherDashboard() {
    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        try {
            const res = await api.get('/evaluation/submissions');
            setSubmissions(res.data.items || res.data);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div
            className="min-h-screen"
            style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
            <Navbar />
            <div className="max-w-6xl mx-auto p-6">
                <h1
                    className="mb-6"
                    style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}
                >
                    Teacher Dashboard (Valuation)
                </h1>
                <div
                    className="rounded-lg overflow-hidden"
                    style={{
                        background: 'var(--surface)',
                        borderRadius: 'var(--radius)',
                        border: '3px solid var(--border)',
                    }}
                >
                    <table className="min-w-full" style={{ fontSize: 14 }}>
                        <thead style={{ background: 'var(--card)' }}>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Exam ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Submitted At</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map(sub => (
                                <tr key={sub._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td className="px-6 py-4 whitespace-nowrap">{sub.student}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{sub.student_email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--muted)' }}>{sub.exam_id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--muted)' }}>
                                        {new Date(sub.submitted_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {sub.is_graded ? (
                                            <span
                                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                                style={{ background: 'rgba(0,255,136,0.1)', color: 'var(--success)' }}
                                            >
                                                Graded ({sub.total_marks})
                                            </span>
                                        ) : (
                                            <span
                                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                                style={{ background: 'rgba(255,140,0,0.15)', color: 'var(--warn)' }}
                                            >
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <Link
                                            to={`/evaluation/${sub._id}`}
                                            style={{ color: 'var(--accent)' }}
                                        >
                                            Evaluate
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {submissions.length === 0 && (
                        <div className="p-6 text-center" style={{ color: 'var(--muted)' }}>
                            No submissions found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
