import { useState, useEffect, useCallback, Fragment } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStudents } from './adminApi';
import api from '../config/axios';
import '../styles/dashboard.css';

/**
 * StudentPanel — student registration form + registered students table.
 *
 * PINs are never stored in frontend state or displayed in the table.
 */
export default function StudentPanel() {
    const { registerStudent } = useAuth();
    const [students, setStudents] = useState([]);
    const [stuName, setStuName] = useState('');
    const [stuId, setStuId] = useState('');
    const [stuDept, setStuDept] = useState('');
    const [stuPin, setStuPin] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [ttsSettings, setTtsSettings] = useState({}); // Store TTS settings per student
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [deleteMessage, setDeleteMessage] = useState('');
    const [deleteError, setDeleteError] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [fetchError, setFetchError] = useState('');
    const [availableVoices, setAvailableVoices] = useState([]);

    useEffect(() => {
        const loadVoices = () => {
            const v = window.speechSynthesis?.getVoices() ?? [];
            if (v.length) setAvailableVoices(v);
        };
        loadVoices();
        window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
        return () => {
            window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
        };
    }, []);

    const loadStudents = useCallback(async () => {
        setFetchError('');
        try {
            const data = await fetchStudents();
            setStudents(data);
            const savedSettings = {};
            data.forEach((s) => {
                const settingsKey = s?.studentId;
                if (settingsKey) {
                    savedSettings[settingsKey] = {
                        rate: parseFloat(s?.tts_settings?.rate ?? 1.0),
                        pitch: parseFloat(s?.tts_settings?.pitch ?? 1.0),
                        voice: s?.tts_settings?.voice ?? null,
                    };
                }
            });
            setTtsSettings(savedSettings);
        } catch {
            console.error('Failed to fetch students');
            setFetchError('Failed to load students. Please refresh and try again.');
        }
    }, []);

    useEffect(() => { loadStudents(); }, [loadStudents]);

    const resetForm = () => {
        setStuName('');
        setStuId('');
        setStuDept('');
        setStuPin('');
        setFieldErrors({});
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);
        setFieldErrors({});

        const nextErrors = {};
        const cleanName = stuName.trim();
        const cleanId = stuId.trim();
        const cleanDept = stuDept.trim();
        const cleanPin = String(stuPin).trim();

        if (!cleanName || cleanName.length < 2) {
            nextErrors.name = 'Name must be at least 2 characters';
        }
        if (!cleanId) {
            nextErrors.studentId = 'Student ID is required';
        } else if (/\s/.test(cleanId)) {
            nextErrors.studentId = 'Student ID must not contain spaces';
        } else if (!/^[a-z0-9]+$/i.test(cleanId)) {
            nextErrors.studentId = 'Student ID must be alphanumeric only';
        }
        if (!cleanDept) {
            nextErrors.department = 'Department is required';
        }
        if (!cleanPin) {
            nextErrors.pin = 'PIN is required';
        } else if (!/^\d{4,6}$/.test(cleanPin)) {
            nextErrors.pin = 'PIN must be 4 to 6 digits only';
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            return;
        }

        try {
            const res = await registerStudent(stuName, stuId, stuDept, stuPin);
            if (res.success) {
                setMessage('Student registered successfully!');
                setIsError(false);
                resetForm();
                if (res.data?.student) {
                    setStudents(prev => [...prev, res.data.student]);
                }
            } else {
                if (res.fields) {
                    setFieldErrors(res.fields);
                }
                setMessage(res.error || 'Registration failed');
                setIsError(true);
            }
        } catch {
            setMessage('An unexpected error occurred.');
            setIsError(true);
        }
    };

    const handleTtsPreview = (studentId) => {
        if (!studentId) return;
        const settings = ttsSettings[studentId] || { rate: 1.0, pitch: 1.0, voice: null };
        const text = 'This is a preview of the text-to-speech settings for this student.';
        const rate = Math.max(0.5, Math.min(2.0, parseFloat(settings.rate) || 1.0));
        const pitch = Math.max(0.5, Math.min(2.0, parseFloat(settings.pitch) || 1.0));

        if (!('speechSynthesis' in window)) return;

        // Voices may not be loaded yet — wait for them.
        const speak = () => {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = rate;
            utterance.pitch = pitch;

            // Match the saved voice name to a loaded voice object.
            if (settings.voice) {
                const voices = window.speechSynthesis.getVoices();
                const match = voices.find(v => v.name === settings.voice);
                if (match) utterance.voice = match;
            }

            // 'interrupted' fires when cancel() is called — this is expected, not an error.
            utterance.onerror = (e) => {
                if (e.error !== 'interrupted') {
                    console.error('TTS preview error:', e);
                }
            };
            window.speechSynthesis.speak(utterance);
        };

        // If voices not loaded yet, wait for voiceschanged.
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            speak();
        } else {
            window.speechSynthesis.addEventListener('voiceschanged', speak, { once: true });
        }
    };

    const handleTtsSave = async (studentId) => {
        if (!studentId) {
            setMessage('Cannot save: Student ID is missing.');
            setIsError(true);
            return;
        }
        const settings = ttsSettings[studentId] || { rate: 1.0, pitch: 1.0, voice: null };

        try {
            const rate = Math.max(0.5, Math.min(2.0, parseFloat(settings.rate) || 1.0));
            const pitch = Math.max(0.5, Math.min(2.0, parseFloat(settings.pitch) || 1.0));
            const response = await api.patch(`/admin/student/${studentId}/tts`, {
                rate,
                pitch,
                voice: settings.voice ?? null,
            });

            if (response.status === 200) {
                setMessage('TTS settings saved successfully!');
                setIsError(false);
            } else {
                setMessage('Failed to save TTS settings');
                setIsError(true);
            }
        } catch {
            setMessage('An error occurred while saving TTS settings');
            setIsError(true);
        }
    };

    const handleDeleteRequest = (studentId) => {
        if (!studentId) return;
        setDeleteMessage('');
        setDeleteError(false);
        setDeleteTargetId(studentId);
    };

    const handleDeleteCancel = () => {
        setDeleteTargetId(null);
    };

    const handleDeleteConfirm = async (studentId) => {
        if (!studentId) return;
        setIsDeleting(true);
        setDeleteMessage('');
        setDeleteError(false);
        try {
            await api.delete(`/admin/students/${studentId}`);
            setStudents(prev => prev.filter(s => s.studentId !== studentId));
            setDeleteMessage('Student deleted successfully');
            setDeleteError(false);
            setDeleteTargetId(null);
        } catch {
            setDeleteMessage('Failed to delete student. Please try again.');
            setDeleteError(true);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTtsChange = (studentId, setting, value) => {
        const parsedValue = parseFloat(value);
        const validValue = isNaN(parsedValue) ? 1.0 : Math.max(0.5, Math.min(2.0, parsedValue));

        setTtsSettings(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [setting]: validValue
            }
        }));
    };

    const filteredStudents = students.filter((s) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.trim().toLowerCase();
        return (
            String(s.name || '').toLowerCase().includes(q) ||
            String(s.studentId || '').toLowerCase().includes(q)
        );
    });

    return (
        <>
            {/* ── Registration form ── */}
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
                    Register New Student
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
                <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="input-dark w-full"
                            value={stuName}
                            onChange={(e) => {
                                setStuName(e.target.value);
                                if (fieldErrors.name) {
                                    setFieldErrors(prev => ({ ...prev, name: '' }));
                                }
                            }}
                            required
                        />
                        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 4 }}>
                            Minimum 2 characters
                        </p>
                        {fieldErrors.name && (
                            <p style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }}>
                                {fieldErrors.name}
                            </p>
                        )}
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Student ID (e.g., STU001)"
                            className="input-dark w-full"
                            value={stuId}
                            onChange={(e) => {
                                setStuId(e.target.value);
                                if (fieldErrors.studentId) {
                                    setFieldErrors(prev => ({ ...prev, studentId: '' }));
                                }
                            }}
                            required
                        />
                        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 4 }}>
                            e.g. STU001 — must be unique, no spaces
                        </p>
                        {fieldErrors.studentId && (
                            <p style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }}>
                                {fieldErrors.studentId}
                            </p>
                        )}
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Department"
                            className="input-dark w-full"
                            value={stuDept}
                            onChange={(e) => {
                                setStuDept(e.target.value);
                                if (fieldErrors.department) {
                                    setFieldErrors(prev => ({ ...prev, department: '' }));
                                }
                            }}
                            required
                        />
                        {fieldErrors.department && (
                            <p style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }}>
                                {fieldErrors.department}
                            </p>
                        )}
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="4-Digit PIN"
                            maxLength="6"
                            className="input-dark w-full"
                            value={stuPin}
                            onChange={(e) => {
                                setStuPin(e.target.value);
                                if (fieldErrors.pin) {
                                    setFieldErrors(prev => ({ ...prev, pin: '' }));
                                }
                            }}
                            required
                            autoComplete="new-password"
                        />
                        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 4 }}>
                            4 to 6 digits only, e.g. 1234
                        </p>
                        {fieldErrors.pin && (
                            <p style={{ color: 'red', fontSize: '0.85rem', marginTop: 4 }}>
                                {fieldErrors.pin}
                            </p>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="md:col-span-2 btn btn-primary"
                    >
                        Register Student
                    </button>
                </form>
            </div>

            {/* ── Student table ── */}
            <div className="table-shell p-6 mb-8">
                <h2
                    className="mb-4"
                    style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}
                >
                    Registered Students
                </h2>
                {deleteMessage && (
                    <div
                        className="p-2 mb-4 rounded"
                        style={{
                            background: deleteError ? 'rgba(255,68,68,0.15)' : 'rgba(0,255,136,0.12)',
                            color: deleteError ? 'var(--danger)' : 'var(--success)',
                            border: `2px solid ${deleteError ? 'var(--danger)' : 'var(--success)'}`,
                        }}
                    >
                        {deleteMessage}
                    </div>
                )}
                <div className="table-header">
                    <div className="table-search">
                        <span>🔎</span>
                        <input
                            type="text"
                            placeholder="Search students"
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
                                <th>Name</th>
                                <th>Student ID</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th>TTS Settings</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student) => {
                                const studentId = student?.studentId;
                                return (
                                <Fragment key={studentId || student.studentId}>
                                    <tr key={studentId || student.studentId}>
                                        <td>{student.name}</td>
                                        <td className="mono">{student.studentId}</td>
                                        <td>{student.department}</td>
                                        <td>
                                            <span className="badge badge-success">Active</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '2px' }}>
                                                        Rate: <strong style={{ color: 'var(--accent)' }}>
                                                            {Number(ttsSettings[student.studentId]?.rate ?? 1.0).toFixed(1)}×
                                                        </strong>
                                                    </span>
                                                    <input
                                                        type="range"
                                                        min="0.5"
                                                        max="2.0"
                                                        step="0.1"
                                                        value={String(ttsSettings[student.studentId]?.rate ?? 1.0)}
                                                        className="w-24"
                                                        style={{ accent: '#f5c800' }}
                                                        onChange={(e) => handleTtsChange(student.studentId, 'rate', e.target.value)}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '2px' }}>
                                                        Pitch: <strong style={{ color: 'var(--accent)' }}>
                                                            {Number(ttsSettings[student.studentId]?.pitch ?? 1.0).toFixed(1)}
                                                        </strong>
                                                    </span>
                                                    <input
                                                        type="range"
                                                        min="0.5"
                                                        max="2.0"
                                                        step="0.1"
                                                        value={String(ttsSettings[student.studentId]?.pitch ?? 1.0)}
                                                        className="w-24"
                                                        style={{ accent: '#f5c800' }}
                                                        onChange={(e) => handleTtsChange(student.studentId, 'pitch', e.target.value)}
                                                    />
                                                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                                                            Voice: <strong style={{ color: 'var(--accent)' }}>
                                                                {ttsSettings[student.studentId]?.voice || 'Browser Default'}
                                                            </strong>
                                                        </span>
                                                        <select
                                                            value={ttsSettings[student.studentId]?.voice || ''}
                                                            onChange={(e) => {
                                                                const key = student.studentId;
                                                                setTtsSettings(prev => ({
                                                                    ...prev,
                                                                    [key]: { ...prev[key], voice: e.target.value || null }
                                                                }));
                                                            }}
                                                            style={{
                                                                background: 'var(--surface)',
                                                                border: '1px solid var(--border)',
                                                                borderRadius: 6,
                                                                color: 'var(--text)',
                                                                padding: '4px 8px',
                                                                fontSize: 12,
                                                            }}
                                                        >
                                                            <option value="">Browser Default</option>
                                                            {availableVoices.map(v => (
                                                                <option key={v.name} value={v.name}>
                                                                    {v.name} ({v.lang})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-outline"
                                                onClick={() => handleTtsPreview(studentId)}
                                            >
                                                🔊 Preview
                                            </button>
                                            <button
                                                className="btn btn-outline"
                                                onClick={() => handleTtsSave(studentId)}
                                                style={{ marginLeft: 8 }}
                                            >
                                                💾 Save
                                            </button>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                disabled={!studentId}
                                                onClick={() => handleDeleteRequest(studentId)}
                                                className="btn btn-danger"
                                                style={{ opacity: studentId ? 1 : 0.5 }}
                                            >
                                                🗑 Delete
                                            </button>
                                        </td>
                                    </tr>
                                    {studentId && deleteTargetId === studentId && (
                                        <tr>
                                            <td colSpan="6" className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    <div style={{ color: 'var(--text)', fontSize: 13 }}>
                                                        Are you sure you want to delete {student.name}? This will also delete all their exam submissions.
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 10 }}>
                                                        <button
                                                            type="button"
                                                            disabled={isDeleting}
                                                            onClick={() => handleDeleteConfirm(studentId)}
                                                            style={{
                                                                background: 'var(--danger)',
                                                                color: 'var(--bg)',
                                                                border: 'none',
                                                                borderRadius: 8,
                                                                padding: '8px 14px',
                                                                fontWeight: 700,
                                                                fontSize: 12,
                                                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                                            }}
                                                        >
                                                            Confirm Delete
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleDeleteCancel}
                                                            style={{
                                                                background: 'var(--border)',
                                                                color: 'var(--muted)',
                                                                border: 'none',
                                                                borderRadius: 8,
                                                                padding: '8px 14px',
                                                                fontWeight: 700,
                                                                fontSize: 12,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                            })}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-5 py-5 text-center" style={{ color: 'var(--text-secondary)' }}>
                                        No students registered yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
