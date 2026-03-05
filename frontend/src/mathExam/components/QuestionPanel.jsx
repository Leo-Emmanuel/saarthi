/**
 * QuestionPanel.jsx
 * Read-only left panel showing the current exam question with TTS support.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { getTTS } from '../speech/BrowserTTS.js';

const QuestionPanel = ({ questions = [] }) => {
    const { questionIndex } = useSelector(s => s.examSession);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const ttsAbortRef = useRef(false);

    const currentQ = questions[questionIndex] || null;

    // Helper to format TTS text
    const formatTTS = (q, idx, withWorth = false) =>
        `Question ${idx + 1}. ${q.text}. ${withWorth ? 'Worth ' : ''}${q.marks} marks.`;

    // Centralized TTS handler
    const speakTTS = useCallback(async (items, withWorth = false) => {
        if (isSpeaking) return;
        setIsSpeaking(true);
        ttsAbortRef.current = false;
        const tts = getTTS();
        for (let i = 0; i < items.length; i++) {
            if (ttsAbortRef.current) break;
            const { q, idx } = items[i];
            await tts.speakNow(formatTTS(q, idx, withWorth));
        }
        setIsSpeaking(false);
    }, [isSpeaking]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            ttsAbortRef.current = true;
            getTTS().cancel && getTTS().cancel();
        };
    }, []);

    const readQuestion = async () => {
        if (!currentQ || isSpeaking) return;
        await speakTTS([{ q: currentQ, idx: questionIndex }], true);
    };

    const readAll = async () => {
        if (isSpeaking) return;
        const items = questions.map((q, idx) => ({ q, idx }));
        await speakTTS(items, false);
    };

    return (
        <aside
            aria-label="Exam question paper"
            className="h-full flex flex-col overflow-hidden"
            style={{ background: 'var(--surface)' }}
        >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '3px solid var(--border)' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 2 }} className="uppercase tracking-wider">
                    📄 Question Paper
                </h2>
                <button
                    onClick={readAll}
                    disabled={isSpeaking}
                    aria-label="Read all questions aloud"
                    className="text-xs rounded px-2 py-1 disabled:opacity-40 transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    style={{ color: 'var(--accent)', border: '2px solid var(--accent)' }}
                >
                    {isSpeaking ? '🔊 Reading…' : '🔊 Read All'}
                </button>
            </div>

            {/* Question List */}
            <div
                className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
                role="list"
                aria-label="List of questions"
            >
                {questions.length === 0 && (
                    <div className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
                        No structured questions found.<br />
                        <span className="text-xs">Say "read question" to hear the paper.</span>
                    </div>
                )}

                {questions.map((q, idx) => (
                    <motion.div
                        key={idx}
                        role="listitem"
                        aria-label={`Question ${idx + 1}: ${q.text}. ${q.marks} marks.`}
                        aria-current={idx === questionIndex ? 'true' : undefined}
                        layout
                        className="rounded-xl p-3 border transition-colors cursor-pointer"
                        style={{
                            border: '3px solid var(--border)',
                            background: idx === questionIndex ? 'var(--active-bg)' : 'var(--card)',
                            borderColor: idx === questionIndex ? 'var(--accent)' : 'var(--border)',
                        }}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold mb-1 block" style={{ color: idx === questionIndex ? 'var(--accent)' : 'var(--muted)' }}>
                                    Q{idx + 1} · {q.marks} marks
                                </span>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--text)', fontSize: 15 }}>
                                    {q.text}
                                </p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (isSpeaking) return;
                                    await speakTTS([{ q, idx }], false);
                                }}
                                disabled={isSpeaking}
                                aria-label={`Read question ${idx + 1} aloud`}
                                className="flex-shrink-0 p-1.5 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-40"
                                style={{ color: 'var(--accent)' }}
                            >
                                🔊
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Current question highlighted */}
            {currentQ && (
                <div
                    className="flex-shrink-0 px-4 py-3"
                    style={{ borderTop: '3px solid var(--border)', background: 'var(--card)' }}
                    aria-live="polite"
                    aria-label={`Current question: ${currentQ.text}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
                            Current — Q{questionIndex + 1}
                        </span>
                        <button
                            onClick={readQuestion}
                            disabled={isSpeaking}
                            aria-label="Read current question aloud"
                            className="text-xs disabled:opacity-40 px-2 py-1 rounded transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                            style={{ color: 'var(--accent)' }}
                        >
                            {isSpeaking ? '…' : '🔊 Read'}
                        </button>
                    </div>
                    <p className="text-xs line-clamp-3 leading-relaxed" style={{ color: 'var(--text)' }}>
                        {currentQ.text}
                    </p>
                </div>
            )}
        </aside>
    );
};

export default QuestionPanel;
