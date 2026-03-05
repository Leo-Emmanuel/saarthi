import { isMCQQuestion } from '../utils/examConfig';

export default function ExamSidebar({
    examType,
    questions = [],
    currentIndex = 0,
    answers = {},
    onJump,
    isAnswered,
    onReadAll,
    onReadQuestion,
}) {
    const withIndex = questions.map((q, i) => ({ q, i }));
    const ordered = examType === 'mixed'
        ? [...withIndex.filter(x => isMCQQuestion(x.q)), ...withIndex.filter(x => !isMCQQuestion(x.q))]
        : withIndex;

    const current = questions[currentIndex] ?? null;

    return (
        <aside className="exam-left fixed top-[56px] bottom-[54px] left-0 flex flex-col">
            {/* Header */}
            <div
                className="flex items-center justify-between gap-2"
                style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}
            >
                <div style={{ color: 'var(--text)', fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>
                    📄 QUESTION PAPER
                </div>
                <button
                    type="button"
                    onClick={onReadAll}
                    className="exam-focus"
                    aria-label="Read all questions"
                    style={{
                        height: 48,
                        padding: '0 10px',
                        borderRadius: 999,
                        border: '1.5px solid var(--border)',
                        background: 'var(--surface2)',
                        color: 'var(--yellow)',
                        fontWeight: 900,
                        fontSize: 12,
                    }}
                >
                    🔊 Read All
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto" style={{ padding: 12 }}>
                <div className="space-y-2">
                    {ordered.map(({ q, i }) => {
                        const active = i === currentIndex;
                        const mcq = isMCQQuestion(q);
                        const answeredQ = isAnswered?.(q, answers[q._id]);
                        const marks = Number(q?.marks ?? 1);
                        const activeBorder = mcq ? 'var(--yellow)' : 'var(--green)';
                        const activeBg = mcq ? 'var(--yellow-bg2)' : 'var(--green-bg)';

                        return (
                            <div key={q._id || i} style={{ position: 'relative' }}>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onJump?.(i)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onJump?.(i);
                                        }
                                    }}
                                    aria-label={`Open question ${i + 1}`}
                                    className="exam-focus"
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        background: active ? activeBg : 'var(--surface)',
                                        border: `1.5px solid ${active ? activeBorder : 'var(--border)'}`,
                                        borderRadius: 10,
                                        padding: '12px 14px',
                                        opacity: answeredQ ? 0.7 : 1,
                                        transition: 'border-color 0.15s, background 0.15s',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div
                                                className="exam-mono"
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 800,
                                                    color: mcq ? 'var(--yellow)' : 'var(--green)',
                                                }}
                                            >
                                                Q{i + 1} · {marks} {marks === 1 ? 'mark' : 'marks'}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onReadQuestion?.(q, i); }}
                                            className="exam-focus"
                                            aria-label={`Read question ${i + 1}`}
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 10,
                                                border: '1.5px solid var(--border)',
                                                background: 'var(--surface2)',
                                                color: 'var(--text)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            🔊
                                        </button>
                                    </div>

                                    <div
                                        style={{
                                            marginTop: 8,
                                            color: 'var(--text)',
                                            fontSize: 13,
                                            lineHeight: 1.35,
                                            overflow: 'hidden',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                        }}
                                    >
                                        {q.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div
                className="flex items-center justify-between gap-2"
                style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}
            >
                <div
                    className="exam-mono"
                    style={{
                        color: current && isMCQQuestion(current) ? 'var(--yellow)' : 'var(--green)',
                        fontWeight: 900,
                        fontSize: 12,
                    }}
                >
                    Current — Q{currentIndex + 1}
                </div>
                <button
                    type="button"
                    onClick={() => current && onReadQuestion?.(current, currentIndex)}
                    className="exam-focus"
                    aria-label="Read current question"
                    style={{
                        height: 48,
                        padding: '0 10px',
                        borderRadius: 999,
                        border: '1.5px solid var(--border)',
                        background: 'var(--surface2)',
                        color: 'var(--yellow)',
                        fontWeight: 900,
                        fontSize: 12,
                    }}
                >
                    🔊 Read
                </button>
            </div>
        </aside>
    );
}

