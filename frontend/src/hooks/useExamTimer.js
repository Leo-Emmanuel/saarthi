import { useCallback, useEffect, useRef, useState } from 'react';
import { durationToSeconds } from '../utils/examConfig';

export default function useExamTimer({ durationMinutes, paused, onExpire, enabled = true }) {
    const [secondsLeft, setSecondsLeft] = useState(null);
    const timerRef = useRef(null);
    const expiredRef = useRef(false);

    const stop = useCallback(() => {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }, []);

    useEffect(() => {
        if (!enabled) return;
        if (!durationMinutes) {
            setSecondsLeft(null);
            return;
        }
        expiredRef.current = false;
        setSecondsLeft(durationToSeconds(durationMinutes));
    }, [durationMinutes, enabled]);

    useEffect(() => {
        if (!enabled) {
            stop();
            return undefined;
        }
        if (secondsLeft === null) return undefined;
        if (paused) {
            stop();
            return undefined;
        }
        if (secondsLeft <= 0) {
            stop();
            if (!expiredRef.current) {
                expiredRef.current = true;
                onExpire?.();
            }
            return undefined;
        }

        if (timerRef.current) return undefined;
        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    if (!expiredRef.current) {
                        expiredRef.current = true;
                        onExpire?.();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => stop();
    }, [enabled, onExpire, paused, secondsLeft, stop]);

    useEffect(() => stop, [stop]);

    return { secondsLeft, setSecondsLeft, stop };
}

