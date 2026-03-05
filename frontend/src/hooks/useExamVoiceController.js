import { useCallback, useEffect, useRef, useState } from 'react';
import useSpeechRecognition from './useSpeechRecognition';
import { parseVoiceCommand, VOICE_INTENT } from '../utils/voiceCommands';
import { getVoiceGrammarMode } from '../utils/examConfig';
import { handleVoiceIntent } from '../utils/handleVoiceIntent';

/**
 * Centralizes exam STT lifecycle + intent dispatch.
 * UI can pass callbacks to keep business logic decoupled from the view.
 */
export default function useExamVoiceController({
    examType,
    currentQuestion,
    currentIndex,
    total,
    readOnly,
    showReview,
    showPanic,
    secondsLeft,
    speak,
    cancel,
    onHelp,
    onTimeRemaining,
    onSelectMCQ,
    onNext,
    onPrev,
    onSubmit,
    onClear,
    onRepeat,
    onDictate,
    onReview,
    onReadOptions,
    onResume,
    // Written-question commands
    onReadAnswer,
    onCreateStep,
    onClearStep,
    onUndo,
}) {
    const [voiceMode, setVoiceMode] = useState(true); // voice-first: auto-start listening
    const [isListening, setIsListening] = useState(false);
    const [activeGrammarMode, setActiveGrammarMode] = useState(() => getVoiceGrammarMode(examType, currentQuestion));

    const activeRecRef = useRef(null);
    const sessionRef = useRef(0);
    const currentQuestionRef = useRef(currentQuestion);
    const indexRef = useRef(currentIndex);
    const secondsLeftRef = useRef(secondsLeft);
    const startTimerRef = useRef(null);
    const lastStopAtRef = useRef(0);
    const autoStartTimerRef = useRef(null);
    const consecutiveErrorsRef = useRef(0);
    const retryTimerRef = useRef(null);

    useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
    useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { secondsLeftRef.current = secondsLeft; }, [secondsLeft]);

    useEffect(() => {
        // Keep UI indicator aligned with the most recent question when idle.
        if (!isListening) setActiveGrammarMode(getVoiceGrammarMode(examType, currentQuestion));
    }, [currentQuestion, examType, isListening]);

    const handleUnsupported = useCallback(() => {
        try { speak?.('Voice mode is not supported in this browser. Use Chrome desktop.'); } catch { /* noop */ }
    }, [speak]);

    const { create: createRecognition, stop: stopRecognitionOnly } = useSpeechRecognition({
        onUnsupported: handleUnsupported,
    });

    // Stability refs for external callbacks to prevent infinite re-renders
    const callbacksRef = useRef({
        speak, cancel, onHelp, onTimeRemaining, onSelectMCQ, onNext, onPrev,
        onSubmit, onClear, onRepeat, onDictate, onReview, onReadOptions, onResume,
        onReadAnswer, onCreateStep, onClearStep, onUndo,
    });
    useEffect(() => {
        callbacksRef.current = {
            speak, cancel, onHelp, onTimeRemaining, onSelectMCQ, onNext, onPrev,
            onSubmit, onClear, onRepeat, onDictate, onReview, onReadOptions, onResume,
            onReadAnswer, onCreateStep, onClearStep, onUndo,
        };
    });

    const stopListening = useCallback(() => {
        sessionRef.current += 1; // invalidate any in-flight callbacks
        lastStopAtRef.current = Date.now();
        if (startTimerRef.current) {
            clearTimeout(startTimerRef.current);
            startTimerRef.current = null;
        }
        if (autoStartTimerRef.current) {
            clearTimeout(autoStartTimerRef.current);
            autoStartTimerRef.current = null;
        }
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        if (activeRecRef.current) {
            try { activeRecRef.current.abort(); } catch { /* noop */ }
            activeRecRef.current = null;
        }
        stopRecognitionOnly();
        setIsListening(false);
    }, [stopRecognitionOnly]);

    const startListeningForCurrent = useCallback(() => {
        if (startTimerRef.current) {
            clearTimeout(startTimerRef.current);
            startTimerRef.current = null;
        }

        const q = currentQuestionRef.current;
        if (!q || showReview || readOnly || showPanic) return;
        if (activeRecRef.current) return; // already listening/starting

        stopListening();

        const sessionId = (sessionRef.current += 1);
        const localGrammarMode = getVoiceGrammarMode(examType, q);
        setActiveGrammarMode(localGrammarMode);
        const startedQuestionId = q?._id != null ? String(q._id) : '';
        const startedQuestionType = q?.type;
        const cooldownMs = Math.max(0, 250 - (Date.now() - lastStopAtRef.current));

        startTimerRef.current = setTimeout(() => {
            if (sessionId !== sessionRef.current) return;
            if (activeRecRef.current) return;

            const rec = createRecognition();
            if (!rec) return;

            activeRecRef.current = rec;
            setIsListening(true);

            const handleResult = async (event) => {
                if (sessionId !== sessionRef.current) return;
                const transcriptRaw = String(event?.results?.[0]?.[0]?.transcript ?? '').trim();
                if (!transcriptRaw) return;
                const transcript = transcriptRaw.toLowerCase();

                if (!startedQuestionId) return;
                const liveId = currentQuestionRef.current?._id != null ? String(currentQuestionRef.current._id) : '';
                if (liveId && liveId !== startedQuestionId) return;

                handleVoiceIntent({
                    transcriptRaw,
                    localGrammarMode,
                    startedQuestionType,
                    startedQuestionId,
                    q,
                    indexRef,
                    total,
                    secondsLeftRef,
                    callbacksRef,
                    stopListening
                });
            };

            const handleError = (event) => {
                if (sessionId !== sessionRef.current) return;

                if (event.error === 'no-speech') return;

                console.warn(`[Exam STT] error: ${event.error}`);
                setIsListening(false);
                activeRecRef.current = null;
                consecutiveErrorsRef.current += 1;

                if (event.error !== 'not-allowed' && consecutiveErrorsRef.current < 3) {
                    setTimeout(() => startListeningForCurrent(), 500 * consecutiveErrorsRef.current);
                } else if (consecutiveErrorsRef.current >= 3) {
                    console.error('[Exam STT] Stopping mic due to consecutive errors.');
                    stopListening();
                }
            };

            const handleEnd = () => {
                if (sessionId !== sessionRef.current) return;

                if (activeRecRef.current === rec) {
                    setIsListening(false);
                    activeRecRef.current = null;

                    if (voiceMode && !showReview && !showPanic && consecutiveErrorsRef.current < 3) {
                        const delay = 500 * (consecutiveErrorsRef.current + 1);
                        setTimeout(() => startListeningForCurrent(), delay);
                    }
                }
            };

            rec.onresult = handleResult;
            rec.onerror = handleError;
            rec.onend = handleEnd;

            if (activeRecRef.current !== rec) {
                try { rec.abort(); } catch { /* noop */ }
                return;
            }

            try {
                rec.start();
                setIsListening(true);
                consecutiveErrorsRef.current = 0;
                console.log('[Exam STT] Listening started.');
            } catch (err) {
                console.error('[Exam STT] Failed to start:', err);
                setIsListening(false);
                consecutiveErrorsRef.current += 1;
            }
        }, Math.max(200, cooldownMs));
    }, [
        createRecognition,
        examType,
        readOnly,
        showReview,
        showPanic,
        stopListening,
        total,
        voiceMode
    ]);

    // Auto-(re)start listening when in voice mode
    useEffect(() => {
        if (!voiceMode || showReview || showPanic) return undefined;
        if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = setTimeout(() => startListeningForCurrent(), 300);
        return () => { stopListening(); };
    }, [voiceMode, currentIndex, showReview, showPanic, startListeningForCurrent, stopListening]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (startTimerRef.current) {
                clearTimeout(startTimerRef.current);
                startTimerRef.current = null;
            }
            if (autoStartTimerRef.current) {
                clearTimeout(autoStartTimerRef.current);
                autoStartTimerRef.current = null;
            }
            stopListening();
        };
    }, [stopListening]);

    return {
        voiceMode,
        setVoiceMode,
        isListening,
        startListeningForCurrent,
        stopListening,
        grammarMode: activeGrammarMode,
    };
}

