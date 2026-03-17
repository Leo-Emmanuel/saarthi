import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';
import '../../styles/dashboard.css';

export default function AdminSettings() {
    const { user } = useAuth();

    const [settings, setSettings] = useState({
        default_tts: { rate: 1.0, pitch: 1.0, voice: '' },
        default_exam_duration: 60,
    });
    const [voices, setVoices] = useState([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(true);

    // Populate the voice selector with available browser voices
    useEffect(() => {
        const loadVoices = () => {
            const available = window.speechSynthesis?.getVoices() ?? [];
            if (available.length) setVoices(available);
        };
        loadVoices();
        window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
        return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
    }, []);

    // Load saved system settings from the backend
    useEffect(() => {
        let alive = true;
        api.get('/admin/settings')
            .then(res => {
                if (!alive) return;
                setSettings({
                    default_tts: {
                        rate: res.data.default_tts?.rate ?? 1.0,
                        pitch: res.data.default_tts?.pitch ?? 1.0,
                        voice: res.data.default_tts?.voice ?? '',
                    },
                    default_exam_duration: res.data.default_exam_duration ?? 60,
                });
            })
            .catch(() => { /* continue with defaults */ })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, []);

    const handleTtsChange = useCallback((field, value) => {
        setSettings(prev => ({
            ...prev,
            default_tts: { ...prev.default_tts, [field]: value },
        }));
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        setMessage('');
        setIsError(false);
        try {
            await api.patch('/admin/settings', {
                default_tts: {
                    rate: Number(settings.default_tts.rate),
                    pitch: Number(settings.default_tts.pitch),
                    voice: settings.default_tts.voice || null,
                },
                default_exam_duration: Number(settings.default_exam_duration),
            });
            setMessage('Settings saved.');
        } catch (err) {
            setIsError(true);
            setMessage(err.response?.data?.error ?? 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    }, [settings]);

    if (loading) {
        return (
            <div style={{ padding: 24, color: 'var(--text-secondary)' }} role="status" aria-live="polite">
                Loading settings…
            </div>
        );
    }

    const tts = settings.default_tts;

    return (
        <div style={{ maxWidth: 600, padding: 24 }}>
            <div className="page-title-row">
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                    ⚙️ Settings
                </h1>
            </div>

            {/* ── Admin profile ── */}
            <div className="dash-card" style={{ marginBottom: 20 }}>
                <h2 style={sectionHeadingStyle}>Admin Profile</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {user?.name ?? '—'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {user?.email ?? '—'}
                    </div>
                    <span style={roleBadgeStyle}>{user?.role ?? 'admin'}</span>
                </div>
            </div>

            {/* ── Default TTS for new students ── */}
            <div className="dash-card" style={{ marginBottom: 20 }}>
                <h2 style={sectionHeadingStyle}>Default Student TTS</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Applied when registering new students. Students can override individually from the Students page.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {/* Rate slider */}
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={fieldLabelStyle}>
                            Speaking Rate&nbsp;
                            <strong style={{ color: 'var(--accent)' }}>{Number(tts.rate).toFixed(1)}×</strong>
                        </span>
                        <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={tts.rate}
                            onChange={(e) => handleTtsChange('rate', e.target.value)}
                            aria-label="Default speaking rate"
                            style={{ accentColor: 'var(--accent)', width: '100%' }}
                        />
                        <div style={rangeHintStyle}>
                            <span>0.5× Slow</span>
                            <span>1.0× Normal</span>
                            <span>2.0× Fast</span>
                        </div>
                    </label>

                    {/* Pitch slider */}
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={fieldLabelStyle}>
                            Pitch&nbsp;
                            <strong style={{ color: 'var(--accent)' }}>{Number(tts.pitch).toFixed(1)}</strong>
                        </span>
                        <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={tts.pitch}
                            onChange={(e) => handleTtsChange('pitch', e.target.value)}
                            aria-label="Default pitch"
                            style={{ accentColor: 'var(--accent)', width: '100%' }}
                        />
                        <div style={rangeHintStyle}>
                            <span>0.5 Low</span>
                            <span>1.0 Normal</span>
                            <span>2.0 High</span>
                        </div>
                    </label>

                    {/* Voice selector — only shown if the browser exposed voices */}
                    {voices.length > 0 && (
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={fieldLabelStyle}>Voice</span>
                            <select
                                value={tts.voice ?? ''}
                                onChange={(e) => handleTtsChange('voice', e.target.value || null)}
                                aria-label="Default TTS voice"
                                style={selectStyle}
                            >
                                <option value="">Browser Default</option>
                                {voices.map(v => (
                                    <option key={v.name} value={v.name}>
                                        {v.name} ({v.lang})
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
            </div>

            {/* ── Exam defaults ── */}
            <div className="dash-card" style={{ marginBottom: 24 }}>
                <h2 style={sectionHeadingStyle}>Exam Defaults</h2>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={fieldLabelStyle}>Default Duration (minutes)</span>
                    <input
                        type="number"
                        min="5"
                        max="300"
                        value={settings.default_exam_duration}
                        onChange={(e) => setSettings(prev => ({ ...prev, default_exam_duration: e.target.value }))}
                        aria-label="Default exam duration in minutes"
                        style={{ ...selectStyle, width: 110 }}
                    />
                </label>
            </div>

            {/* ── Feedback + save ── */}
            {message && (
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        marginBottom: 12,
                        background: isError ? 'var(--danger-dim)' : 'rgba(46,204,113,0.12)',
                        color: isError ? 'var(--danger)' : 'var(--success)',
                        fontSize: 13,
                        fontWeight: 500,
                    }}
                >
                    {message}
                </div>
            )}

            <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                aria-label="Save settings"
            >
                {saving ? 'Saving…' : 'Save Settings'}
            </button>
        </div>
    );
}

// ── Style constants ────────────────────────────────────────────────────────────

const sectionHeadingStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 14,
};

const roleBadgeStyle = {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
    fontSize: 12,
    fontWeight: 600,
    width: 'fit-content',
};

const fieldLabelStyle = {
    fontSize: 13,
    color: 'var(--text-primary)',
    fontWeight: 500,
};

const rangeHintStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: 'var(--text-muted)',
};

const selectStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    padding: '6px 10px',
    fontSize: 13,
};
