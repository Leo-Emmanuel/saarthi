export default function StepList({
    questions = [],
    items,
    answers = {},
    currentIndex = 0,
    onJump,
    readOnly = false,
}) {
    const list = Array.isArray(items)
        ? items
        : questions.map((q, index) => ({ q, index }));
    return (
        <section aria-label="All steps">
            <div
                style={{
                    color: 'var(--green)',
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 2,
                }}
            >
                ALL STEPS
            </div>

            <div className="space-y-2" style={{ marginTop: 10 }}>
                {list.map(({ q, index }) => {
                    const active = index === currentIndex;
                    const text = String(answers[q._id] ?? '');
                    return (
                        <button
                            key={q._id || index}
                            type="button"
                            onClick={() => onJump?.(index)}
                            disabled={readOnly}
                            className="exam-focus w-full text-left"
                            aria-label={`Step ${index + 1}`}
                            style={{
                                background: 'var(--surface)',
                                border: `1px solid ${active ? 'var(--yellow)' : 'var(--border)'}`,
                                borderRadius: 8,
                                padding: '10px 14px',
                                opacity: readOnly ? 0.7 : 1,
                                cursor: readOnly ? 'default' : 'pointer',
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    aria-hidden="true"
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 999,
                                        background: 'var(--yellow)',
                                        color: 'var(--black)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 900,
                                        fontSize: 12,
                                        flexShrink: 0,
                                    }}
                                >
                                    {index + 1}
                                </span>
                                <div
                                    style={{
                                        color: text ? 'var(--text)' : 'var(--muted)',
                                        fontSize: 12,
                                        lineHeight: 1.35,
                                        overflow: 'hidden',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                    }}
                                >
                                    {text || 'Empty'}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

