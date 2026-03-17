import { useCallback, useEffect, useRef } from 'react';

/**
 * Drives STT for the help/panic overlay.
 * Auto-starts recognition when active and listens for "continue"/"continue exam"/"resume".
 * Returns a stop function so caller can stop mic before dismissing UI.
 */
export default function usePanicHelpVoice({ active, onResume }) {
    const recognitionRef = useRef(null);
    const closedRef = useRef(false);
    const retryTimerRef = useRef(null);
    const retryDelayRef = useRef(400);
    const onResumeRef = useRef(onResume);

    useEffect(() => {
        onResumeRef.current = onResume;
    }, [onResume]);

    const stop = useCallback(() => {
        closedRef.current = true;
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        const rec = recognitionRef.current;
        if (!rec) return;
        try { rec.onresult = null; } catch { /* noop */ }
        try { rec.onend = null; } catch { /* noop */ }
        try { rec.onerror = null; } catch { /* noop */ }
        try { rec.stop(); } catch { /* noop */ }
        recognitionRef.current = null;
    }, []);

    useEffect(() => {
        if (!active) return undefined;

        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) {
            console.warn('[PanicHelpVoice] Speech recognition not supported in this browser.');
            return undefined;
        }

        closedRef.current = false;
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognitionRef.current = recognition;

        const startRecognition = () => {
            if (closedRef.current) return;
            try { recognition.start(); } catch { /* noop */ }
        };

        const scheduleRestart = (delayMs = 250) => {
            if (closedRef.current) return;
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            retryTimerRef.current = setTimeout(() => {
                retryTimerRef.current = null;
                startRecognition();
            }, delayMs);
        };

        recognition.onresult = (event) => {
            const transcript = String(event?.results?.[0]?.[0]?.transcript || '').toLowerCase().trim();
            console.log('[PanicHelp STT] heard:', transcript, 'confidence:', event?.results?.[0]?.[0]?.confidence);
            if (
                transcript.includes('continue exam') ||
                transcript.includes('continue') ||
                transcript.includes('resume')
            ) {
                stop();
                onResumeRef.current?.();
                return;
            }
            retryDelayRef.current = 450;
            scheduleRestart(retryDelayRef.current);
        };

        recognition.onend = () => {
            if (closedRef.current) return;
            const nextDelay = Math.min(1200, Math.max(450, retryDelayRef.current));
            retryDelayRef.current = nextDelay;
            scheduleRestart(nextDelay);
        };

        recognition.onerror = () => {
            if (closedRef.current) return;
            retryDelayRef.current = Math.min(1500, retryDelayRef.current + 200);
            scheduleRestart(retryDelayRef.current);
        };

        startRecognition();

        return () => {
            stop();
        };
        // Intentionally depend only on `active` to avoid effect churn from callback identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    return { stop };
}
