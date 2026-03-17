import { useCallback, useEffect, useRef } from 'react';
import useSpeechRecognition from './useSpeechRecognition';

const WORD_TO_NUMBER = Object.freeze({
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
});

const NUMBER_WORDS_LONGEST_FIRST = Object.freeze(
    Object.keys(WORD_TO_NUMBER).sort((a, b) => b.length - a.length)
);

function extractExamNumber(transcriptRaw) {
    const transcript = String(transcriptRaw || '')
        .toLowerCase()
        .trim();

    // Prefer the explicit command pattern if present.
    const direct = transcript.match(/\bstart\s+exam(?:\s+number)?\s+(\d{1,2}|[a-z]+)\b/);
    if (direct) {
        const token = direct[1];
        if (/^\d+$/.test(token)) return parseInt(token, 10);
        if (WORD_TO_NUMBER[token]) return WORD_TO_NUMBER[token];
    }

    // Otherwise, accept any standalone number.
    const digits = transcript.match(/\b(\d{1,2})\b/);
    if (digits) return parseInt(digits[1], 10);

    // Finally, match number-words as whole words (longest-first so "thirteen"
    // can't be intercepted by "three").
    for (const word of NUMBER_WORDS_LONGEST_FIRST) {
        const re = new RegExp(`\\b${word}\\b`, 'i');
        if (re.test(transcript)) return WORD_TO_NUMBER[word];
    }

    return null;
}

function getFinalTranscriptFromResult(event) {
    const results = event?.results;
    if (!results || !results.length) return '';

    // Some engines may emit final chunks at indexes different from resultIndex.
    // Collect all final chunks from the current event window for reliability.
    const startIndex = Math.max(0, Number(event?.resultIndex) || 0);
    let finalText = '';
    for (let i = startIndex; i < results.length; i += 1) {
        const chunk = results[i];
        if (chunk?.isFinal && chunk?.[0]?.transcript) {
            finalText += ` ${String(chunk[0].transcript).trim()}`;
        }
    }

    if (finalText.trim()) {
        return finalText.trim();
    }

    return '';
}

