import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchExams, uploadQuestionPaper, createExam, deleteExam } from './adminApi';

// Derive file-server origin from centralized axios config
import { FILE_ORIGIN } from '../config/fileOrigin';

/**
 * ExamPanel — create / list / delete exams.
 */
export default function ExamPanel() {
    const [exams, setExams] = useState([]);
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(60);
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const loadExams = useCallback(async () => {
        try {
            const data = await fetchExams();
            setExams(data);
        } catch {
            console.error('Failed to fetch exams');
        }
    }, []);

    useEffect(() => { loadExams(); }, [loadExams]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDuration(60);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);
        setUploading(true);

        try {
            let filePath = null;
            if (file) {
                filePath = await uploadQuestionPaper(file);
            }

            await createExam({ title, description, duration, file_path: filePath });

            setMessage('Exam created successfully!');
            setIsError(false);
            resetForm();
            loadExams();
        } catch {
            setMessage('Failed to create exam.');
            setIsError(true);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (examId) => {
        if (!window.confirm('Are you sure you want to delete this exam?')) return;
        try {
            await deleteExam(examId);
            setExams(prev => prev.filter(e => e._id !== examId));
        } catch {
            alert('Failed to delete exam');
        }
    };

    return (
        <>
            {/* ── Create Exam ── */}
            <div
                className="p-6 rounded-lg shadow-md mb-8"
                style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius)',
                    border: '3px solid var(--border)',
                }}
            >
                <h2
                    className="mb-4"
                    style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}
                >
                    Create New Exam
                </h2>
                {message && (
                    <div
                        className="p-2 mb-4 rounded"
                        style={{
                            background: isError ? 'rgba(255,68,68,0.15)' : 'rgba(0,255,136,0.12)',
                            color: isError ? 'var(--danger)' : 'var(--success)',
                            border: `2px solid ${isError ? 'var(--danger)' : 'var(--success)'}`,
                        }}
                    >
                        {message}
                    </div>
                )}
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>Exam Title</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded"
                            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>Description</label>
                        <textarea
                            className="w-full p-2 border rounded"
                            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>Duration (minutes)</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded"
                            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>Question Paper (PDF/Doc)</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="w-full p-2 border rounded"
                            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            onChange={(e) => setFile(e.target.files[0])}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={uploading}
                        style={{
                            background: 'var(--accent)',
                            color: 'var(--bg)',
                            padding: '10px 16px',
                            borderRadius: '50px',
                            fontWeight: 800,
                            border: 'none',
                            opacity: uploading ? 0.7 : 1,
                        }}
                    >
                        {uploading ? 'Processing...' : 'Create Exam'}
                    </button>
                </form>
            </div>

            {/* ── Existing Exams ── */}
            <div
                className="p-6 rounded-lg shadow-md"
                style={{
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius)',
                    border: '3px solid var(--border)',
                }}
            >
                <h2
                    className="mb-4"
                    style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}
                >
                    Existing Exams
                </h2>
                <ul className="space-y-2">
                    {exams.map(exam => (
                        <li
                            key={exam._id}
                            className="p-3 flex justify-between"
                            style={{ borderBottom: '1px solid var(--border)' }}
                        >
                            <div>
                                <span style={{ fontWeight: 600 }}>{exam.title}</span>
                                {exam.file_url && (
                                    <a
                                        href={`${FILE_ORIGIN}${exam.file_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-4 text-sm"
                                        style={{ color: 'var(--accent)' }}
                                    >
                                        View Paper
                                    </a>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <span style={{ color: 'var(--muted)' }}>{exam.duration} mins</span>
                                <button
                                    onClick={() => handleDelete(exam._id)}
                                    className="text-sm font-semibold"
                                    style={{ color: 'var(--danger)' }}
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}
