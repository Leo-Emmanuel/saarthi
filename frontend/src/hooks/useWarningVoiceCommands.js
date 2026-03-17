import { useEffect, useRef } from 'react';

export default function useWarningVoiceCommands({
    active,
    unanswered,
    speakText,
    stopListening,
    onBack,
    onSubmit,
    onUnavailable,
}) {
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (!active) return undefined;
        let mounted = true;
        stopListening();

        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* noop */ }
            recognitionRef.current = null;
        }

        const warningText = `Warning. You have ${unanswered.length} unanswered questions: ${unanswered.join(', ')}. Say go back to return, or say submit anyway to confirm.`;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            onUnavailable?.();
            return undefined;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onend = null;
        recognition.onerror = () => {
            if (!mounted) return;
            onUnavailable?.();
        };
        recognition.onresult = (event) => {
            if (!mounted) return;
            const spoken = String(event.results?.[0]?.[0]?.transcript || '').toLowerCase().trim();
            if (spoken.includes('go back')) onBack();
            if (spoken.includes('submit anyway')) onSubmit();
        };
        speakText(warningText, {
            onEnd: () => {
                if (!mounted) return;
                try {
                    recognition.start();
                } catch {
                    onUnavailable?.();
                }
            },
            onError: () => {
                if (!mounted) return;
                onUnavailable?.();
            },
        });

        return () => {
            mounted = false;
            recognition.onresult = null;
            recognition.onend = null;
            recognition.onerror = null;
            try { recognition.abort(); } catch { /* noop */ }
            if (recognitionRef.current) {
                recognitionRef.current.onresult = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                try { recognitionRef.current.abort(); } catch { /* noop */ }
            }
            recognitionRef.current = null;
        };
    }, [active, unanswered.length, unanswered.join(','), speakText, stopListening, onBack, onSubmit, onUnavailable]);
}
