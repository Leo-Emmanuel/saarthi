import { useCallback, useRef } from 'react';
import api from '../config/axios';

export default function useExamSubmission({
    id,
    answersRef,
    audioFilesRef,
    navigate,
    mountedRef,
    setGradingStatus,
    setIsSubmitting,
    setError,
}) {
    const gradingPollRef = useRef(null);
    const gradingTimeoutRef = useRef(null);

    const clearSubmissionTimers = useCallback(() => {
        if (gradingPollRef.current) clearTimeout(gradingPollRef.current);
        if (gradingTimeoutRef.current) clearTimeout(gradingTimeoutRef.current);
        gradingPollRef.current = null;
        gradingTimeoutRef.current = null;
    }, []);

    const submitExam = useCallback(async (isFinal = true) => {
        try {
            setIsSubmitting(true);
            const res = await api.post(`/exam/${id}/submit`, {
                answers: answersRef.current,
                audio_files: audioFilesRef.current,
                final: isFinal,
            });
            if (!isFinal) return;

            if (res.status === 202 || res.data?.status === 'grading') {
                setGradingStatus('grading');
                let attempts = 0;
                const poll = async () => {
                    if (!mountedRef.current) return;
                    try {
                        const status = await api.get(`/exam/${id}/submission/status`);
                        if (status.data?.status === 'graded') {
                            const score = status.data.score || 0;
                            const totalMarks = status.data.total_marks || 0;
                            alert(`Exam submitted! Score: ${score}/${totalMarks}`);
                            navigate('/student');
                            return;
                        }
                    } catch {
                        // ignore
                    }
                    attempts += 1;
                    gradingPollRef.current = setTimeout(poll, Math.min(3000 * (attempts + 1), 15000));
                };
                gradingPollRef.current = setTimeout(poll, 3000);
                gradingTimeoutRef.current = setTimeout(() => navigate('/student'), 120000);
                return;
            }

            alert(`Exam submitted! Score: ${res.data.score || 0}/${res.data.total_marks || 0}`);
            navigate('/student');
        } catch {
            setError('Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    }, [id, answersRef, audioFilesRef, navigate, mountedRef, setGradingStatus, setIsSubmitting, setError]);

    return { submitExam, clearSubmissionTimers };
}

