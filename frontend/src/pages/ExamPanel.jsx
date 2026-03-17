import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchExams, uploadQuestionPaper, createExam, deleteExam } from './adminApi';
import { accessibleAlert } from '../utils/accessibleAlert';
import api from '../config/axios';

// Derive file-server origin from centralized axios config
import { FILE_ORIGIN } from '../config/fileOrigin';
import '../styles/dashboard.css';

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
    const [fieldErrors, setFieldErrors] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [questions, setQuestions] = useState([]);
    const [questionErrors, setQuestionErrors] = useState({});
    const [fetchError, setFetchError] = useState('');

    const loadExams = useCallback(async () => {
        setFetchError('');
        try {
            const data = await fetchExams();
            setExams(data);
        } catch {
            console.error('Failed to fetch exams');
            setFetchError('Failed to load exams. Please refresh and try again.');
        }
    }, []);

    useEffect(() => { loadExams(); }, [loadExams]);

    useEffect(() => {
        api.get('/admin/settings')
            .then((res) => {
                const d = res.data?.default_exam_duration;
                if (d && Number(d) >= 5) setDuration(Number(d));
            })
            .catch(() => {});
    }, []);

    const addQuestion = useCallback((type) => {
        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        setQuestions(prev => [
            ...prev,
            {
                id,
                text: '',
                type,
                options: type === 'mcq' ? ['', '', '', ''] : [],
                correct_answer: '',
                marks: 1,
            },
        ]);
    }, []);

    const updateQuestion = useCallback((id, updates) => {
        setQuestions(prev => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
    }, []);

    const removeQuestion = useCallback((id) => {
        setQuestions(prev => prev.filter((q) => q.id !== id));
        setQuestionErrors(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    const resetForm = useCallback(async () => {
        setTitle('');
        setDescription('');
        setFile(null);
        setFieldErrors({});
        setQuestions([]);
        setQuestionErrors({});
        if (fileInputRef.current) fileInputRef.current.value = '';
        try {
            const res = await api.get('/admin/settings');
            const d = res.data?.default_exam_duration;
            setDuration(d && Number(d) >= 5 ? Number(d) : 60);
        } catch {
            setDuration(60);
        }
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);
        setFieldErrors({});
        setUploading(true);

        try {
            const nextErrors = {};
            const cleanTitle = title.trim();
            if (!cleanTitle || cleanTitle.length < 3) {
                nextErrors.title = 'Exam title must be at least 3 characters';
            }
            const nextQuestionErrors = {};
            questions.forEach((q) => {
                const errors = {};
                const text = (q.text || '').trim();
                if (!text || text.length < 10) {
                    errors.text = 'Question text must be at least 10 characters';
                }
                if (q.type === 'mcq' && !String(q.correct_answer || '').trim()) {
                    errors.correct_answer = 'Please select the correct answer';
                }
                if (Object.keys(errors).length > 0) {
                    nextQuestionErrors[q.id] = errors;
                }
            });

            if (Object.keys(nextErrors).length > 0 || Object.keys(nextQuestionErrors).length > 0) {
                setFieldErrors(nextErrors);
                setQuestionErrors(nextQuestionErrors);
                setUploading(false);
                return;
            }

            let filePath = null;
            if (file) {
                const uploadResult = await uploadQuestionPaper(file);
                if (!uploadResult.success) {
                    if (uploadResult.fields) {
                        setFieldErrors(uploadResult.fields);
                    }
                    setMessage(uploadResult.error || 'Failed to upload question paper.');
                    setIsError(true);
                    return;
                }
                filePath = uploadResult.file_url;
            }

            const payloadQuestions = questions.map((q) => ({
                text: (q.text || '').trim(),
                type: q.type,
                options: q.type === 'mcq'
                    ? (Array.isArray(q.options) ? q.options.map(o => String(o || '').trim()).filter(Boolean) : [])
                    : [],
                correct_answer: q.type === 'mcq' ? q.correct_answer : null,
                marks: Number(q.marks) || 1,
            }));

            const result = await createExam({
                title,
                description,
                duration,
                file_path: filePath,
                questions: payloadQuestions,
            });

            setMessage('Exam created successfully!');
            setIsError(false);
            resetForm();
            if (result?.exam) {
                setExams(prev => [...prev, result.exam]);
            }
        } catch (error) {
            const fields = error?.response?.data?.fields;
            if (fields) {
                setFieldErrors(fields);
            }
            setMessage(error?.response?.data?.error || 'Failed to create exam.');
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
            accessibleAlert('Failed to delete exam');
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
                {fetchError && (
                    <div
                        className="p-2 mb-4 rounded"
                        role="alert"
                        style={{
                            background: 'rgba(255,68,68,0.15)',
                            color: 'var(--danger)',
                            border: '2px solid var(--danger)',
                        }}
                    >
                        {fetchError}
                    </div>
                )}
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>Exam Title</label>
                        <input
                            type="text"
                            className="input-dark w-full"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                if (fieldErrors.title) {
                                    setFieldErrors(prev => ({ ...prev, title: '' }));
                                }
                            }}
                            required
                        />
                        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 4 }}>
                            Minimum 3 characters
                        </p>
                        {fieldErrors.title && (
                            <p style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }}>
                                {fieldErrors.title}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>Description</label>
                        <textarea
                            className="input-dark w-full"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>Duration (minutes)</label>
                        <input
                            type="number"
                            className="input-dark w-full"
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
                            className="input-dark w-full"
                            onChange={(e) => {
                                setFile(e.target.files[0]);
                                if (fieldErrors.file) {
                                    setFieldErrors(prev => ({ ...prev, file: '' }));
                                }
                            }}
                        />
                        {fieldErrors.file && (
                            <p style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }}>
                                {fieldErrors.file}
                            </p>
                        )}
                    </div>
                    <div
                        className="dash-card"
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                        }}
                    >
                        <div className="page-title-row" style={{ marginBottom: 12 }}>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                                    Questions (optional)
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Add MCQ or text questions. MCQ correct answer is required.
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => addQuestion('mcq')}>
                                    + Add MCQ
                                </button>
                                <button type="button" className="btn btn-outline" onClick={() => addQuestion('text')}>
                                    + Add Text
                                </button>
                            </div>
                        </div>
                        {questions.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                No questions added yet. You can also upload a question paper instead.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {questions.map((q, idx) => (
                                    <div
                                        key={q.id}
                                        className="dash-card"
                                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                                    >
                                        <div className="page-title-row" style={{ marginBottom: 10 }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                Question {idx + 1}
                                            </div>
                                            <button type="button" className="btn btn-danger" onClick={() => removeQuestion(q.id)}>
                                                Remove
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gap: 10 }}>
                                            <div>
                                                <label className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>
                                                    Question Text
                                                </label>
                                                <textarea
                                                    className="input-dark w-full"
                                                    value={q.text}
                                                    onChange={(e) => {
                                                        updateQuestion(q.id, { text: e.target.value });
                                                        if (questionErrors[q.id]?.text) {
                                                            setQuestionErrors(prev => ({
                                                                ...prev,
                                                                [q.id]: { ...prev[q.id], text: '' },
                                                            }));
                                                        }
                                                    }}
                                                />
                                                {questionErrors[q.id]?.text && (
                                                    <p style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }}>
                                                        {questionErrors[q.id].text}
                                                    </p>
                                                )}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                <div>
                                                    <label className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>
                                                        Type
                                                    </label>
                                                    <select
                                                        className="input-dark w-full"
                                                        value={q.type}
                                                        onChange={(e) => {
                                                            const nextType = e.target.value;
                                                            const next = { type: nextType };
                                                            if (nextType === 'mcq') {
                                                                next.options = Array.isArray(q.options) && q.options.length === 4
                                                                    ? q.options
                                                                    : ['', '', '', ''];
                                                            } else {
                                                                next.options = [];
                                                                next.correct_answer = '';
                                                            }
                                                            updateQuestion(q.id, next);
                                                            if (questionErrors[q.id]?.correct_answer) {
                                                                setQuestionErrors(prev => ({
                                                                    ...prev,
                                                                    [q.id]: { ...prev[q.id], correct_answer: '' },
                                                                }));
                                                            }
                                                        }}
                                                    >
                                                        <option value="mcq">MCQ</option>
                                                        <option value="text">Text</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block mb-1" style={{ color: 'var(--muted)', fontSize: 14 }}>
                                                        Marks
                                                    </label>
                                                    <input
                                                        type="number"
                                                        className="input-dark w-full"
                                                        value={q.marks}
                                                        onChange={(e) => updateQuestion(q.id, { marks: parseInt(e.target.value, 10) || 1 })}
                                                    />
                                                </div>
                                            </div>
                                            {q.type === 'mcq' && (
                                                <div style={{ display: 'grid', gap: 8 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <label style={{ color: 'var(--muted)', fontSize: 14 }}>Options</label>
                                                        <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                                                            Correct Answer (required)
                                                        </span>
                                                    </div>
                                                    {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                                                        const isSelected = q.correct_answer === letter;
                                                        return (
                                                            <div
                                                                key={`${q.id}_${letter}`}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 10,
                                                                    padding: 8,
                                                                    borderRadius: 10,
                                                                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                                                    background: isSelected ? 'var(--accent-dim)' : 'transparent',
                                                                }}
                                                            >
                                                                <div className="question-label">{letter}</div>
                                                                <input
                                                                    className="input-dark w-full"
                                                                    value={q.options?.[optIdx] || ''}
                                                                    onChange={(e) => {
                                                                        const next = Array.isArray(q.options) ? [...q.options] : ['', '', '', ''];
                                                                        next[optIdx] = e.target.value;
                                                                        updateQuestion(q.id, { options: next });
                                                                    }}
                                                                    placeholder={`Option ${letter}`}
                                                                />
                                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                                                    <input
                                                                        type="radio"
                                                                        name={`correct_${q.id}`}
                                                                        checked={isSelected}
                                                                        onChange={() => {
                                                                            updateQuestion(q.id, { correct_answer: letter });
                                                                            if (questionErrors[q.id]?.correct_answer) {
                                                                                setQuestionErrors(prev => ({
                                                                                    ...prev,
                                                                                    [q.id]: { ...prev[q.id], correct_answer: '' },
                                                                                }));
                                                                            }
                                                                        }}
                                                                    />
                                                                    Correct
                                                                </label>
                                                            </div>
                                                        );
                                                    })}
                                                    {questionErrors[q.id]?.correct_answer && (
                                                        <p style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }}>
                                                            {questionErrors[q.id].correct_answer}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={uploading}
                        className="btn btn-primary"
                        style={{ opacity: uploading ? 0.7 : 1 }}
                    >
                        {uploading ? 'Processing...' : 'Create Exam'}
                    </button>
                </form>
            </div>

            {/* ── Existing Exams ── */}
            <div className="table-shell p-6">
                <h2
                    className="mb-4"
                    style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}
                >
                    Existing Exams
                </h2>
                <div className="table-header">
                    <div className="table-search">
                        <span>🔎</span>
                        <input
                            type="text"
                            placeholder="Search exams"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-dark"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Exam</th>
                                <th>Duration</th>
                                <th>Paper</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exams
                                .filter((exam) => {
                                    if (!searchTerm.trim()) return true;
                                    const q = searchTerm.trim().toLowerCase();
                                    return String(exam.title || '').toLowerCase().includes(q);
                                })
                                .map(exam => (
                                    <tr key={exam._id}>
                                        <td>{exam.title}</td>
                                        <td>{exam.duration} mins</td>
                                        <td>
                                            {exam.file_url ? (
                                                <a
                                                    href={`${FILE_ORIGIN}${exam.file_url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: 'var(--accent)' }}
                                                >
                                                    View Paper
                                                </a>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleDelete(exam._id)}
                                                className="btn btn-danger"
                                            >
                                                🗑 Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
