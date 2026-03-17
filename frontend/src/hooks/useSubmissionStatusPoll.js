import { useCallback, useEffect, useRef } from 'react';

export default function useSubmissionStatusPoll({ api, id, speak, navigate, mountedRef }) {
    const pollCancelledRef = useRef(false);
    const waitTimerRef = useRef(null);

    useEffect(() => {
        pollCancelledRef.current = false;
        return () => {
            pollCancelledRef.current = true;
            if (waitTimerRef.current) {
                clearTimeout(waitTimerRef.current);
                waitTimerRef.current = null;
            }
        };
    }, []);

    const pollUntilFinalized = useCallback(async () => {
        if (!id) return;

        pollCancelledRef.current = false;

        const maxAttempts = 40;
        let attempts = 0;
        let consecutiveFailures = 0;

        while (attempts < maxAttempts) {
            if (!mountedRef.current || pollCancelledRef.current) return;
            await new Promise(resolve => {
                waitTimerRef.current = setTimeout(() => {
                    waitTimerRef.current = null;
                    resolve();
                }, 3000);
            });
            if (!mountedRef.current || pollCancelledRef.current) return;

            try {
                const statusRes = await api.get(`/exam/${id}/submission/status`);
                if (!mountedRef.current || pollCancelledRef.current) return;

                const status = statusRes.data?.status;
                if (status && status !== 'grading') {
                    const score = Number(statusRes.data?.score) || 0;
                    const totalMarks = Number(statusRes.data?.total_marks) || 0;
                    speak(`Your exam has been graded. Your score is ${score} out of ${totalMarks}.`);
                    navigate('/student');
                    return;
                }

                consecutiveFailures = 0;
                attempts += 1;
            } catch {
                consecutiveFailures += 1;
                attempts += 1;
                if (consecutiveFailures >= 5) {
                    speak('Your submission is received, but grading status is temporarily unavailable. Returning to dashboard.');
                    navigate('/student');
                    return;
                }
            }
        }

        if (mountedRef.current && !pollCancelledRef.current) {
            speak('Your exam was submitted. Grading is taking longer than expected. Returning to dashboard.');
            navigate('/student');
        }
    }, [api, id, mountedRef, navigate, speak]);

    return { pollUntilFinalized };
}
