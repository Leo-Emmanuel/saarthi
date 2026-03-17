import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { resolveMcqSelection } from '../utils/mcqUtils';
import MCQOptionCard from './MCQOptionCard';
import MathRenderer from './MathRenderer';

const LETTERS = ['A', 'B', 'C', 'D'];

// ── MCQ renderer ──────────────────────────────────────────────────────────────

function MCQRenderer({ question, answer, onAnswerChange, isVoiceActive, readOnly }) {
    const options = useMemo(() => {
        if (!Array.isArray(question?.options)) return [];
        return question.options.filter(Boolean).slice(0, 4);
    }, [question?.options, question?.text]);

    const resolved = useMemo(
        () => resolveMcqSelection(question, answer),
        [question, answer]
    );
    const selectedIdx = resolved?.answered ? resolved.index : -1;

    const handleSelect = (idx) => {
        if (readOnly) return;
        const letter = LETTERS[idx] ?? String.fromCharCode(65 + idx);
        onAnswerChange?.(question._id, letter);
    };

    const groupName = `mcq-${question?._id ?? 'question'}`;

    return (
        <section
            aria-label={`Question answer — multiple choice`}
            aria-live="polite"
            className="space-y-4"
        >
            <h3 style={{ fontSize: 13, fontWeight: 900, color: 'var(--muted)', letterSpacing: 1 }}>
                SELECT ONE OPTION
            </h3>

            <fieldset role="radiogroup" aria-label="Answer options" disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
                {options.length === 0 ? (
                    <div role="alert" style={{ color: 'var(--muted)', fontSize: 13 }}>
                        Options are not available for this question.
                    </div>
                ) : options.map((opt, idx) => {
                    const letter = LETTERS[idx] ?? String.fromCharCode(65 + idx);
                    const isSelected = idx === selectedIdx;
                    const inputId = `${groupName}-${letter}`;

                    return (
                        <div key={`${letter}-${opt}`} style={{ marginTop: idx === 0 ? 0 : 10 }}>
                            <MCQOptionCard
                                id={inputId}
                                name={groupName}
                                letter={letter}
                                text={opt}
                                checked={isSelected}
                                disabled={readOnly}
                                onChange={() => handleSelect(idx)}
                            />
                        </div>
                    );
                })}
            </fieldset>

            {/* Voice hint */}
            {isVoiceActive && (
                <p
                    aria-live="polite"
                    style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, marginTop: 4 }}
                >
                    🎙 Say Option A, Option B, Option C, or Option D
                </p>
            )}

            {/* Selection status */}
            {resolved?.answered ? (
                <div
                    aria-live="polite"
                    style={{
                        background: 'var(--active-bg)',
                        border: '3px solid var(--success)',
                        color: 'var(--success)',
                        fontSize: 15,
                        fontWeight: 700,
                        padding: '12px 16px',
                        borderRadius: 'var(--radius)',
                    }}
                >
                    ✓ Selected: {resolved.letter} — {resolved.option}
                </div>
            ) : (
                <p style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: 14 }}>
                    No option selected yet
                </p>
            )}
        </section>
    );
}

// ── Custom Hooks ──────────────────────────────────────────────────────────────

