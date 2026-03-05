const ROWS = [
    ['÷', '×', '√', 'x²', 'π', '∑', '∞', '°'],
    ['≠', '≤', '≥', '±', 'α', 'β', 'θ', 'CLR'],
];

export default function MathKeyboard({ onKey }) {
    return (
        <section aria-label="Math formula input" style={{ marginTop: 14 }}>
            <div
                style={{
                    color: 'var(--yellow)',
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                }}
            >
                🧮 MATH FORMULA INPUT
            </div>

            <div
                aria-label="Formula display"
                className="exam-mono"
                style={{
                    marginTop: 10,
                    background: 'var(--black)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    color: 'var(--text)',
                    fontSize: 12,
                }}
            >
                Tap a key below to insert symbols.
            </div>

            <div className="grid grid-cols-8 gap-2" style={{ marginTop: 10 }}>
                {ROWS.flat().map((k) => {
                    const isClr = k === 'CLR';
                    return (
                        <button
                            key={k}
                            type="button"
                            className="exam-focus"
                            onClick={() => onKey?.(k)}
                            aria-label={isClr ? 'Clear formula input' : `Insert ${k}`}
                            style={{
                                height: 48,
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                color: isClr ? 'var(--red)' : 'var(--text)',
                                fontWeight: 800,
                            }}
                        >
                            {k}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

