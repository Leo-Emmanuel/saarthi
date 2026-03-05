import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStudents } from './adminApi';
import api from '../config/axios';

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
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [ttsSettings, setTtsSettings] = useState({}); // Store TTS settings per student

    const loadStudents = useCallback(async () => {
        try {
            const data = await fetchStudents();
            setStudents(data);
        } catch {
            console.error('Failed to fetch students');
        }
    }, []);

    useEffect(() => { loadStudents(); }, [loadStudents]);

    const resetForm = () => {
        setStuName('');
        setStuId('');
        setStuDept('');
        setStuPin('');
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);
        try {
            const res = await registerStudent(stuName, stuId, stuDept, stuPin);
            if (res.success) {
                setMessage('Student registered successfully!');
                setIsError(false);
                resetForm();
                loadStudents();
            } else {
                setMessage(res.error || 'Registration failed');
                setIsError(true);
            }
        } catch {
            setMessage('An unexpected error occurred.');
            setIsError(true);
        }
    };

    const handleTtsPreview = (studentId) => {
        if (!studentId) return; // guard against undefined
        const settings = ttsSettings[studentId] || { rate: 1.0, pitch: 1.0 };
        const text = "This is a preview of the text-to-speech settings for this student.";

        const rate = Math.max(0.5, Math.min(2.0, parseFloat(settings.rate) || 1.0));
        const pitch = Math.max(0.5, Math.min(2.0, parseFloat(settings.pitch) || 1.0));

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = rate;
            utterance.pitch = pitch;
            // 'interrupted' fires when cancel() is called — this is expected, not an error.
            utterance.onerror = (e) => {
                if (e.error !== 'interrupted') {
                    console.error('TTS preview error:', e);
                }
            };
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleTtsSave = async (studentId) => {
        if (!studentId) {
            setMessage('Cannot save: Student ID is missing.');
            setIsError(true);
            return;
        }
        const settings = ttsSettings[studentId] || { rate: 1.0, pitch: 1.0 };

        try {
            const response = await api.patch(`/admin/student/${studentId}/tts`, settings);

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
                <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Full Name"
                        className="p-2 border rounded"
                        style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        value={stuName}
                        onChange={(e) => setStuName(e.target.value)}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Student ID (e.g., STU001)"
                        className="p-2 border rounded"
                        style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        value={stuId}
                        onChange={(e) => setStuId(e.target.value)}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Department"
                        className="p-2 border rounded"
                        style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        value={stuDept}
                        onChange={(e) => setStuDept(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="4-Digit PIN"
                        maxLength="4"
                        className="p-2 border rounded"
                        style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        value={stuPin}
                        onChange={(e) => setStuPin(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <button
                        type="submit"
                        className="md:col-span-2"
                        style={{
                            background: 'var(--accent)',
                            color: 'var(--bg)',
                            padding: '10px 16px',
                            borderRadius: '50px',
                            fontWeight: 800,
                            border: 'none',
                        }}
                    >
                        Register Student
                    </button>
                </form>
            </div>

            {/* ── Student table ── */}
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
                    Registered Students
                </h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)', borderBottom: '2px solid var(--border)', background: 'var(--card)' }}>Name</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)', borderBottom: '2px solid var(--border)', background: 'var(--card)' }}>Student ID</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)', borderBottom: '2px solid var(--border)', background: 'var(--card)' }}>Department</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)', borderBottom: '2px solid var(--border)', background: 'var(--card)' }}>Status</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)', borderBottom: '2px solid var(--border)', background: 'var(--card)' }}>TTS Settings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student, index) => (
                                <tr key={student.studentId || index}>
                                    <td className="px-5 py-5 border-b text-sm" style={{ borderColor: 'var(--border)' }}>{student.name}</td>
                                    <td className="px-5 py-5 border-b text-sm" style={{ borderColor: 'var(--border)' }}>{student.studentId}</td>
                                    <td className="px-5 py-5 border-b text-sm" style={{ borderColor: 'var(--border)' }}>{student.department}</td>
                                    <td className="px-5 py-5 border-b text-sm" style={{ borderColor: 'var(--border)' }}>
                                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>Registered</span>
                                    </td>
                                    <td className="px-5 py-5 border-b text-sm" style={{ borderColor: 'var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '2px' }}>Rate:</label>
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="2.0"
                                                    step="0.1"
                                                    defaultValue="1.0"
                                                    className="w-24"
                                                    style={{ accent: '#f5c800' }}
                                                    onChange={(e) => handleTtsChange(student.studentId, 'rate', e.target.value)}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '2px' }}>Pitch:</label>
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="2.0"
                                                    step="0.1"
                                                    defaultValue="1.0"
                                                    className="w-24"
                                                    style={{ accent: '#f5c800' }}
                                                    onChange={(e) => handleTtsChange(student.studentId, 'pitch', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            className="px-3 py-1 text-xs"
                                            onClick={() => handleTtsPreview(student.studentId)}
                                            style={{
                                                background: 'var(--accent)',
                                                color: 'var(--bg)',
                                                borderRadius: '4px',
                                                fontWeight: 600
                                            }}
                                        >
                                            Preview
                                        </button>
                                        <button
                                            className="px-3 py-1 text-xs ml-2"
                                            onClick={() => handleTtsSave(student.studentId)}
                                            style={{
                                                background: 'var(--accent)',
                                                color: 'var(--bg)',
                                                borderRadius: '4px',
                                                fontWeight: 600
                                            }}
                                        >
                                            Save
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {students.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-5 py-5 text-center" style={{ color: 'var(--muted)' }}>
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
