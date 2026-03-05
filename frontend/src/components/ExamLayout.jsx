import { isAnswered } from '../utils/examConfig';

export default function ExamLayout({
    examType,
    questions = [],
    currentIndex = 0,
    answers = {},
    onJump,
    children = {},
}) {
    const current = questions[currentIndex];

    if (examType === 'mcq-only') {
        return (
            <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: '260px 1fr' }}>
                <aside
                    style={{ background: 'var(--surface)', borderRight: '3px solid var(--border)', padding: 16 }}
                    aria-label="MCQ quick navigation"
                >
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        {questions.map((q, i) => {
                            const active = i === currentIndex;
                            const answered = isAnswered(q, answers[q._id]);
                            return (
                                <button
                                    key={q._id || i}
                                    type="button"
                                    onClick={() => onJump?.(i)}
                                    aria-label={`Go to question ${i + 1}`}
                                    style={{
                                        width: 52,
                                        height: 52,
                                        minWidth: 52,
                                        minHeight: 52,
                                        borderRadius: 10,
                                        border: `3px solid ${active ? 'var(--accent)' : answered ? 'var(--success)' : 'var(--border)'}`,
                                        fontSize: 16,
                                        fontWeight: 800,
                                        color: active ? 'var(--bg)' : answered ? 'var(--success)' : 'var(--text)',
                                        background: active ? 'var(--accent)' : 'var(--card)',
                                    }}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>🟡 Current  🟢 Answered  ⬛ Not answered</p>
                    {current && (
                        <div style={{ marginTop: 14, border: '3px solid var(--accent)', borderRadius: 'var(--radius)', padding: 16, color: 'var(--text)', fontSize: 16 }}>
                            {current.text}
                        </div>
                    )}
                </aside>
                <main className="min-h-0 overflow-y-auto">{children.questionArea}</main>
            </div>
        );
    }

    if (examType === 'writing-only') {
        return (
            <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: '300px minmax(0,1fr)' }}>
                <aside style={{ background: 'var(--surface)', borderRight: '3px solid var(--border)' }} aria-label="Writing question list">
                    {children.sidebar}
                </aside>
                <main className="min-h-0 overflow-y-auto">{children.questionArea}</main>
            </div>
        );
    }

    return (
        <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: '280px 1fr 220px' }}>
            <aside style={{ background: 'var(--surface)', borderRight: '3px solid var(--border)' }} aria-label="Mixed question list">
                {children.sidebar}
            </aside>
            <main className="min-h-0 overflow-y-auto">{children.questionArea}</main>
            <aside style={{ background: 'var(--surface)', borderLeft: '3px solid var(--border)' }} aria-label="Exam controls panel">
                {children.controls}
            </aside>
        </div>
    );
}
