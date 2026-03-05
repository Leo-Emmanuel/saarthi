export default function ExamBottomBar({
    isListening = false,
    grammarMode = 'command-prefix', // 'strict' | 'dictation' | 'command-prefix'
    readingMode = 'brief', // 'brief' | 'detailed'
}) {
    const dictation = grammarMode === 'dictation';

    return (
        <footer className="exam-bottombar fixed bottom-0 left-0 right-0 z-50">
            <div className="h-full flex items-center justify-between px-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Mic ball */}
                    <div
                        aria-label={isListening ? 'Microphone listening' : 'Microphone idle'}
                        className={isListening ? 'exam-mic-pulse' : ''}
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 999,
                            background: 'var(--yellow)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--black)',
                            fontWeight: 900,
                        }}
                    >
                        🎤
                    </div>

                    {/* Listening state */}
                    <div className="flex items-center gap-2">
                        <span
                            aria-hidden="true"
                            className={isListening ? 'exam-blink' : ''}
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: isListening ? 'var(--green)' : 'var(--border)',
                                display: 'inline-block',
                            }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>
                            {isListening ? 'Listening…' : 'Not listening'}
                        </span>
                    </div>

                    {/* Mode pills */}
                    {dictation && (
                        <div
                            aria-label="Dictation mode active"
                            style={{
                                height: 30,
                                borderRadius: 999,
                                background: 'var(--green)',
                                color: 'var(--black)',
                                padding: '0 12px',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: 12,
                                fontWeight: 900,
                            }}
                        >
                            DICTATION MODE
                        </div>
                    )}
                    {readingMode === 'detailed' && (
                        <div
                            aria-label="Detailed reading active"
                            style={{
                                height: 30,
                                borderRadius: 999,
                                background: 'var(--yellow)',
                                color: 'var(--black)',
                                padding: '0 12px',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: 12,
                                fontWeight: 900,
                            }}
                        >
                            DETAILED READING
                        </div>
                    )}
                </div>

                {/* Keyboard hints */}
                <div className="flex items-center gap-2">
                    <span
                        className="exam-mono"
                        style={{
                            height: 30,
                            borderRadius: 999,
                            padding: '0 10px',
                            display: 'flex',
                            alignItems: 'center',
                            border: '1.5px solid var(--border)',
                            color: 'var(--muted)',
                            fontSize: 12,
                            fontWeight: 700,
                            background: 'var(--surface2)',
                        }}
                    >
                        [Space] = listen
                    </span>
                    <span
                        className="exam-mono"
                        style={{
                            height: 30,
                            borderRadius: 999,
                            padding: '0 10px',
                            display: 'flex',
                            alignItems: 'center',
                            border: '1.5px solid var(--border)',
                            color: 'var(--muted)',
                            fontSize: 12,
                            fontWeight: 700,
                            background: 'var(--surface2)',
                        }}
                    >
                        [Esc] = stop
                    </span>
                </div>
            </div>
        </footer>
    );
}