function useAnswerSync(initialText, questionId, onAnswerChange, isVoiceActive) {
    const [localText, setLocalText] = useState(initialText);
    const syncTimerRef = useRef(null);
    const onAnswerChangeRef = useRef(onAnswerChange);
    const localTextRef = useRef(localText);
    const qIdRef = useRef(questionId);

    // Update refs to latest values
    onAnswerChangeRef.current = onAnswerChange;
    localTextRef.current = localText;
    qIdRef.current = questionId;

    const isFocusedRef = useRef(false);

    useEffect(() => {
        if (initialText !== localText) {
            if (!isFocusedRef.current || isVoiceActive) {
                setLocalText(initialText);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialText, isVoiceActive]);

    useEffect(() => () => {
        if (syncTimerRef.current) {
            clearTimeout(syncTimerRef.current);
            onAnswerChangeRef.current?.(qIdRef.current, localTextRef.current);
        }
    }, []);

    const handleChange = useCallback((val, readOnly) => {
        if (readOnly) return;
        setLocalText(val);
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => onAnswerChangeRef.current?.(qIdRef.current, val), 600);
    }, [qIdRef, onAnswerChangeRef]);

    const clearCallback = useCallback((readOnly) => {
        if (readOnly) return;
        setLocalText('');
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        onAnswerChangeRef.current?.(qIdRef.current, '');
    }, [qIdRef, onAnswerChangeRef]);

    return {
        localText,
        setLocalText,
        isFocusedRef,
        handleChange,
        clearCallback
    };
}

// ── Components ────────────────────────────────────────────────────────────────

function MathPreview({ text }) {
    if (!text.includes('$')) return null;
    return (
        <div
            aria-label="Math preview"
            aria-live="polite"
            style={{
                borderTop: '1px solid var(--border)',
                padding: '12px 22px 14px',
                background: 'rgba(0,0,0,0.18)',
            }}
        >
            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 6 }}>
                RENDERED MATH
            </div>
            <MathRenderer
                text={text}
                style={{
                    fontSize: '1.1rem',
                    color: 'var(--yellow)',
                    display: 'block',
                    lineHeight: 2,
                }}
            />
        </div>
    );
}

// ── Written / Voice renderer ───────────────────────────────────────────────────

function WrittenRenderer({ question, answer, onAnswerChange, isVoiceActive, readOnly, stepNumber = 1, onRead }) {
    const isVoiceType = question?.type === 'voice';
    const marks = question?.marks ?? null;
    const minWords = Math.max(3, Number(question?.minWords || 0));

    const text = String(answer || '');
    
    const {
        localText,
        setLocalText,
        isFocusedRef,
        handleChange,
        clearCallback
    } = useAnswerSync(text, question?._id, onAnswerChange, isVoiceActive);

    const textareaRef = useRef(null);
    const [createdAt] = useState(() => new Date());

    // Auto-focus when the question changes
    useEffect(() => {
        if (!readOnly && textareaRef.current) {
            try { textareaRef.current.focus(); } catch { /* noop */ }
        }
    }, [question?._id, readOnly]);

    const words = useMemo(
        () => (localText.trim() ? localText.trim().split(/\s+/).filter(Boolean).length : 0),
        [localText]
    );
    const meetsMin = words >= minWords;

    const onChangeOverride = (e) => handleChange(e.target.value, readOnly);

    return (
        <section
            aria-label="Question answer — written"
            className="space-y-3"
        >
            <div
                style={{
                    border: '1.5px solid var(--yellow)',
                    borderRadius: 10,
                    overflow: 'hidden',
                }}
            >
                <div
                    className="flex items-center justify-between gap-2"
                    style={{
                        background: 'var(--bar)',
                        borderBottom: '1px solid var(--border)',
                        padding: '12px 14px',
                    }}
                >
                    <div style={{ color: 'var(--yellow)', fontWeight: 900, letterSpacing: 1 }}>
                        STEP {stepNumber}
                    </div>
                    <button
                        type="button"
                        onClick={onRead}
                        disabled={!onRead || readOnly}
                        className="exam-focus exam-mono"
                        aria-label="Read this step"
                        style={{
                            height: 48,
                            padding: '0 10px',
                            borderRadius: 999,
                            border: '1.5px solid var(--border)',
                            background: 'var(--surface2)',
                            color: 'var(--muted)',
                            fontWeight: 800,
                            fontSize: 12,
                            opacity: !onRead || readOnly ? 0.6 : 1,
                            cursor: !onRead || readOnly ? 'default' : 'pointer',
                        }}
                    >
                        🔊 Read
                    </button>
                </div>

                <div style={{ position: 'relative' }}>
                    {/* Voice active overlay hint */}
                    {isVoiceActive && (
                        <p
                            aria-live="polite"
                            style={{
                                marginBottom: 6,
                                fontSize: 13,
                                fontWeight: 700,
                                color: 'var(--success)',
                            }}
                        >
                            🎙 Speak your answer — it will be transcribed here
                        </p>
                    )}

                    <textarea
                        ref={textareaRef}
                        value={localText}
                        onChange={onChangeOverride}
                        onFocus={() => { isFocusedRef.current = true; }}
                        onBlur={() => {
                            isFocusedRef.current = false;
                            // Reconcile: if the parent pushed an update while we were focused,
                            // apply it now that focus has left (avoids permanently stale state).
                            setLocalText(prev => (prev !== text ? text : prev));
                        }}
                        readOnly={readOnly}
                        rows={6}
                        placeholder={
                            isVoiceType
                                ? 'Your spoken answer will appear here...'
                                : 'Empty — say a math expression to fill this step'
                        }
                        aria-label="Write your answer here"
                        aria-multiline="true"
                        aria-required="true"
                        style={{
                            width: '100%',
                            minHeight: 180,
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 0,
                            color: 'var(--yellow)',
                            fontSize: 18,
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            fontStyle: 'italic',
                            padding: '20px 22px',
                            lineHeight: 1.7,
                            resize: 'vertical',
                            outline: 'none',
                            opacity: readOnly ? 0.75 : 1,
                            cursor: readOnly ? 'default' : 'text',
                        }}
                    />
                    <div
                        className="exam-mono"
                        aria-label="Step timestamp"
                        style={{
                            position: 'absolute',
                            right: 12,
                            bottom: 10,
                            fontSize: '0.68rem',
                            color: 'var(--muted)',
                        }}
                    >
                        {createdAt.toLocaleTimeString()}
                    </div>
                </div>

                <MathPreview text={localText} />
            </div>

            {/* Word count + marks */}
            <div
                aria-live="polite"
                style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}
            >
                <span
                    style={{
                        padding: '5px 12px',
                        borderRadius: 50,
                        fontSize: 12,
                        fontWeight: 700,
                        border: `2px solid ${meetsMin ? 'var(--success)' : 'var(--warn)'}`,
                        color: meetsMin ? 'var(--success)' : 'var(--warn)',
                        background: 'transparent',
                    }}
                >
                    {words} / {minWords} words min
                </span>
                {marks !== null && (
                    <span
                        style={{
                            padding: '5px 12px',
                            borderRadius: 50,
                            fontSize: 12,
                            fontWeight: 700,
                            border: '2px solid var(--border)',
                            color: 'var(--muted)',
                            background: 'transparent',
                        }}
                    >
                        [{marks} {marks === 1 ? 'mark' : 'marks'}]
                    </span>
                )}
            </div>

            {/* Clear button */}
            {localText.length > 0 && !readOnly && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={() => clearCallback(readOnly)}
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
                            cursor: 'pointer',
                        }}
                    >
                        Clear Answer
                    </button>
                </div>
            )}
        </section>
    );
}

