import { useCallback, useRef } from 'react';
import useSpeechRecognition from './useSpeechRecognition';

/**
 * useSTTLoop
 * Provides a managed speech-recognition loop that:
 *  - Starts a recognition session via `useSpeechRecognition`.
 *  - Auto-restarts on `onend` while `mounted` is true.
 *  - Fully cleans up (abort + timers) on unmount or explicit stop.
 *
 * Consumers supply callbacks for result, error, and end events.
 * Retry logic and instance tracking live here — not in every consumer.
 *
 * @param {object} opts
 * @param {Function} [opts.onUnsupported] - Called if STT is unavailable.
 * @param {number} [opts.silenceMs=12000] - Auto-stop timeout per session.
 * @param {number} [opts.retryDelayMs=800] - Delay before restarting after onend.
 */
export default function useSTTLoop({
    onUnsupported,
    silenceMs = 12000,
    retryDelayMs = 800,
} = {}) {
    const { create, stop: stopRec } = useSpeechRecognition({ onUnsupported });

    const activeRecRef = useRef(null);
    const retryTimerRef = useRef(null);
    const mountedRef = useRef(false);
    const startingRef = useRef(false); // prevents concurrent startOneSession calls

    // ── Internal helpers ──────────────────────────────────────────────────────
    const clearRetry = useCallback(() => {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
    }, []);

    const abortActive = useCallback(() => {
        stopRec(); // clears the hook's own ref
        if (activeRecRef.current) {
            try { activeRecRef.current.abort(); } catch { /* noop */ }
            activeRecRef.current = null;
        }
    }, [stopRec]);

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * start({ onResult, onError })
     * Begins the STT loop. Auto-restarts on each session end.
     * Call stop() to cancel the loop.
     */
    const start = useCallback(({ onResult, onError } = {}) => {
        // Tear down any previous session before starting a new one
        clearRetry();
        abortActive();
        startingRef.current = false;
        mountedRef.current = true;

        const startOneSession = () => {
            if (!mountedRef.current) return;
            if (startingRef.current) return; // already starting — skip concurrent call
            startingRef.current = true;

            const rec = create(silenceMs);
            if (!rec) { startingRef.current = false; return; }

            activeRecRef.current = rec;

            rec.onresult = (event) => {
                if (!mountedRef.current) return;
                onResult?.(event);
            };

            rec.onerror = (event) => {
                activeRecRef.current = null;
                startingRef.current = false;
                onError?.(event);
            };

            rec.onend = () => {
                activeRecRef.current = null;
                startingRef.current = false;
                if (mountedRef.current) {
                    retryTimerRef.current = setTimeout(startOneSession, retryDelayMs);
                }
            };

            try {
                rec.start();
            } catch {
                /* noop — browser may reject racing calls */
                startingRef.current = false;
            }
        };

        // Add a short delay after abort() so the browser has time to fully release
        // the microphone before the new session attempts rec.start().
        retryTimerRef.current = setTimeout(startOneSession, 150);
    }, [create, silenceMs, retryDelayMs, clearRetry, abortActive]);

    /**
     * stop()
     * Cancels all timers and aborts any active recognition instance.
     */
    const stop = useCallback(() => {
        mountedRef.current = false;
        startingRef.current = false;
        clearRetry();
        abortActive();
    }, [clearRetry, abortActive]);

    return { start, stop };
}
