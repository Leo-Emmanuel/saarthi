import { useMemo, useRef, useEffect, useState } from 'react';
import { MCQ_LETTERS, normalizeQuestionType, resolveMcqSelection } from '../utils/mcqUtils';

export default function QuestionRenderer({
    question,
    answer = '',
    onAnswer,
    isListening = false,
    onReadAloud,
    onToggleListening,
    questionNumber = 1,
    examType = 'mixed',
    saveStatus = 'saved',
}) {
    const type = normalizeQuestionType(question?.type);
    const options = useMemo(() => (Array.isArray(question?.options) ? question.options.slice(0, 4) : []), [question?.options]);
    const selected = useMemo(() => {
        const resolved = resolveMcqSelection(question, answer);
        return resolved.answered ? resolved : null;
    }, [question, answer]);

    const text = String(answer || '');
    const [localText, setLocalText] = useState(text);
    const syncTimerRef = useRef(null);
    useEffect(() => { setLocalText(text); }, [text]);
    useEffect(() => () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); }, []);

    const words = useMemo(() => (
        localText.trim() ? localText.trim().split(/\s+/).filter(Boolean).length : 0
    ), [localText]);
    const chars = localText.length;
    const minWords = Number(question?.minWords || 0);
    const effectiveMin = Math.max(3, minWords || 0);
    const meetsMin = words >= effectiveMin;
    const isWritingOnly = examType === 'writing-only';

    if (type === 'mcq') {
        const isMcqOnly = examType === 'mcq-only';
        return (
            <section aria-label={`Question ${questionNumber} answer panel`} aria-live="polite" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Select one option</h3>
                    <button
                        type="button"
                        onClick={onReadAloud}
                        aria-label="Read this question aloud"
                        style={{
                            minWidth: 44,
                            minHeight: 44,
                            borderRadius: 999,
                            border: '2px solid var(--border)',
                            background: 'var(--card)',
                            color: 'var(--text)',
                            padding: '8px 14px',
                            fontWeight: 700,
                        }}
                    >
                        Read
                    </button>
                </div>

                <div role="group" aria-label={`Answer choices for question ${questionNumber}`} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {options.map((opt, idx) => {
                        const letter = MCQ_LETTERS[idx];
                        const isSelected = selected?.index === idx;
                        const onSelect = () => onAnswer?.(opt);
                        return (
                            <div
                                key={`${letter}-${opt}`}
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`Option ${letter}: ${opt}`}
                                tabIndex={0}
                                onClick={onSelect}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onSelect();
                                    }
                                }}
                                style={{
                                    padding: '18px 20px',
                                    border: `3px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius)',
                                    background: isSelected ? 'var(--active-bg)' : 'var(--card)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    fontSize: isMcqOnly ? 22 : 20,
                                    fontWeight: 700,
                                    color: 'var(--text)',
                                    cursor: 'pointer',
                                    minHeight: isMcqOnly ? 80 : 64,
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span
                                    aria-hidden="true"
                                    style={{
                                        width: isMcqOnly ? 52 : 44,
                                        height: isMcqOnly ? 52 : 44,
                                        borderRadius: 10,
                                        background: isSelected ? 'var(--accent)' : 'var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: isMcqOnly ? 20 : 18,
                                        fontWeight: 800,
                                        color: isSelected ? 'var(--bg)' : 'var(--muted)',
                                        flexShrink: 0,
                                    }}
                                >
                                    {letter}
                                </span>
                                <span>{opt}</span>
                            </div>
                        );
                    })}
                </div>

                {selected ? (
                    <div
                        aria-live="polite"
                        style={{
                            background: 'var(--active-bg)',
                            border: '3px solid var(--success)',
                            color: 'var(--success)',
                            fontSize: 16,
                            fontWeight: 700,
                            padding: '14px 18px',
                            borderRadius: 'var(--radius)',
                        }}
                    >
                        Selected: {selected.letter} - {selected.option}
                    </div>
                ) : (
                    <p style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: 15 }}>
                        Say A, B, C or D or tap an option
                    </p>
                )}
            </section>
        );
    }

    return (
        <section aria-label={`Question ${questionNumber} writing panel`} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Write or dictate your answer</h3>
                <button
                    type="button"
                    onClick={onReadAloud}
                    aria-label="Read this question aloud"
                    style={{
                        minWidth: 44,
                        minHeight: 44,
                        borderRadius: 999,
                        border: '2px solid var(--border)',
                        background: 'var(--card)',
                        color: 'var(--text)',
                        padding: '8px 14px',
                        fontWeight: 700,
                    }}
                >
                    Read
                </button>
            </div>

            <div style={{ position: 'relative' }}>
                <div aria-live="polite" style={{ position: 'absolute', top: 10, right: 10, fontSize: 13, fontWeight: 700, color: saveStatus === 'error' ? 'var(--warn)' : saveStatus === 'saving' ? 'var(--muted)' : 'var(--success)' }}>
                    {saveStatus === 'error' ? 'Save failed' : saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                </div>
                <textarea
                    value={localText}
                    onChange={(e) => {
                        const next = e.target.value;
                        setLocalText(next);
                        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
                        syncTimerRef.current = setTimeout(() => onAnswer?.(next), 600);
                    }}
                    placeholder="Type your answer here, or use voice dictation below..."
                    aria-label="Write your answer here"
                    aria-multiline="true"
                    aria-required="true"
                    rows={isWritingOnly ? 10 : 7}
                    style={{
                        minHeight: isWritingOnly ? 280 : 160,
                        width: '100%',
                        background: 'var(--card)',
                        border: `3px solid ${isListening ? 'var(--accent)' : 'var(--border)'}`,
                        borderBottom: minWords ? `3px solid ${meetsMin ? 'var(--success)' : 'var(--warn)'}` : undefined,
                        borderRadius: 'var(--radius)',
                        color: 'var(--text)',
                        fontSize: isWritingOnly ? 22 : 20,
                        fontFamily: 'Lexend, sans-serif',
                        padding: isWritingOnly ? '28px 32px' : '20px 24px',
                        lineHeight: isWritingOnly ? 1.8 : 1.7,
                        resize: 'vertical',
                        outline: 'none',
                        boxShadow: isListening ? '0 0 0 4px rgba(255,229,0,0.15)' : 'none',
                    }}
                />

                {isWritingOnly && isListening && (
                    <div
                        aria-live="polite"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.85)',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                        }}
                    >
                        <div style={{ fontSize: 48, animation: 'pulse 1.2s infinite' }}>Mic</div>
                        <p style={{ fontSize: 24, color: 'var(--accent)', fontWeight: 800 }}>Listening...</p>
                        <div className="flex items-end gap-1 my-2" aria-hidden="true">
                            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                                <span key={i} style={{ width: 5, height: 10 + (i % 4) * 7, borderRadius: 99, background: 'var(--accent)', animation: `pulse ${0.8 + i * 0.2}s infinite` }} />
                            ))}
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--muted)' }}>Say command stop to finish</p>
                    </div>
                )}
            </div>

            <p aria-live="polite" style={{ color: meetsMin ? 'var(--success)' : 'var(--warn)', fontSize: 13, fontWeight: 700 }}>
                Minimum {effectiveMin} words required - You have written {words} words
            </p>

            <div
                style={{
                    background: 'var(--surface)',
                    border: '3px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                }}
            >
                <button
                    type="button"
                    onClick={onToggleListening}
                    aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
                    style={{
                        width: 58,
                        height: 58,
                        minWidth: 58,
                        minHeight: 58,
                        borderRadius: '50%',
                        background: isListening ? 'var(--accent)' : 'var(--card)',
                        border: isListening ? 'none' : '3px solid var(--accent)',
                        color: isListening ? 'var(--bg)' : 'var(--accent)',
                        boxShadow: isListening ? '0 0 0 8px rgba(255,229,0,0.2)' : 'none',
                        animation: isListening ? 'pulse 1.5s infinite' : 'none',
                        fontWeight: 700,
                        fontSize: 12,
                    }}
                >
                    {isListening ? 'Stop Dictation' : 'Start Dictation'}
                </button>

                <div className="flex-1" aria-live="polite">
                    {isListening ? (
                        <>
                            <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>Listening - speak your answer now</p>
                            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Your words will appear in the box above</p>
                            <div className="flex items-end gap-1 mt-2" aria-hidden="true">
                                {[0, 1, 2, 3, 4].map(i => (
                                    <span key={i} style={{ width: 4, height: 10 + (i % 3) * 6, borderRadius: 99, background: 'var(--accent)', animation: `pulse ${1 + i * 0.2}s infinite` }} />
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <p style={{ color: 'var(--muted)', fontSize: 15 }}>Tap mic or press Space to dictate</p>
                            <p style={{ color: 'var(--border)', fontSize: 13 }}>Voice will auto-fill the answer box</p>
                        </>
                    )}
                </div>

                <div style={{ background: 'var(--card)', border: '2px solid var(--border)', borderRadius: 50, fontSize: 13, color: 'var(--muted)', fontFamily: '"JetBrains Mono", monospace', padding: '6px 12px', whiteSpace: 'nowrap' }}>
                    {words} words
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-[10px]" aria-live="polite">
                <span style={{ padding: '6px 14px', borderRadius: 50, fontSize: 13, fontWeight: 600, background: 'var(--card)', border: '2px solid var(--border)', color: 'var(--text)' }}>
                    {words} words
                </span>
                <span style={{ padding: '6px 14px', borderRadius: 50, fontSize: 13, fontWeight: 600, background: 'var(--card)', border: '2px solid var(--border)', color: 'var(--muted)' }}>
                    {chars} chars
                </span>
                <span style={{ padding: '6px 14px', borderRadius: 50, fontSize: 13, fontWeight: 600, background: 'var(--card)', border: `2px solid ${meetsMin ? 'var(--success)' : 'var(--warn)'}`, color: meetsMin ? 'var(--success)' : 'var(--warn)' }}>
                    {meetsMin ? 'Answer recorded' : 'No answer yet'}
                </span>
            </div>

            {localText.length > 0 && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            setLocalText('');
                            onAnswer?.('');
                        }}
                        aria-label="Clear your written answer"
                        style={{
                            minWidth: 44,
                            minHeight: 44,
                            color: 'var(--danger)',
                            background: 'transparent',
                            border: '2px solid var(--danger)',
                            borderRadius: 50,
                            fontSize: 13,
                            fontWeight: 700,
                            padding: '6px 16px',
                        }}
                    >
                        Clear Answer
                    </button>
                </div>
            )}
        </section>
    );
}
