import ExamQuestionArea from './ExamQuestionArea';
import VoiceHintPanel from './VoiceHintPanel';
import StepList from './StepList';
import MathKeyboard from './MathKeyboard';

export default function ExamMainContent({
    transitionCard,
    currentQuestion,
    currentIndex,
    total,
    answered,
    pct,
    answers,
    readOnly,
    examType,
    isListening,
    voiceMode,
    writtenItems,
    isMcqUI,
    onJump,
    onGoPrev,
    onGoNext,
    onToggleVoiceMode,
    onStartListening,
    onOpenReview,
    onAnswerChange,
    onSpeak,
    getQuestionInstruction,
    readingMode,
    saveStatus,
}) {
    const mcq = isMcqUI(currentQuestion);

    return (
        <div className="fixed top-[56px] bottom-[54px] left-[280px] right-[220px] overflow-y-auto" role="main" aria-label={`Question ${currentIndex + 1} of ${total}`} aria-live="polite">
            <div className="max-w-4xl mx-auto px-6 py-5">
                {/* Transition overlay */}
                {transitionCard && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 200,
                            background: 'rgba(0,0,0,0.92)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 24,
                        }}
                        aria-live="assertive"
                        aria-label="Switching question type"
                    >
                        <div
                            style={{
                                background: 'var(--surface)',
                                border: '2px solid var(--yellow)',
                                borderRadius: 12,
                                padding: '32px 48px',
                                textAlign: 'center',
                                maxWidth: 520,
                            }}
                        >
                            <div style={{ fontSize: 40 }}>🔄</div>
                            <div style={{ marginTop: 10, color: 'var(--muted)', fontWeight: 800 }}>
                                Switching to
                            </div>
                            <div
                                style={{
                                    marginTop: 6,
                                    fontSize: '1.2rem',
                                    fontWeight: 900,
                                    color: transitionCard.to === 'mcq' ? 'var(--yellow)' : 'var(--green)',
                                }}
                            >
                                {transitionCard.to === 'mcq' ? 'MCQ' : 'Written'}
                            </div>
                            <div style={{ marginTop: 10, color: 'var(--muted)', fontSize: 13 }}>
                                {transitionCard.to === 'mcq'
                                    ? 'Say Option A/B/C/D to answer'
                                    : 'Speak or type your step'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Sub-header */}
                <div className="flex items-center justify-between gap-3">
                    <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 2, color: 'var(--muted)' }}>
                        {mcq ? `QUESTION ${currentIndex + 1} OF ${total}` : `STEP ${currentIndex + 1} OF ${total}`}
                    </div>
                    <button
                        type="button"
                        onClick={onStartListening}
                        className="exam-focus exam-mono"
                        aria-label="Click or press Space to listen"
                        style={{
                            height: 48,
                            borderRadius: 999,
                            padding: '0 12px',
                            border: '1.5px solid var(--border)',
                            background: 'var(--surface2)',
                            color: 'var(--yellow)',
                            fontSize: 12,
                            fontWeight: 800,
                        }}
                    >
                        🔊 Click or press Space to listen
                    </button>
                </div>

                {/* Progress */}
                <div style={{ marginTop: 12 }}>
                    <div className="exam-mono" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, marginBottom: 6 }}>
                        {answered} / {total} answered
                    </div>
                    <div
                        role="progressbar"
                        aria-label="Answer progress"
                        aria-valuemin={0}
                        aria-valuemax={total}
                        aria-valuenow={answered}
                        style={{
                            height: 4,
                            borderRadius: 999,
                            background: 'var(--border)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: mcq ? 'var(--yellow)' : 'var(--green)',
                                transition: 'width 0.25s',
                            }}
                        />
                    </div>
                </div>

                {/* Question card */}
                {currentQuestion && (
                    <section
                        aria-label="Question"
                        style={{
                            marginTop: 16,
                            background: 'var(--surface)',
                            border: '1.5px solid var(--border)',
                            borderRadius: 10,
                            padding: '24px 28px',
                        }}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="exam-mono" style={{ fontSize: 12, fontWeight: 900, color: mcq ? 'var(--yellow)' : 'var(--green)' }}>
                                Q{currentIndex + 1} · {mcq ? 'MCQ' : 'Written'} · {Number(currentQuestion?.marks ?? 1)} {Number(currentQuestion?.marks ?? 1) === 1 ? 'Mark' : 'Marks'}
                            </div>
                            <button
                                type="button"
                                className="exam-focus exam-mono"
                                onClick={() => onSpeak(getQuestionInstruction(currentQuestion, currentIndex + 1, total))}
                                aria-label="Read question"
                                style={{
                                    height: 48,
                                    padding: '0 10px',
                                    borderRadius: 999,
                                    border: '1.5px solid var(--border)',
                                    background: 'var(--surface2)',
                                    color: 'var(--muted)',
                                    fontWeight: 800,
                                    fontSize: 12,
                                }}
                            >
                                🔊 Read
                            </button>
                        </div>
                        <div style={{ marginTop: 10, fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.65 }}>
                            {currentQuestion.text}
                        </div>

                        <div style={{ marginTop: 16 }}>
                            <ExamQuestionArea
                                question={currentQuestion}
                                questionIndex={currentIndex}
                                answer={answers[currentQuestion._id != null ? String(currentQuestion._id) : ''] ?? ''}
                                onAnswerChange={onAnswerChange}
                                isVoiceActive={isListening}
                                examType={examType}
                                readOnly={readOnly}
                                onRead={() => onSpeak(getQuestionInstruction(currentQuestion, currentIndex + 1, total))}
                            />
                        </div>

                    </section>
                )}

                {/* Voice hint panel */}
                {voiceMode && (
                    <div style={{ marginTop: 16 }}>
                        <VoiceHintPanel mode={mcq ? 'mcq' : 'write'} />
                    </div>
                )}

                {/* Written extras */}
                {!mcq && (
                    <div style={{ marginTop: 16 }} className="space-y-4">
                        <StepList
                            items={writtenItems}
                            answers={answers}
                            currentIndex={currentIndex}
                            onJump={onJump}
                            readOnly={readOnly}
                        />
                        <MathKeyboard
                            onKey={(k) => {
                                if (!currentQuestion || readOnly) return;
                                const qId = currentQuestion._id != null ? String(currentQuestion._id) : '';
                                const prev = String(answers[qId] ?? '');
                                if (k === 'CLR') {
                                    onAnswerChange(qId, '');
                                    return;
                                }
                                const next = prev ? `${prev} ${k}` : k;
                                onAnswerChange(qId, next);
                            }}
                        />
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center gap-3" style={{ marginTop: 18 }}>
                    <button
                        type="button"
                        onClick={onGoPrev}
                        disabled={currentIndex <= 0}
                        aria-disabled={currentIndex <= 0}
                        className="exam-focus"
                        aria-label={`Go to previous question, question ${Math.max(1, currentIndex)}`}
                        style={{
                            minHeight: 48,
                            padding: '0 16px',
                            borderRadius: 10,
                            border: '1.5px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text)',
                            opacity: currentIndex <= 0 ? 0.6 : 1,
                        }}
                    >
                        Previous
                    </button>

                    <button
                        type="button"
                        onClick={onToggleVoiceMode}
                        className="exam-focus"
                        aria-label={voiceMode ? 'Stop voice mode' : 'Start voice mode'}
                        style={{
                            minHeight: 48,
                            padding: '0 16px',
                            borderRadius: 10,
                            border: '1.5px solid var(--border)',
                            background: 'var(--surface2)',
                            color: 'var(--yellow)',
                            fontWeight: 900,
                        }}
                    >
                        {voiceMode ? '🔇 Stop Voice' : '🎙 Start Voice'}
                    </button>

                    <div style={{ flex: 1 }} />

                    {currentIndex < total - 1 ? (
                        <button
                            type="button"
                            onClick={onGoNext}
                            disabled={currentIndex >= total - 1}
                            aria-disabled={currentIndex >= total - 1}
                            className="exam-focus"
                            aria-label={`Go to next question, question ${Math.min(total, currentIndex + 2)}`}
                            style={{
                                minHeight: 48,
                                padding: '0 18px',
                                borderRadius: 10,
                                border: '1.5px solid var(--yellow)',
                                background: 'var(--yellow)',
                                color: 'var(--black)',
                                fontWeight: 900,
                            }}
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onOpenReview}
                            disabled={answered === 0}
                            aria-disabled={answered === 0}
                            className="exam-focus"
                            aria-label={`Submit exam. ${total - answered} questions unanswered.`}
                            style={{
                                minHeight: 48,
                                padding: '0 18px',
                                borderRadius: 10,
                                border: '1.5px solid var(--red)',
                                background: 'var(--red)',
                                color: 'var(--white)',
                                fontWeight: 900,
                                opacity: answered === 0 ? 0.6 : 1,
                            }}
                        >
                            Review & Submit →
                        </button>
                    )}
                </div>

                {/* Save status */}
                <div
                    aria-live="polite"
                    className="exam-mono"
                    style={{
                        marginTop: 12,
                        fontSize: 12,
                        color: saveStatus === 'error' ? 'var(--red)'
                            : saveStatus === 'saving' ? 'var(--muted)' : 'var(--green)',
                    }}
                >
                    {saveStatus === 'error' ? '⚠ Save failed'
                        : saveStatus === 'saving' ? 'Saving…' : '✓ Draft saved'}
                </div>
            </div>
        </div>
    );
}

