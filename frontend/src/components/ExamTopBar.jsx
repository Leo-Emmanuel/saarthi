export default function ExamTopBar({
    title = 'Exam',
    subtitle = '',
    timerText = '',
    isTimeCritical = false,
    violationsCount = 0,
    readingMode = 'brief', // 'brief' | 'detailed'
    onToggleReadingMode,
    mcqCount = 0,
    writeCount = 0,
    activePane = 'mcq', // 'mcq' | 'write'
    onPause,
    onHelp,
}) {
    const timerBorder = isTimeCritical ? 'var(--red)' : 'var(--yellow)';
    const timerTextColor = isTimeCritical ? 'var(--red)' : 'var(--yellow)';

    return (
        <header className="exam-topbar fixed top-0 left-0 right-0 z-50" role="banner" aria-label="Exam controls and timer">
            <div className="h-full flex items-center gap-3 px-4">
                {/* Brand */}
                <div
                    aria-label="Saarthi"
                    className="flex items-center justify-center"
                    style={{
                        width: 36,
                        height: 36,
                        background: 'var(--yellow)',
                        borderRadius: 8,
                        color: 'var(--black)',
                        fontWeight: 900,
                    }}
                >
                    S
                </div>

                {/* Title */}
                <div className="min-w-0">
                    <div
                        style={{
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            color: 'var(--white)',
                            lineHeight: 1.1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 360,
                        }}
                    >
                        {title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        {subtitle}
                    </div>
                </div>

                {/* Center timer */}
                <div className="flex-1 flex justify-center">
                    <div
                        role="timer"
                        aria-label={`Time remaining: ${timerText || '--:--:--'}`}
                        aria-live="polite"
                        aria-atomic="true"
                        className="exam-mono flex items-center gap-2 px-3"
                        style={{
                            height: 36,
                            borderRadius: 999,
                            border: `2px solid ${timerBorder}`,
                            color: timerTextColor,
                            fontWeight: 700,
                            letterSpacing: 0.2,
                        }}
                    >
                        <span
                            aria-hidden="true"
                            className={isTimeCritical ? 'exam-blink-fast' : 'exam-blink'}
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                background: timerTextColor,
                                display: 'inline-block',
                            }}
                        />
                        {timerText || '--:--:--'}
                    </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                    {/* Violations */}
                    {violationsCount > 0 && (
                        <div
                            aria-label="Tab switch violations"
                            className="exam-mono"
                            style={{
                                background: 'var(--red-bg)',
                                border: '1px solid var(--red)',
                                borderRadius: 999,
                                padding: '4px 10px',
                                fontSize: '0.68rem',
                                color: 'var(--red)',
                                fontWeight: 700,
                            }}
                        >
                            ⚠ {violationsCount}
                        </div>
                    )}

                    {/* BRIEF/DETAILED */}
                    <button
                        type="button"
                        className="exam-focus"
                        onClick={() => onToggleReadingMode?.(readingMode === 'brief' ? 'detailed' : 'brief')}
                        aria-label="Toggle brief or detailed reading"
                        style={{
                            height: 48,
                            borderRadius: 999,
                            padding: '0 12px',
                            border: `1.5px solid ${readingMode === 'detailed' ? 'var(--yellow)' : 'var(--border)'}`,
                            background: readingMode === 'detailed' ? 'var(--yellow)' : 'transparent',
                            color: readingMode === 'detailed' ? 'var(--black)' : 'var(--text)',
                            fontWeight: 800,
                            fontSize: 12,
                        }}
                    >
                        {readingMode === 'detailed' ? 'DETAILED' : 'BRIEF'}
                    </button>

                    {/* MCQ/WRITE */}
                    <div
                        aria-label="Question type switcher"
                        className="flex items-center gap-1"
                        style={{
                            height: 36,
                            borderRadius: 999,
                            border: `1.5px solid var(--border)`,
                            padding: 2,
                        }}
                    >
                        <div
                            aria-label={`MCQ count ${mcqCount}`}
                            className="exam-mono"
                            style={{
                                height: 30,
                                padding: '0 10px',
                                borderRadius: 999,
                                border: `1.5px solid ${activePane === 'mcq' ? 'var(--yellow)' : 'transparent'}`,
                                background: activePane === 'mcq' ? 'var(--yellow-bg2)' : 'transparent',
                                color: 'var(--text)',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                            }}
                        >
                            MCQ {mcqCount}
                        </div>
                        <div
                            aria-label={`Written count ${writeCount}`}
                            className="exam-mono"
                            style={{
                                height: 30,
                                padding: '0 10px',
                                borderRadius: 999,
                                border: `1.5px solid ${activePane === 'write' ? 'var(--green)' : 'transparent'}`,
                                background: activePane === 'write' ? 'var(--green-bg)' : 'transparent',
                                color: 'var(--text)',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                            }}
                        >
                            WRITE {writeCount}
                        </div>
                    </div>

                    {/* Pause */}
                    <button
                        type="button"
                        className="exam-focus"
                        onClick={onPause}
                        aria-label="Pause exam"
                        style={{
                            height: 48,
                            borderRadius: 999,
                            padding: '0 12px',
                            border: '1.5px solid var(--red)',
                            background: 'var(--red)',
                            color: 'var(--white)',
                            fontWeight: 900,
                            fontSize: 12,
                        }}
                    >
                        ⏸ Pause
                    </button>

                    {/* Help */}
                    <button
                        type="button"
                        className="exam-focus"
                        onClick={onHelp}
                        aria-label="Help"
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 999,
                            border: '1.5px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text)',
                            fontWeight: 900,
                        }}
                    >
                        ?
                    </button>

                    {/* Exam mode */}
                    <div
                        aria-label="Exam mode"
                        className="flex items-center gap-2"
                        style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}
                    >
                        <span aria-hidden="true">🔒</span> Exam mode
                    </div>
                </div>
            </div>
        </header>
    );
}

