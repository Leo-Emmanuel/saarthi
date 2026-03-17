import { useEffect, useRef } from 'react';
import { VOICE_INTENT, parseReviewVoiceCommand } from '../utils/voiceCommands';

export default function useReviewVoiceCommands({
    active,
    mode = 'review',
    questions,
    answers,
    speak,
    onSubmit,
    onClose,
    onFocusNext,
    onFocusPrevious,
    onChange,
    onNext,
    onRepeat,
    onSkipAll,
}) {
    const recognitionRef = useRef(null);
    const restartTimerRef = useRef(null);
    const closedRef = useRef(false);

    const modeRef = useRef(mode);
    const questionsRef = useRef(questions);
    const answersRef = useRef(answers);
    const speakRef = useRef(speak);
    const onSubmitRef = useRef(onSubmit);
    const onCloseRef = useRef(onClose);
    const onFocusNextRef = useRef(onFocusNext);
    const onFocusPreviousRef = useRef(onFocusPrevious);
    const onNextRef = useRef(onNext);
    const onChangeRef = useRef(onChange);
    const onRepeatRef = useRef(onRepeat);
    const onSkipAllRef = useRef(onSkipAll);

    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { questionsRef.current = questions; }, [questions]);
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { speakRef.current = speak; }, [speak]);
    useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
    useEffect(() => { onFocusNextRef.current = onFocusNext; }, [onFocusNext]);
    useEffect(() => { onFocusPreviousRef.current = onFocusPrevious; }, [onFocusPrevious]);
    useEffect(() => { onNextRef.current = onNext; }, [onNext]);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { onRepeatRef.current = onRepeat; }, [onRepeat]);
    useEffect(() => { onSkipAllRef.current = onSkipAll; }, [onSkipAll]);

    useEffect(() => {
        if (!active) {
            closedRef.current = true;
            if (restartTimerRef.current) {
                clearTimeout(restartTimerRef.current);
                restartTimerRef.current = null;
            }
            const rec = recognitionRef.current;
            if (rec) {
                try { rec.onresult = null; } catch { /* noop */ }
                try { rec.onend = null; } catch { /* noop */ }
                try { rec.onerror = null; } catch { /* noop */ }
                try { rec.stop(); } catch { /* noop */ }
            }
            recognitionRef.current = null;
            return undefined;
        }

        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) return undefined;

        closedRef.current = false;
        const recognition = new SpeechRecognitionCtor();
        recognitionRef.current = recognition;

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        const scheduleRestart = (delayMs = 500) => {
            if (closedRef.current) return;
            if (restartTimerRef.current) {
                clearTimeout(restartTimerRef.current);
                restartTimerRef.current = null;
            }
            restartTimerRef.current = setTimeout(() => {
                restartTimerRef.current = null;
                if (closedRef.current) return;
                try { recognition.start(); } catch { /* noop */ }
            }, delayMs);
        };

        const readAnswerByIndex = (oneBasedIndex) => {
            const localQuestions = questionsRef.current || [];
            const localAnswers = answersRef.current || {};
            const idx = oneBasedIndex - 1;
            const q = localQuestions[idx];
            if (!q) {
                speakRef.current?.(`Question ${oneBasedIndex} is not available.`);
                return;
            }
            const qId = q?._id != null ? String(q._id) : '';
            const answer = String(localAnswers[qId] ?? '').trim();
            if (!answer) {
                speakRef.current?.(`Question ${oneBasedIndex} is not answered yet.`);
                return;
            }
            speakRef.current?.(`Answer ${oneBasedIndex}. ${answer}`);
        };

        recognition.onresult = (event) => {
            if (closedRef.current) return;

            const spokenText = String(event?.results?.[0]?.[0]?.transcript || '').toLowerCase().trim();
            console.log('[Review STT] heard:', spokenText);
            if (!spokenText) return;

            if (modeRef.current === 'playback') {
                if (spokenText.includes('next')) {
                    onNextRef.current?.();
                } else if (spokenText.includes('change') || spokenText.includes('go back')) {
                    onChangeRef.current?.();
                } else if (spokenText.includes('repeat')) {
                    onRepeatRef.current?.();
                } else if (
                    spokenText.includes('skip all') ||
                    spokenText.includes('close')
                ) {
                    onSkipAllRef.current?.();
                }
                scheduleRestart(500);
                return;
            }

            const { intent, payload } = parseReviewVoiceCommand(spokenText);
            switch (intent) {
                case VOICE_INTENT.REVIEW_SUBMIT_ANYWAY:
                    onSubmitRef.current?.();
                    scheduleRestart(500);
                    break;
                case VOICE_INTENT.REVIEW_GO_BACK:
                    onCloseRef.current?.();
                    scheduleRestart(500);
                    break;
                case VOICE_INTENT.REVIEW_READ_ANSWER:
                    readAnswerByIndex(payload?.index || 0);
                    scheduleRestart(500);
                    break;
                case VOICE_INTENT.REVIEW_NEXT:
                    onFocusNextRef.current?.();
                    scheduleRestart(500);
                    break;
                case VOICE_INTENT.REVIEW_PREVIOUS:
                    onFocusPreviousRef.current?.();
                    scheduleRestart(500);
                    break;
                default:
                    scheduleRestart(500);
                    break;
            }
        };

        recognition.onend = () => {
            if (closedRef.current) return;
            scheduleRestart(300);
        };

        recognition.onerror = (event) => {
            if (closedRef.current) return;
            if (event?.error === 'no-speech' || event?.error === 'aborted') {
                scheduleRestart(300);
                return;
            }
            scheduleRestart(500);
        };

        console.log('[Review STT] starting, show=', active);
        scheduleRestart(600);

        return () => {
            closedRef.current = true;
            if (restartTimerRef.current) {
                clearTimeout(restartTimerRef.current);
                restartTimerRef.current = null;
            }
            try { recognition.stop(); } catch { /* noop */ }
            recognitionRef.current = null;
        };
        // Intentionally depend only on active to avoid STT churn from callback identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);
}
