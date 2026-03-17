export default function StudentDashboardHeader({ onStartVoiceGuidance, voiceActive }) {
    return (
        <div className="flex justify-between items-center mb-2">
            <div>
                <h1
                    style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: 'var(--accent)',
                    }}
                >
                    Student Dashboard
                </h1>
                <p
                    style={{
                        fontSize: 14,
                        color: 'var(--muted)',
                    }}
                >
                    {voiceActive
                        ? '🎙️ Listening… Say "Start Exam" followed by the number.'
                        : 'Tap the mic button to hear your exams read aloud and select by voice.'}
                </p>
            </div>

            <button
                type="button"
                autoFocus
                onClick={onStartVoiceGuidance}
                aria-label="Start voice guidance to choose exams"
                className={voiceActive ? 'animate-pulse' : ''}
                style={{
                    background: voiceActive ? 'var(--green, #22c55e)' : 'var(--accent)',
                    color: 'var(--bg)',
                    padding: '10px 20px',
                    borderRadius: 999,
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background 0.3s ease',
                    minWidth: 180,
                    justifyContent: 'center',
                }}
            >
                {voiceActive ? (
                    <>
                        <span
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: '#fff',
                                display: 'inline-block',
                                animation: 'pulse 1s infinite',
                            }}
                        />
                        Voice Active
                    </>
                ) : (
                    <>🎙️ Start Voice Guidance</>
                )}
            </button>
        </div>
    );
}
