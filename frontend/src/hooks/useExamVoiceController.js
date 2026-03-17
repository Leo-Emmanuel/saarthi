import { useCallback, useEffect, useRef, useState } from 'react';
import useSpeechRecognition from './useSpeechRecognition';
import { parseVoiceCommand, VOICE_INTENT } from '../utils/voiceCommands';
import { getVoiceGrammarMode } from '../utils/examConfig';
import { handleVoiceIntent } from '../utils/handleVoiceIntent';

const MIN_RESTART_INTERVAL_MS = 200;

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
    showPlayback,
    showPlaybackRef,
    showReview,
    showPanic,
    secondsLeft,
    speak,
    cancel,
    onHelp,
    onTimeRemaining,
    onSelectMCQ,
    onNext,
    onSkip,
    onPrev,
    onSubmit,
    onClear,
    onRepeat,
    onDictate,
    onInterimTranscript,
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
    const restartDeafUntilRef = useRef(0);
    const shouldBeListeningRef = useRef(false);
    const isSpeakingRef = useRef(false);
    const ttsWaitIntervalRef = useRef(null);
    const ttsDeferredStartTimerRef = useRef(null);

    useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
    useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { secondsLeftRef.current = secondsLeft; }, [secondsLeft]);

    useEffect(() => {
        const id = setInterval(() => {
            isSpeakingRef.current = !!window.speechSynthesis?.speaking;
        }, 120);
        return () => clearInterval(id);
    }, []);

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
        onSkip,
        onSubmit, onClear, onRepeat, onDictate, onInterimTranscript, onReview, onReadOptions, onResume,
        onReadAnswer, onCreateStep, onClearStep, onUndo,
    });
    useEffect(() => {
        callbacksRef.current = {
            speak, cancel, onHelp, onTimeRemaining, onSelectMCQ, onNext, onPrev,
            onSkip,
            onSubmit, onClear, onRepeat, onDictate, onInterimTranscript, onReview, onReadOptions, onResume,
            onReadAnswer, onCreateStep, onClearStep, onUndo,
        };
    });

    const stopListening = useCallback(() => {
        shouldBeListeningRef.current = false;
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
        if (ttsWaitIntervalRef.current) {
            clearInterval(ttsWaitIntervalRef.current);
            ttsWaitIntervalRef.current = null;
        }
        if (ttsDeferredStartTimerRef.current) {
            clearTimeout(ttsDeferredStartTimerRef.current);
            ttsDeferredStartTimerRef.current = null;
        }
        if (activeRecRef.current) {
            try { activeRecRef.current.abort(); } catch { /* noop */ }
            activeRecRef.current = null;
        }
        stopRecognitionOnly();
        setIsListening(false);
    }, [stopRecognitionOnly]);

    const startListeningForCurrent = useCallback((options = {}) => {
        const bypassMinRestart = !!options.bypassMinRestart;
        const restartDeafMs = Number(options.restartDeafMs || 0);
        if (restartDeafMs > 0) {
            restartDeafUntilRef.current = Date.now() + restartDeafMs;
        }
        if (!voiceMode) return;
        // Don't start STT during playback, review, panic, or read-only states.
        const isPlaybackOpen = showPlaybackRef?.current ?? showPlayback;
        if (isPlaybackOpen || showReview || showPanic || readOnly) return;
        // Never start STT while TTS is speaking — would cancel speech.
        if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending) return;

        if (startTimerRef.current) {
            clearTimeout(startTimerRef.current);
            startTimerRef.current = null;
        }

        const q = currentQuestionRef.current;
        if (!q) return;
        if (activeRecRef.current) return; // already listening/starting

        const msSinceStop = Date.now() - lastStopAtRef.current;
        if (!bypassMinRestart && msSinceStop < MIN_RESTART_INTERVAL_MS) {
            const waitMs = MIN_RESTART_INTERVAL_MS - msSinceStop;
            startTimerRef.current = setTimeout(() => {
                startTimerRef.current = null;
                startListeningForCurrent();
            }, waitMs);
            return;
        }

        stopListening();
        shouldBeListeningRef.current = true;

        const sessionId = (sessionRef.current += 1);
        const localGrammarMode = getVoiceGrammarMode(examType, q);
        setActiveGrammarMode(localGrammarMode);
        const startedQuestionId = q?._id != null ? String(q._id) : '';
        const startedQuestionType = q?.type;
        const cooldownMs = Math.max(0, 200 - (Date.now() - lastStopAtRef.current));

        startTimerRef.current = setTimeout(() => {
            if (sessionId !== sessionRef.current) return;
            if (activeRecRef.current) return;

            const rec = createRecognition();
            if (!rec) return;

            activeRecRef.current = rec;
            setIsListening(true);

            const handleResult = async (event) => {
                if (sessionId !== sessionRef.current) return;
                if (Date.now() < restartDeafUntilRef.current) return;

                let interim = '';
                let finalText = '';
                let recognitionConfidence = 0;

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        recognitionConfidence = Math.max(
                            recognitionConfidence,
                            Number(event.results[i][0]?.confidence ?? 0)
                        );
                        finalText += ` ${String(event.results[i][0].transcript || '')}`;
                    } else {
                        interim += ` ${String(event.results[i][0].transcript || '')}`;
                    }
                }

                const interimText = interim.trim();
                if (startedQuestionId && callbacksRef.current.onInterimTranscript) {
                    callbacksRef.current.onInterimTranscript(startedQuestionId, interimText);
                }

                const transcriptRaw = finalText.trim();
                if (!transcriptRaw) return;

                if (!startedQuestionId) return;
                const liveId = currentQuestionRef.current?._id != null ? String(currentQuestionRef.current._id) : '';
                if (liveId && liveId !== startedQuestionId) return;

                if (callbacksRef.current.onInterimTranscript) {
                    callbacksRef.current.onInterimTranscript(startedQuestionId, '');
                }

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
                    stopListening,
                    recognitionConfidence,
                });
            };

            const handleError = (event) => {
                if (sessionId !== sessionRef.current) return;

                const errorCode = String(event?.error || '').toLowerCase();

                if (errorCode === 'no-speech') {
                    // Silent restart path: keep listening UI stable and let onend restart quickly.
                    activeRecRef.current = null;
                    return;
                }

                if (errorCode === 'aborted') {
                    activeRecRef.current = null;
                    return;
                }

                setIsListening(false);
                activeRecRef.current = null;
                lastStopAtRef.current = Date.now();

                if (
                    errorCode === 'not-allowed'
                    || errorCode === 'audio-capture'
                    || errorCode === 'network'
                ) {
                    console.warn(`[Exam STT] error: ${errorCode}`);
                }

                if (errorCode === 'not-allowed') {
                    shouldBeListeningRef.current = false;
                    setIsListening(false);
                    callbacksRef.current.speak?.(
                        'Microphone access was denied. Please enable microphone permissions and reload the page.'
                    );
                } else {
                    consecutiveErrorsRef.current += 1;
                    if (consecutiveErrorsRef.current >= 3) {
                        shouldBeListeningRef.current = false;
                        setIsListening(false);
                    }
                }
            };

            const handleEnd = () => {
                if (sessionId !== sessionRef.current) return;

                if (activeRecRef.current !== rec && activeRecRef.current !== null) return;

                activeRecRef.current = null;
                lastStopAtRef.current = Date.now();
                const isPlaybackOpen = showPlaybackRef?.current ?? showPlayback;

                if (!voiceMode || showReview || showPanic || isPlaybackOpen || readOnly) {
                    setIsListening(false);
                    return;
                }

                if (!shouldBeListeningRef.current) {
                    setIsListening(false);
                    return;
                }

                if (consecutiveErrorsRef.current >= 3) {
                    setIsListening(false);
                    return;
                }

                if (isSpeakingRef.current) {
                    return;
                }

                // Keep isListening=true through quick restart so mic UI doesn't flicker.
                if (retryTimerRef.current) {
                    clearTimeout(retryTimerRef.current);
                }
                retryTimerRef.current = setTimeout(() => {
                    retryTimerRef.current = null;
                    if (sessionId !== sessionRef.current) return;
                    const isPlaybackOpenNow = showPlaybackRef?.current ?? showPlayback;
                    if (isPlaybackOpenNow) {
                        setIsListening(false);
                        return;
                    }
                    if (!shouldBeListeningRef.current) {
                        setIsListening(false);
                        return;
                    }
                    startListeningForCurrent({ bypassMinRestart: true });
                }, 150);
            };

            rec.onresult = handleResult;
            rec.onerror = handleError;
            rec.onend = handleEnd;

            if (activeRecRef.current !== rec) {
                try { rec.abort(); } catch { /* noop */ }
                return;
            }

            try {
                shouldBeListeningRef.current = true;
                rec.start();
                setIsListening(true);
                consecutiveErrorsRef.current = 0;
                console.log('[Exam STT] Listening started.');
            } catch (err) {
                console.error('[Exam STT] Failed to start:', err);
                setIsListening(false);
                consecutiveErrorsRef.current += 1;
            }
        }, cooldownMs);
    }, [
        createRecognition,
        examType,
        readOnly,
        showPlayback,
        showReview,
        showPanic,
        stopListening,
        total,
        voiceMode
    ]);

    // Auto-(re)start listening when in voice mode
    useEffect(() => {
        const isPlaybackOpen = showPlaybackRef?.current ?? showPlayback;
        if (!voiceMode || showReview || showPanic || isPlaybackOpen) return undefined;
        if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = setTimeout(() => startListeningForCurrent(), 300);
        return () => { stopListening(); };
        // showPlayback intentionally omitted — guarded via
        // showPlaybackRef.current to prevent cancellation race
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            if (ttsWaitIntervalRef.current) {
                clearInterval(ttsWaitIntervalRef.current);
                ttsWaitIntervalRef.current = null;
            }
            if (ttsDeferredStartTimerRef.current) {
                clearTimeout(ttsDeferredStartTimerRef.current);
                ttsDeferredStartTimerRef.current = null;
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

