import { useEffect, useCallback } from 'react';
import useSTTLoop from './useSTTLoop';
import { parseVoiceCommand, VOICE_INTENT } from '../utils/voiceCommands';

/**
 * usePanicHelpVoice
 * Drives STT for the help/panic overlay.
 * Listens continuously for a RESUME intent ("continue" / "resume")
 * and calls onResume() when detected.
 *
 * Uses the shared useSTTLoop base hook so retry/cleanup logic
 * is not duplicated from useExamVoiceController.
 */
export default function usePanicHelpVoice({ active, onResume }) {
    const { start, stop } = useSTTLoop({
        silenceMs: 15000,
        retryDelayMs: 400,
        onUnsupported: () => {
            console.warn('[PanicHelpVoice] Speech recognition not supported in this browser.');
        },
    });

    const handleResult = useCallback((event) => {
        const raw = String(event?.results?.[0]?.[0]?.transcript ?? '').trim();
        const { intent } = parseVoiceCommand(raw, 'strict', null);
        if (intent === VOICE_INTENT.RESUME) {
            onResume?.();
        }
    }, [onResume]);

    const handleError = useCallback((e) => {
        if (e.error !== 'no-speech') {
            console.warn('[PanicHelpVoice] STT error:', e.error);
        }
    }, []);

    useEffect(() => {
        if (!active) return;

        // Give TTS 800 ms to start speaking before opening the mic
        const startTimer = setTimeout(() => {
            start({ onResult: handleResult, onError: handleError });
        }, 800);

        return () => {
            clearTimeout(startTimer);
            stop();
        };
    }, [active, start, stop, handleResult, handleError]);
}
