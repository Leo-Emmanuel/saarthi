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

    const create = useCallback((silenceMs = 12000) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (onUnsupported) onUnsupported();
            return null;
        }

        stop();
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        timeoutRef.current = setTimeout(() => {
            try { recognition.stop(); } catch { /* noop */ }
        }, silenceMs);

        return recognition;
    }, [onUnsupported, stop]);

    return { create, stop, recognitionRef, timeoutRef };
}

