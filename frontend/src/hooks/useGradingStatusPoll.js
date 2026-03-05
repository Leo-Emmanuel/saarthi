import { useCallback, useEffect, useRef, useState } from 'react';

export default function useGradingStatusPoll({ id, api, pollIntervalMs = 3000, maxRetries = 30 }) {
    const [gradingStatus, setGradingStatus] = useState('not_submitted'); // 'not_submitted' | 'grading' | 'graded'
    const pollTimerRef = useRef(null);
    const abortRef = useRef(null);
    const mountedRef = useRef(true);

    const stop = useCallback(() => {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
        if (abortRef.current) {
            try { abortRef.current.abort(); } catch { /* noop */ }
            abortRef.current = null;
        }
    }, []);

    const start = useCallback(() => {
        if (!id) return;
        stop();
        setGradingStatus('grading');

        const schedule = (retries, delayMs) => {
            if (!mountedRef.current) return;
            if (retries >= maxRetries) return;

            pollTimerRef.current = setTimeout(async () => {
                if (!mountedRef.current) return;
                try {
                    abortRef.current = new AbortController();
                    const res = await api.get(`/exam/${id}/submission/status`, { signal: abortRef.current.signal });
                    if (!mountedRef.current) return;
                    if (res.data?.status === 'graded') {
                        setGradingStatus('graded');
                        stop();
                        return;
                    }
                } catch {
                    // non-fatal — schedule next attempt
                } finally {
                    abortRef.current = null;
                }
                const nextDelay = Math.min(delayMs + pollIntervalMs, 30_000);
                schedule(retries + 1, nextDelay);
            }, delayMs);
        };

        schedule(0, pollIntervalMs);
    }, [api, id, maxRetries, pollIntervalMs, stop]);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            stop();
        };
    }, [stop]);

    return { gradingStatus, setGradingStatus, startGradingPoll: start, stopGradingPoll: stop };
}

