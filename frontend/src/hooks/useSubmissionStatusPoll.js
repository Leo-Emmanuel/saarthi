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
        if (!id) {
            console.error('[POLL] No exam ID provided');
            return;
        }
        
        console.log(`[POLL] Starting to poll for exam ${id}`);
        pollCancelledRef.current = false;

        const maxAttempts = 40;
        let attempts = 0;
        let consecutiveFailures = 0;

        while (attempts < maxAttempts) {
            if (!mountedRef.current || pollCancelledRef.current) {
                console.log(`[POLL] Poll cancelled or unmounted`);
                return;
            }
            await new Promise(resolve => {
                waitTimerRef.current = setTimeout(() => {
                    waitTimerRef.current = null;
                    resolve();
                }, 3000);
            });
            if (!mountedRef.current || pollCancelledRef.current) {
                console.log(`[POLL] Poll cancelled or unmounted after delay`);
                return;
            }

            try {
                const statusRes = await api.get(`/exam/${id}/submission/status`);
                console.log(`[POLL] Attempt ${attempts + 1}: status =`, statusRes.data?.status, 'data:', statusRes.data);
                if (!mountedRef.current || pollCancelledRef.current) {
                    console.log(`[POLL] Poll cancelled after response`);
                    return;
                }

                const status = statusRes.data?.status;
                if (status && status !== 'grading') {
                    const score = Number(statusRes.data?.score) || 0;
                    const totalMarks = Number(statusRes.data?.total_marks) || 0;
                    console.log(`[POLL] ✅ Exam graded! Score: ${score}/${totalMarks}`);
                    speak(`Your exam has been graded. Your score is ${score} out of ${totalMarks}.`);
                    navigate('/student');
                    return;
                }

                consecutiveFailures = 0;
                attempts += 1;
            } catch (err) {
                console.error(`[POLL] Attempt ${attempts + 1} failed:`, err);
                consecutiveFailures += 1;
                attempts += 1;
                if (consecutiveFailures >= 5) {
                    console.error(`[POLL] 5 consecutive failures, giving up`);
                    speak('Your submission is received, but grading status is temporarily unavailable. Returning to dashboard.');
                    navigate('/student');
                    return;
                }
            }
        }

        console.log(`[POLL] Max attempts (${maxAttempts}) reached`);
        if (mountedRef.current && !pollCancelledRef.current) {
            speak('Your exam was submitted. Grading is taking longer than expected. Returning to dashboard.');
            navigate('/student');
        }
    }, [api, id, mountedRef, navigate, speak]);

    return { pollUntilFinalized };
}
