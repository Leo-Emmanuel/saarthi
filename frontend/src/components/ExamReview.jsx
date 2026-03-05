import { normalizeQuestionType, resolveMcqSelection, isQuestionAnswered, countAnsweredByType } from '../utils/mcqUtils';

const resolveMcq = (question, answer) => {
    const resolved = resolveMcqSelection(question, answer);
    if (!resolved.answered) return { answered: false };
    return { answered: true, letter: resolved.letter, value: resolved.option };
};

export default function ExamReview({
    questions = [],
    answers = {},
    onClose,
    onEdit,
    onSubmit,
    showWarning = false,
    unanswered = [],
    onWarningBack,
    onWarningSubmit,
}) {
    if (showWarning) {
        return (
            <div
                className="fixed inset-0 z-[130] flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.9)' }}
                role="dialog"
                aria-modal="true"
                aria-label="Unanswered question warning"
            >
                <div style={{ background: 'var(--surface)', border: '3px solid var(--warn)', borderRadius: 'var(--radius)', padding: 32, maxWidth: 480, textAlign: 'center' }}>
                    <div style={{ fontSize: 48 }} aria-hidden="true">⚠️</div>
                    <h3 style={{ fontSize: 22, color: 'var(--warn)', fontWeight: 800 }}>You have unanswered questions</h3>
                    <p style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.6 }}>
                        You have {unanswered.length} unanswered questions: {unanswered.join(', ')}. Are you sure you want to submit?
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-3">
                        <button type="button" onClick={onWarningBack} aria-label="Go back and answer questions" style={{ minWidth: 44, minHeight: 44, background: 'var(--card)', border: '3px solid var(--accent)', color: 'var(--accent)', fontWeight: 700, borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                            ← Go Back and Answer
                        </button>
                        <button type="button" onClick={onWarningSubmit} aria-label="Submit anyway" style={{ minWidth: 44, minHeight: 44, background: 'var(--warn)', color: 'var(--bg)', border: 'none', fontWeight: 800, borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                            Submit Anyway →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const stats = countAnsweredByType(questions, answers);
    const canSubmit = stats.answered > 0;

    return (
        <div
            className="fixed inset-0 z-[120] overflow-y-auto p-4 md:p-8"
            style={{ background: 'var(--bg)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Review your answers before submit"
        >
            <div className="mx-auto w-full max-w-[700px]">
                <header className="mb-5">
                    <h2 style={{ fontSize: 28, color: 'var(--accent)', fontWeight: 800 }}>📋 Review Your Answers</h2>
                    <p style={{ fontSize: 16, color: 'var(--muted)' }}>Check your answers before submitting</p>
                </header>

                <div className="space-y-[14px]" aria-live="polite">
                    {questions.map((q, index) => {
                        const type = normalizeQuestionType(q.type);
                        const answer = answers[q._id] || '';
                        const mcq = resolveMcq(q, answer);
                        const hasText = isQuestionAnswered(q, answer);

                        return (
                            <article key={q._id || index} style={{ border: '3px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)', padding: '18px 22px' }}>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span style={{ border: '2px solid var(--border)', borderRadius: 999, padding: '2px 10px', fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>Q{index + 1}</span>
                                        <span style={{ border: `2px solid ${type === 'mcq' ? 'var(--accent2)' : 'var(--success)'}`, borderRadius: 999, padding: '2px 10px', fontWeight: 800, fontSize: 10, color: type === 'mcq' ? 'var(--accent2)' : 'var(--success)', background: type === 'mcq' ? 'rgba(255,165,0,0.15)' : 'rgba(0,255,136,0.1)' }}>
                                            {type === 'mcq' ? 'MCQ' : 'WRITE'}
                                        </span>
                                    </div>
                                    <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>{q.marks || 1} marks</span>
                                </div>

                                <p style={{ fontSize: 17, color: 'var(--text)', fontWeight: 600, marginBottom: 10 }}>{q.text}</p>

                                {type === 'mcq' ? (
                                    mcq.answered ? (
                                        <div style={{ color: 'var(--success)', borderLeft: '4px solid var(--success)', paddingLeft: 12 }}>
                                            ✓ Your answer: {mcq.letter} — {mcq.value}
                                        </div>
                                    ) : (
                                        <div style={{ color: 'var(--warn)', borderLeft: '4px solid var(--warn)', paddingLeft: 12 }}>
                                            ⚠ Not answered
                                        </div>
                                    )
                                ) : hasText ? (
                                    <div style={{ color: 'var(--text)', background: 'var(--surface)', borderRadius: 8, padding: '10px 14px', fontSize: 15 }}>
                                        {String(answer).slice(0, 100)}{String(answer).length > 100 ? '…' : ''}
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--warn)' }}>⚠ Not answered</div>
                                )}

                                <div className="mt-3 flex justify-end">
                                    <button type="button" onClick={() => onEdit(index)} aria-label={`Edit answer for question ${index + 1}`} style={{ minWidth: 44, minHeight: 44, border: '2px solid var(--border)', color: 'var(--muted)', background: 'transparent', borderRadius: 999, padding: '6px 14px', fontWeight: 700 }}>
                                        ✏ Edit
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="mt-5" style={{ color: 'var(--muted)', fontSize: 14 }} aria-live="polite">
                    <p>{stats.answered} of {stats.total} questions answered</p>
                    <p>{stats.totalMcq} MCQ · {stats.totalWritten} Written</p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                    <button type="button" onClick={onClose} aria-label="Back to exam" style={{ minWidth: 44, minHeight: 44, border: '3px solid var(--border)', color: 'var(--text)', background: 'var(--card)', borderRadius: 'var(--radius)', padding: '10px 18px', fontWeight: 700 }}>
                        ← Back to Exam
                    </button>
                    <button type="button" onClick={() => onSubmit?.(true)} disabled={!canSubmit} aria-label="Confirm submit exam" style={{ minWidth: 44, minHeight: 44, background: canSubmit ? 'var(--success)' : 'var(--border)', color: 'var(--bg)', fontWeight: 800, border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', opacity: canSubmit ? 1 : 0.6, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
                        ✅ Confirm Submit
                    </button>
                </div>
            </div>
        </div>
    );
}

