const MCQ_COMMANDS = [
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Next Question',
    'Previous',
    'Read Question',
    'Help',
];

const WRITE_COMMANDS = [
    'Command next',
    'Command previous',
    'Command submit',
    'Help',
];

function CommandPill({ text }) {
    return (
        <span
            className="exam-mono"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 28,
                padding: '0 10px',
                borderRadius: 999,
                background: 'var(--voice-pill-bg)',
                border: '1px solid var(--voice-pill-border)',
                color: 'var(--green)',
                fontSize: 12,
                fontWeight: 700,
            }}
        >
            {text}
        </span>
    );
}

export default function VoiceHintPanel({ mode = 'mcq' }) {
    const commands = mode === 'mcq' ? MCQ_COMMANDS : WRITE_COMMANDS;
    const title = mode === 'mcq' ? 'Voice Commands — MCQ Mode' : 'Voice Commands — Write Mode';

    return (
        <section
            aria-label="Voice commands"
            style={{
                background: 'var(--voice-bg)',
                border: '1.5px solid var(--voice-border)',
                borderRadius: 10,
                padding: '16px 20px',
            }}
        >
            <div className="flex items-center gap-12" style={{ gap: 12 }}>
                <div
                    aria-hidden="true"
                    className="exam-mic-pulse"
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 999,
                        background: 'var(--green-bg)',
                        border: '1.5px solid var(--voice-pill-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--green)',
                        fontWeight: 900,
                        flexShrink: 0,
                    }}
                >
                    🎤
                </div>
                <div className="min-w-0">
                    <div style={{ color: 'var(--white)', fontWeight: 900, fontSize: 14 }}>
                        {title}
                    </div>
                    <div
                        className="exam-mono"
                        style={{ color: 'var(--voice-subtext)', fontSize: 12, marginTop: 4 }}
                    >
                        Speak clearly. You can always tap buttons too.
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
                {commands.map(cmd => <CommandPill key={cmd} text={cmd} />)}
            </div>
        </section>
    );
}