export default function useExamVoiceGuidance({
    exams,
    onChooseExam,
    autoStart = false,
    isLoading = false,
    onVoiceStart,
    onVoiceEnd,
    onVoiceIssue,
}) {
    const voiceStartedRef = useRef(false);
    const handledSelectionRef = useRef(false);
    const ttsWaitIntervalRef = useRef(null);
    const ttsDeferredStartTimerRef = useRef(null);

    const { create, stop, recognitionRef } = useSpeechRecognition({
        onUnsupported: () => {
            onVoiceIssue?.({
                code: 'unsupported',
                level: 'error',
                message: 'Voice guidance is not supported in this browser.',
            });
            try {
                window.speechSynthesis.speak(
                    new SpeechSynthesisUtterance(
                        'Voice guidance is not supported in this browser.'
                    )
                );
            } catch {
                // noop
            }
        },
    });

    const speak = useCallback((text, { onEnd } = {}) => {
        try {
            const utterance = new SpeechSynthesisUtterance(String(text || ''));
            if (onEnd) utterance.onend = onEnd;
            window.speechSynthesis.speak(utterance);
            return utterance;
        } catch {
            return null;
        }
    }, []);

    const cancelSpeech = useCallback(() => {
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    }, []);

    const stopVoiceGuidance = useCallback(() => {
        cancelSpeech();
        stop();
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* noop */ }
        }
    }, [cancelSpeech, recognitionRef, stop]);

    const startListening = useCallback(function startListeningImpl(currentExams, retryCount = 0) {
        console.log('[Dashboard STT] startListening called, retry:', retryCount);

        // Guard: don't open STT while TTS is speaking.
        if (window.speechSynthesis?.speaking) {
            if (ttsWaitIntervalRef.current) {
                clearInterval(ttsWaitIntervalRef.current);
                ttsWaitIntervalRef.current = null;
            }
            if (ttsDeferredStartTimerRef.current) {
                clearTimeout(ttsDeferredStartTimerRef.current);
                ttsDeferredStartTimerRef.current = null;
            }
            ttsWaitIntervalRef.current = setInterval(() => {
                if (!window.speechSynthesis?.speaking) {
                    clearInterval(ttsWaitIntervalRef.current);
                    ttsWaitIntervalRef.current = null;
                    if (ttsDeferredStartTimerRef.current) {
                        clearTimeout(ttsDeferredStartTimerRef.current);
                        ttsDeferredStartTimerRef.current = null;
                    }
                    ttsDeferredStartTimerRef.current = setTimeout(() => {
                        ttsDeferredStartTimerRef.current = null;
                        startListeningImpl(currentExams, retryCount);
                    }, 500);
                }
            }, 200);
            return;
        }

        const MAX_RETRIES = 3;
        const list = Array.isArray(currentExams) ? currentExams : [];

        if (list.length === 0) {
            onVoiceIssue?.({
                code: 'no-exams',
                level: 'info',
                message: 'No exams are available right now.',
            });
            speak('There are no exams available to start right now.');
            onVoiceEnd?.();
            return;
        }

        const recognition = create(12000);
        if (!recognition) { onVoiceEnd?.(); return; }

        let resultReceived = false;

        recognition.onresult = (event) => {
            resultReceived = true;
            const transcriptRaw = getFinalTranscriptFromResult(event);
            if (!transcriptRaw) return;

            if (handledSelectionRef.current) return;

            const transcript = transcriptRaw.toLowerCase();
            console.log('[Dashboard STT] heard:', transcript);
            const selectedNum = extractExamNumber(transcript);

            if (selectedNum && selectedNum >= 1 && selectedNum <= list.length) {
                const chosenExam = list[selectedNum - 1];
                handledSelectionRef.current = true;
                stop(); // stop mic before speaking
                let didFinalize = false;
                const finalizeSelection = () => {
                    if (didFinalize) return;
                    didFinalize = true;
                    onVoiceEnd?.();
                    onChooseExam?.(chosenExam);
                };

                const utterance = speak(`Starting exam ${selectedNum}`, {
                    onEnd: () => {
                        finalizeSelection();
                    },
                });

                if (!utterance) {
                    finalizeSelection();
                    return;
                }

                const MAX_WAIT_MS = 5000;
                const checkIntervalMs = 150;
                const start = Date.now();
                const intervalId = setInterval(() => {
                    const isSpeaking = window.speechSynthesis?.speaking;
                    if (!isSpeaking || Date.now() - start > MAX_WAIT_MS) {
                        clearInterval(intervalId);
                        finalizeSelection();
                    }
                }, checkIntervalMs);
                return;
            }

            if (retryCount >= MAX_RETRIES) {
                stop();
                onVoiceIssue?.({
                    code: 'max-retries',
                    level: 'warning',
                    message: 'Voice command was not understood. You can tap an exam card to continue.',
                });
                speak("I couldn't understand. Please tap the exam card to start manually.");
                onVoiceEnd?.();
                return;
            }

            stop();
            speak(
                `I didn't catch that. Please say 'Start Exam' followed by the number. Attempt ${retryCount + 1} of ${MAX_RETRIES}.`,
                { onEnd: () => startListening(list, retryCount + 1) }
            );
        };

        recognition.onerror = (event) => {
            handledSelectionRef.current = false;
            const error = String(event?.error || 'unknown').toLowerCase();
            console.log('[Dashboard STT] error:', error);
            stop();

            if (error === 'aborted') return;

            if (error === 'no-speech') {
                onVoiceIssue?.({
                    code: 'no-speech',
                    level: 'warning',
                    message: 'No speech detected. Please say Start Exam and the exam number.',
                });

                if (retryCount < MAX_RETRIES) {
                    setTimeout(() => startListeningImpl(list, retryCount + 1), 500);
                } else {
                    speak("I didn't hear anything. Please tap the mic button and try again.");
                    onVoiceEnd?.();
                }
                return;
            }

            if (
                error === 'not-allowed'
                || error === 'permission-denied'
                || error === 'service-not-allowed'
            ) {
                onVoiceIssue?.({
                    code: 'permission-blocked',
                    level: 'error',
                    message: 'Microphone access was denied. Please allow microphone permission and try again.',
                });
                speak('Microphone access was denied. Please allow microphone permission and try again.');
                onVoiceEnd?.();
                return;
            }

            onVoiceIssue?.({
                code: error || 'unknown-error',
                level: 'warning',
                message: 'Voice input stopped unexpectedly. Please try again by tapping the mic button.',
            });

            if (retryCount < MAX_RETRIES) {
                setTimeout(() => startListeningImpl(list, retryCount + 1), 800);
            } else {
                speak('There was a microphone error. Please try again by tapping the mic button.');
                onVoiceEnd?.();
            }
        };

        recognition.onend = () => {
            if (!resultReceived) {
                console.log('[Dashboard STT] ended with no result, retrying...');
                if (retryCount < MAX_RETRIES) {
                    setTimeout(() => startListeningImpl(list, retryCount + 1), 500);
                } else {
                    speak("I didn't catch that. Please tap the mic button and try again.");
                    onVoiceEnd?.();
                }
            }
        };

        try {
            console.log('[Dashboard STT] recognition.start() called');
            recognition.start();
        } catch {
            stop();
            onVoiceIssue?.({
                code: 'start-failed',
                level: 'error',
                message: 'Unable to start microphone. Please check browser microphone permissions and try again.',
            });
            speak('Unable to start voice guidance. Please press Start Voice Guidance and try again.');
            onVoiceEnd?.();
        }
    }, [create, onChooseExam, onVoiceEnd, onVoiceIssue, speak, stop]);

    const startVoiceGuidance = useCallback((currentExams = exams, options = {}) => {
        const { skipCancelSpeech = false } = options;
        if (!skipCancelSpeech) cancelSpeech();
        stop();
        handledSelectionRef.current = false;

        const list = Array.isArray(currentExams) ? currentExams : [];
        console.log('[Dashboard Voice] startVoiceGuidance called, exams:', list.length);
        if (list.length === 0) {
            voiceStartedRef.current = true;
            onVoiceStart?.();
            speak(
                'Welcome to Saarthi. There are currently no exams available. Please check back later.',
                { onEnd: () => onVoiceEnd?.() }
            );
            return;
        }

        let text = 'Welcome to Saarthi. Here are your exams.';
        list.forEach((exam, i) => {
            text += ` Exam ${i + 1}: ${exam.title}. Duration ${exam.duration} minutes.`;
        });
        text += " Please say, 'Start Exam', followed by the number.";

        voiceStartedRef.current = true;
        onVoiceStart?.();
        speak(text, { onEnd: () => startListening(list) });
    }, [cancelSpeech, exams, onVoiceEnd, onVoiceStart, speak, startListening, stop]);

    useEffect(() => {
        if (!autoStart) return undefined;
        if (isLoading) return undefined;
        const list = Array.isArray(exams) ? exams : [];
        if (voiceStartedRef.current) return undefined;

        const timer = setTimeout(() => {
            if (!voiceStartedRef.current) startVoiceGuidance(list);
        }, 800);

        return () => clearTimeout(timer);
    }, [autoStart, exams, isLoading, startVoiceGuidance]);

    useEffect(() => {
        const recognition = recognitionRef.current;
        return () => {
            if (ttsWaitIntervalRef.current) {
                clearInterval(ttsWaitIntervalRef.current);
                ttsWaitIntervalRef.current = null;
            }
            if (ttsDeferredStartTimerRef.current) {
                clearTimeout(ttsDeferredStartTimerRef.current);
                ttsDeferredStartTimerRef.current = null;
            }
            cancelSpeech();
            stop();
            if (recognition) {
                try { recognition.abort(); } catch { /* noop */ }
            }
        };
    }, [cancelSpeech, recognitionRef, stop]);

    return { startVoiceGuidance, stopVoiceGuidance, voiceStartedRef };
}

