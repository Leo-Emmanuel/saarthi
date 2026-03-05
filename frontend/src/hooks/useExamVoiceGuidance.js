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
    const direct = transcript.match(/\bstart\s+exam\s+(\d{1,2}|[a-z]+)\b/);
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

export default function useExamVoiceGuidance({
    exams,
    onChooseExam,
    autoStart = false,
    isLoading = false,
    onVoiceStart,
    onVoiceEnd,
}) {
    const voiceStartedRef = useRef(false);

    const { create, stop, recognitionRef } = useSpeechRecognition({
        onUnsupported: () => {
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

    const startListening = useCallback((currentExams, retryCount = 0) => {
        const MAX_RETRIES = 3;
        const list = Array.isArray(currentExams) ? currentExams : [];

        if (list.length === 0) {
            speak('There are no exams available to start right now.');
            onVoiceEnd?.();
            return;
        }

        const recognition = create(12000);
        if (!recognition) { onVoiceEnd?.(); return; }

        recognition.onresult = (event) => {
            const transcript = String(event?.results?.[0]?.[0]?.transcript || '').toLowerCase();
            const selectedNum = extractExamNumber(transcript);

            if (selectedNum && selectedNum >= 1 && selectedNum <= list.length) {
                const chosenExam = list[selectedNum - 1];
                stop(); // stop mic before speaking
                speak(`Starting exam ${selectedNum}`, {
                    onEnd: () => {
                        onVoiceEnd?.();
                        onChooseExam?.(chosenExam);
                    },
                });
                return;
            }

            if (retryCount >= MAX_RETRIES) {
                stop();
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

        recognition.onerror = () => {
            stop();
            onVoiceEnd?.();
        };

        try {
            recognition.start();
        } catch {
            stop();
            onVoiceEnd?.();
        }
    }, [create, onChooseExam, onVoiceEnd, speak, stop]);

    const startVoiceGuidance = useCallback((currentExams = exams) => {
        cancelSpeech();
        stop();

        const list = Array.isArray(currentExams) ? currentExams : [];
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
        return () => {
            cancelSpeech();
            stop();
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { /* noop */ }
            }
        };
    }, [cancelSpeech, recognitionRef, stop]);

    return { startVoiceGuidance, voiceStartedRef };
}

