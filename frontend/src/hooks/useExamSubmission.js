import { useCallback, useRef } from 'react';
import api from '../config/axios';
import { accessibleAlert } from '../utils/accessibleAlert';

export default function useExamSubmission({
    id,
    answersRef,
    audioFilesRef,
    navigate,
    mountedRef,
    setGradingStatus,
    setIsSubmitting,
    setError,
    speak,  // FIX 15: TTS speak function so failures are spoken aloud
    isPractice = false,
}) {
    const gradingPollRef = useRef(null);
    const gradingTimeoutRef = useRef(null);

    // FIX 15: Track auto-save retry state
    const saveFailedRef = useRef(false);
    const saveRetryCountRef = useRef(0);
    const saveRetryTimerRef = useRef(null);
    const MAX_SAVE_RETRIES = 3;

    const clearSubmissionTimers = useCallback(() => {
        if (gradingPollRef.current) clearTimeout(gradingPollRef.current);
        if (gradingTimeoutRef.current) clearTimeout(gradingTimeoutRef.current);
        if (saveRetryTimerRef.current) clearTimeout(saveRetryTimerRef.current);
        gradingPollRef.current = null;
        gradingTimeoutRef.current = null;
        saveRetryTimerRef.current = null;
    }, []);

    // FIX 15: Auto-save with retry + TTS notification on failure
    const autoSave = useCallback(async () => {
        if (!mountedRef.current || isPractice) return;
        try {
            await api.post(`/exam/${id}/submit`, {
                answers: answersRef.current,
                audio_files: audioFilesRef.current,
                final: false,
            });
            // Reset retry counter on success
            saveFailedRef.current = false;
            saveRetryCountRef.current = 0;
        } catch (error) {
            console.error('[useExamSubmission] auto-save failed:', error);
            saveFailedRef.current = true;
            saveRetryCountRef.current += 1;

            if (saveRetryCountRef.current < MAX_SAVE_RETRIES) {
                // FIX 15: Speak warning so blind students know
                speak?.('Warning: your answer could not be saved. Retrying in 30 seconds.');
                // Schedule retry in 30 seconds
                saveRetryTimerRef.current = setTimeout(autoSave, 30_000);
            } else {
                speak?.(
                    'Warning: your answers could not be saved after multiple attempts. ' +
                    'Please contact the invigilator or submit your exam now.'
                );
            }
        }
    }, [id, answersRef, audioFilesRef, mountedRef, speak]);

    const submitExam = useCallback(async (isFinal = true) => {
        if (isPractice) {
            if (isFinal) {
                speak?.('Practice session ended. Returning to dashboard.');
                accessibleAlert('Practice session ended.', speak);
                navigate('/student');
            }
            return;
        }
        try {
            setIsSubmitting(true);
            const res = await api.post(`/exam/${id}/submit`, {
                answers: answersRef.current,
                audio_files: audioFilesRef.current,
                final: isFinal,
            });
            if (!isFinal) return;

            // Direct auto-grade result
            if (res.data?.status === 'graded') {
                const score = res.data.score || 0;
                const totalMarks = res.data.total_marks || 0;
                speak?.(`Your exam has been graded. Your score is ${score} out of ${totalMarks}.`);
                accessibleAlert(`Your exam has been graded. Score: ${score}/${totalMarks}`, speak);
                navigate('/student');
                return;
            }

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
                            // FIX 15: Speak the score result for blind students
                            speak?.(`Your exam has been graded. Your score is ${score} out of ${totalMarks}.`);
                            accessibleAlert(`Your exam has been graded. Score: ${score}/${totalMarks}`, speak);
                            navigate('/student');
                            return;
                        }
                    } catch {
                        // ignore polling errors
                    }
                    attempts += 1;
                    gradingPollRef.current = setTimeout(poll, Math.min(3000 * (attempts + 1), 15000));
                };
                gradingPollRef.current = setTimeout(poll, 3000);
                gradingTimeoutRef.current = setTimeout(() => navigate('/student'), 120000);
                return;
            }

            const score = res.data?.score || 0;
            const totalMarks = res.data?.total_marks || 0;
            // FIX 15: Speak the score
            speak?.(`Exam submitted! Your score is ${score} out of ${totalMarks}.`);
            accessibleAlert(`Exam submitted! Score: ${score}/${totalMarks}`, speak);
            navigate('/student');
        } catch (error) {
            // FIX 15: Speak the failure so blind students are not left guessing
            speak?.('Warning: your answer could not be saved. Please check your connection and try again.');
            console.error('[useExamSubmission] submission failed:', error);
            setError('Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    }, [id, answersRef, audioFilesRef, navigate, mountedRef, setGradingStatus, setIsSubmitting, setError, speak]);

    return { submitExam, autoSave, clearSubmissionTimers };
}
