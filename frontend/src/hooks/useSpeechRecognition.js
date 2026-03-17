import { useCallback, useRef } from 'react';

export default function useSpeechRecognition({ onUnsupported }) {
    const recognitionRef = useRef(null);
    const timeoutRef = useRef(null);

    const stop = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* noop */ }
        }
        recognitionRef.current = null;
    }, []);

    const create = useCallback((silenceMs = 15000) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (onUnsupported) onUnsupported();
            return null;
        }

        stop();
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        // FIX 4: Prevent cutoff during long dictations. Initial 12s timeout for silence.
        timeoutRef.current = setTimeout(() => {
            try { recognition.stop(); } catch { /* noop */ }
        }, silenceMs);

        // When user actually starts speaking, clear the silence timeout
        // continuous mode will keep it open until stop() is called explicitly
        recognition.onspeechstart = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };

        return recognition;
    }, [onUnsupported, stop]);

    return { create, stop, recognitionRef, timeoutRef };
}