// ── ExamQuestionArea (public component) ───────────────────────────────────────

/**
 * Renders the answer input area for a single exam question.
 *
 * Each question is rendered based on its own `question.type` field:
 *   "mcq"   → radio-button options
 *   "text"  → textarea for typed answer
 *   "voice" → textarea filled by voice dictation
 *
 * The `examType` prop is used ONLY for voice-hint context (e.g. grammar mode)
 * and must never gate which input type is shown.
 */
export default function ExamQuestionArea({
    question,
    questionIndex = 0,
    answer = '',
    onAnswerChange,
    isVoiceActive = false,
    examType,           // "mcq-only" | "writing-only" | "mixed" — context only
    readOnly = false,
    onRead,
}) {
    if (!question) return null;

    const type = question.type;
    const hasOptions = Array.isArray(question.options) && question.options.length > 0;

    if (type === 'mcq' || hasOptions) {
        return (
            <MCQRenderer
                question={question}
                answer={answer}
                onAnswerChange={onAnswerChange}
                isVoiceActive={isVoiceActive}
                readOnly={readOnly}
            />
        );
    }

    if (type === 'text' || type === 'voice') {
        return (
            <WrittenRenderer
                question={question}
                answer={answer}
                onAnswerChange={onAnswerChange}
                isVoiceActive={isVoiceActive}
                readOnly={readOnly}
                stepNumber={questionIndex + 1}
                onRead={onRead}
            />
        );
    }

    // Fallback for unknown question type
    return (
        <div
            role="alert"
            style={{
                padding: '16px 20px',
                border: '3px solid var(--danger)',
                borderRadius: 'var(--radius)',
                color: 'var(--danger)',
                fontSize: 15,
                fontWeight: 700,
            }}
        >
            ⚠ Unknown question type: <code>{type}</code>. Please contact your administrator.
        </div>
    );
}
