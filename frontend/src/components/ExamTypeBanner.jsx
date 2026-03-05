import { getExamTypeLabel, getQuestionCounts } from '../utils/examConfig';

/**
 * Displays an accessible banner showing the computed exam type.
 *
 * Props:
 *   examType  — 'mcq-only' | 'writing-only' | 'mixed' | string
 *   counts    — { total, mcq, writing, voice } (from getQuestionCounts)
 */
export default function ExamTypeBanner({ examType, counts }) {
    const label = getExamTypeLabel(examType);
    const total = counts?.total ?? 0;
    const mcq = counts?.mcq ?? 0;
    const writing = counts?.writing ?? 0;

    // ── Shared layout ──────────────────────────────────────────────────────────
    const base = {
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontFamily: 'Lexend, sans-serif',
    };

    const iconBox = (borderColor, color, bg) => ({
        width: 36,
        height: 36,
        borderRadius: 8,
        background: bg,
        border: `2px solid ${borderColor}`,
        color,
        fontSize: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    });

    const badge = (color, borderColor) => ({
        background: 'transparent',
        border: `2px solid ${borderColor ?? color}`,
        color,
        padding: '4px 12px',
        borderRadius: 50,
        fontSize: 11,
        fontWeight: 800,
    });

    // ── MCQ-only ───────────────────────────────────────────────────────────────
    if (examType === 'mcq-only') {
        return (
            <section
                role="status"
                aria-label={`Exam type: ${label}`}
                style={{ ...base, background: 'rgba(59,130,246,0.08)', borderBottom: '3px solid #3b82f6' }}
            >
                <div style={iconBox('#3b82f6', '#3b82f6', 'rgba(59,130,246,0.15)')}>🔵</div>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#3b82f6' }}>{label}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {total} questions · Say A, B, C or D to answer
                    </p>
                </div>
                <span style={badge('#3b82f6')}>MCQ ONLY</span>
            </section>
        );
    }

    // ── Writing-only ───────────────────────────────────────────────────────────
    if (examType === 'writing-only') {
        return (
            <section
                role="status"
                aria-label={`Exam type: ${label}`}
                style={{ ...base, background: 'rgba(0,255,136,0.06)', borderBottom: '3px solid var(--success)' }}
            >
                <div style={iconBox('var(--success)', 'var(--success)', 'rgba(0,255,136,0.15)')}>✍️</div>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--success)' }}>{label}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {total} questions · Type or speak your answers
                    </p>
                </div>
                <span style={badge('var(--success)')}>WRITTEN ONLY</span>
            </section>
        );
    }

    // ── Mixed ──────────────────────────────────────────────────────────────────
    if (examType === 'mixed') {
        return (
            <section
                role="status"
                aria-label={`Exam type: ${label}`}
                style={{ ...base, background: 'rgba(234,179,8,0.06)', borderBottom: '3px solid #eab308' }}
            >
                <div style={iconBox('#eab308', '#eab308', 'rgba(234,179,8,0.15)')}>📝</div>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#eab308' }}>{label}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {mcq} Multiple Choice + {writing} Written Answer
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={badge('#3b82f6')}>{mcq} MCQ</span>
                    <span style={badge('var(--success)')}>{writing} Written</span>
                </div>
            </section>
        );
    }

    // ── Fallback ───────────────────────────────────────────────────────────────
    return null;
}
