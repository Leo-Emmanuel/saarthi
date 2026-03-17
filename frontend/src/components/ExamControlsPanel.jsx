function ControlCard({ icon, title, desc, voice, onClick, disabled = false, danger = false }) {
    const simple = !desc && !voice;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={title}
            className="exam-focus w-full text-left"
            style={{
                background: danger ? 'var(--red-bg)' : 'var(--surface2)',
                border: `1px solid ${danger ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '12px 14px',
                opacity: disabled ? 0.6 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
            }}
        >
            {simple ? (
                <div className="flex items-center gap-3">
                    <div
                        aria-hidden="true"
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: danger ? 'var(--red-bg)' : 'var(--yellow-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: danger ? 'var(--red)' : 'var(--yellow)',
                            fontWeight: 900,
                            flexShrink: 0,
                        }}
                    >
                        {icon}
                    </div>
                    <span
                        style={{
                            color: danger ? 'var(--red)' : 'var(--white)',
                            fontWeight: 800,
                            fontSize: 13,
                        }}
                    >
                        {title}
                    </span>
                </div>
            ) : (
                <div className="flex items-start gap-3">
                    <div
                        aria-hidden="true"
                        style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            background: danger ? 'var(--red-bg)' : 'var(--yellow-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: danger ? 'var(--red)' : 'var(--yellow)',
                            fontWeight: 900,
                            flexShrink: 0,
                        }}
                    >
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <div
                            style={{
                                color: danger ? 'var(--red)' : 'var(--white)',
                                fontWeight: 800,
                                fontSize: 13,
                                lineHeight: 1.1,
                            }}
                        >
                            {title}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.68rem', marginTop: 3 }}>
                            {desc}
                        </div>
                        {voice && (
                            <div
                                className="exam-mono"
                                style={{
                                    color: 'var(--yellow-dim)',
                                    fontSize: '0.68rem',
                                    marginTop: 6,
                                    fontStyle: 'italic',
                                }}
                            >
                                Say: “{voice}”
                            </div>
                        )}
                    </div>
                </div>
            )}
        </button>
    );
}

export default function ExamControlsPanel({
    onNewStep,
    onUndo,
    onRedo,
    onReviewAll,
    onSubmit,
    canUndo = false,
    canRedo = false,
    readOnly = false,
}) {
    return (
        <aside className="exam-right fixed top-[56px] bottom-[54px] right-0 overflow-y-auto">
            <div style={{ padding: 16 }} className="space-y-3">
                <div
                    aria-label="Controls"
                    style={{
                        color: 'var(--muted)',
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: 2,
                    }}
                >
                    CONTROLS
                </div>

                <ControlCard
                    icon="+"
                    title="New Step"
                    desc="Add an aligned equation step"
                    voice="create next aligned step"
                    onClick={onNewStep}
                    disabled={readOnly}
                />

                <div className="grid grid-cols-2 gap-3">
                    <ControlCard
                        icon="↶"
                        title="Undo"
                        desc={null}
                        voice={null}
                        onClick={onUndo}
                        disabled={!canUndo}
                    />
                    <ControlCard
                        icon="↷"
                        title="Redo"
                        desc={null}
                        voice={null}
                        onClick={onRedo}
                        disabled={!canRedo}
                    />
                </div>

                <button
                    type="button"
                    onClick={() => {
                        onReviewAll?.();
                    }}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--surface)',
                        border: '2px solid var(--border)',
                        borderRadius: 8,
                        color: 'var(--text)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        minHeight: 48,
                    }}
                >
                    📋 Review All
                </button>

                <div style={{ height: 8 }} />

                <button
                    type="button"
                    onClick={() => {
                        onSubmit?.();
                    }}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--danger)',
                        border: '2px solid var(--danger)',
                        borderRadius: 8,
                        color: 'var(--white)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        minHeight: 48,
                    }}
                >
                    ✅ Submit Exam
                </button>
            </div>
        </aside>
    );
}

