import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/axios';
import { useAuth } from '../context/AuthContext';
import ExamSidebar from '../components/ExamSidebar';
import ExamReview from '../components/ExamReview';
import PanicHelp from '../components/PanicHelp';
import AnswerPlayback from '../components/AnswerPlayback';
import ExamTopBar from '../components/ExamTopBar';
import ExamBottomBar from '../components/ExamBottomBar';
import ExamControlsPanel from '../components/ExamControlsPanel';
import ExamMainContent from '../components/ExamMainContent';
import useExamVoiceController from '../hooks/useExamVoiceController';
import useExamTimer from '../hooks/useExamTimer';
import useTTS from '../hooks/useTTS';
import useSubmissionStatusPoll from '../hooks/useSubmissionStatusPoll';
import {
    detectExamType,
    getQuestionCounts,
    isAnswered,
    getUnanswered,
    getUnansweredQuestions,
    getAnsweredCount,
    detectTypeTransition,
    durationToSeconds,
    formatTimeRemaining,
    isTimeCritical,
    getExamTypeTTSIntro,
    getQuestionInstruction,
} from '../utils/examConfig';

// ── Constants ─────────────────────────────────────────────────────────────────

// How long (ms) to show the type-transition card between question sections
const TRANSITION_CARD_DURATION_MS = 2000;

// Draft auto-save debounce (ms) per exam type
const DRAFT_SAVE_DELAY_MCQ = 1800;
const DRAFT_SAVE_DELAY_WRITTEN = 4500;

function ViolationModal({ onReturn }) {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
        }}>
            <div style={{
                background: '#1e2130',
                border: '2px solid #e74c3c',
                borderRadius: 16,
                padding: 40,
                maxWidth: 440,
                textAlign: 'center',
                boxShadow: '0 8px 40px rgba(231,76,60,0.3)',
            }}>
                <div style={{ fontSize: 56 }}>⚠️</div>
                <h2 style={{ color: '#e74c3c', marginTop: 16, fontSize: 22 }}>
                    Exam Auto-Submitted
                </h2>
                <p style={{ color: '#f0f2f8', marginTop: 12, lineHeight: 1.6 }}>
                    Your exam was automatically submitted because you left the exam window <strong>3 times</strong>.
                    Your submission has been <strong style={{ color: '#e74c3c' }}>flagged for review</strong> by your teacher.
                </p>
                <button
                    autoFocus
                    onClick={onReturn}
                    onKeyDown={e => e.key === 'Enter' && onReturn()}
                    style={{
                        marginTop: 28,
                        padding: '14px 36px',
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%',
                    }}
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExamView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const handleSubmitRef = useRef(null);
    const playbackAutoOpenedRef = useRef(false);

    // ── TTS Hook ──────────────────────────────────────────────────────
    const ttsSettings = useMemo(() => ({
        rate: user?.tts_settings?.rate ?? 1.0,
        pitch: user?.tts_settings?.pitch ?? 1.0,
        voice: user?.tts_settings?.voice ?? null,
    }), [user]);
    const { speak: baseSpeak, cancel } = useTTS(ttsSettings);
    const stopListeningRef = useRef(null);
    const startListeningRef = useRef(null);

    // ── Exam data ────────────────────────────────────────────────────────────
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Answers ──────────────────────────────────────────────────────────────
    const [answers, setAnswers] = useState({});   // { [questionId]: answerString }
    const [interimTranscripts, setInterimTranscripts] = useState({});
    const [pendingVoiceAutoStartSeq, setPendingVoiceAutoStartSeq] = useState(0);
    const answersRef = useRef({});
    const lastInterimUpdateAtRef = useRef(0);

    // ── Navigation ───────────────────────────────────────────────────────────
    const [currentIndex, setCurrentIndex] = useState(0);

    // ── Transition card (mixed exams) ────────────────────────────────────────
    const [transitionCard, setTransitionCard] = useState(null); // null | { from, to }
    const transitionTimerRef = useRef(null);

    // ── Submission / grading ─────────────────────────────────────────────────
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    // ── Review screen ────────────────────────────────────────────────────────
    const [showReview, setShowReview] = useState(false);

    // ── New Features State ───────────────────────────────────────────────
    const [showPanic, setShowPanic] = useState(false);
    const [showPlayback, setShowPlayback] = useState(false);
    const [showStartOverlay, setShowStartOverlay] = useState(true);
    const showPlaybackRef = useRef(false);
    const [tabViolations, setTabViolations] = useState(0);
    const tabViolationsRef = useRef(0);
    const examSpeechStateRef = useRef({
        voiceMode: true,
        showReview: false,
        showPanic: false,
        showPlayback: false,
    });
    const [showViolationModal, setShowViolationModal] = useState(false);
    const autoSubmittedByViolationRef = useRef(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        examSpeechStateRef.current = {
            ...examSpeechStateRef.current,
            showReview,
            showPanic,
            showPlayback,
        };
    }, [showPanic, showPlayback, showReview]);

    useEffect(() => {
        showPlaybackRef.current = showPlayback;
    }, [showPlayback]);

    const speak = useCallback((text, options = {}) => {
        // Always stop STT before TTS so synthesis audio cannot get transcribed.
        stopListeningRef.current?.();

        const userOnEnd = options.onEnd;
        baseSpeak(text, {
            ...options,
            onEnd: (...args) => {
                // Re-evaluate state at fire time — captures showPlayback, showReview, etc.
                // changes that happen *during* TTS (e.g. panel opening mid-utterance).
                const uiState = examSpeechStateRef.current;
                const shouldResume =
                    uiState.voiceMode &&
                    !submitting &&
                    !submitted &&
                    !uiState.showReview &&
                    !uiState.showPanic &&
                    !uiState.showPlayback;
                if (shouldResume) {
                    // Use the live ref so the latest startListeningForCurrent is called,
                    // which correctly checks showPlayback in its own closure.
                    setTimeout(() => {
                        startListeningRef.current?.({ bypassMinRestart: true, restartDeafMs: 2000 });
                    }, 500);
                }
                if (typeof userOnEnd === 'function') userOnEnd(...args);
            },
        });
    }, [baseSpeak, submitted, submitting]);

    const { pollUntilFinalized } = useSubmissionStatusPoll({
        api,
        id,
        speak,
        navigate,
        mountedRef,
    });

    const saveViolationCount = useCallback(async (violationCount) => {
        if (!id) return;
        if (typeof violationCount !== 'number') return;
        try {
            await api.post(`/exam/${id}/submit`, {
                answers: answersRef.current || {},
                tab_violations: violationCount,
                final: false,
            });
        } catch {
            // Non-blocking: progress save failures should not interrupt the exam flow.
        }
    }, [id]);

    // ── Save status ──────────────────────────────────────────────────────────
    const [saveStatus, setSaveStatus] = useState('saved');
    const draftTimerRef = useRef(null);
    const draftInFlightRef = useRef(false);
    const queuedDraftRef = useRef(null);
    const draftDirtyRef = useRef(false);

    // ── Voice / global exam mode ──────────────────────────────────────────────
    const [readingMode, setReadingMode] = useState('brief'); // 'brief' | 'detailed'
    const [paused, setPaused] = useState(false);

    // ── Timer ────────────────────────────────────────────────────────────────
    const { secondsLeft, stop: stopTimer } = useExamTimer({
        durationMinutes: exam?.duration,
        paused,
        enabled: !submitted,
        onExpire: () => {
            if (!submitted) handleAutoSubmit();
        },
    });

    const submitExam = useCallback(async (options = {}) => {
        console.log('[submitExam] called, submitting:', submitting, 'submitted:', submitted);
        if (submitting || submitted) return;
        setSubmitting(true);
        setShowReview(false);
        stopTimer();

        try {
            const safeAnswers = answersRef.current && typeof answersRef.current === 'object'
                ? answersRef.current
                : {};
            const res = await api.post(`/exam/${id}/submit`, {
                answers: safeAnswers,
                tab_violations: tabViolationsRef.current || 0,
                final: true,
            });
            console.log('[submitExam] api.post success, status:', res?.status);
            // Navigation happens regardless of mount state
            // mountedRef may be false during tab-switch auto-submit
            if (typeof options.onSuccess === 'function') {
                if (mountedRef.current) setSubmitted(true);
                options.onSuccess();
                return;
            }

            if (mountedRef.current) {
                setSubmitted(true);
            }

            if (res?.status === 202 || res?.data?.status === 'grading') {
                if (mountedRef.current) pollUntilFinalized();
            }

            // Always navigate - outside mountedRef check
            console.log('[submitExam] navigating to /login');
            setTimeout(() => { window.location.href = '/login'; }, 1500);
            return;
        } catch (err) {
            console.log('[submitExam] api.post FAILED:', err?.response?.status, err?.message);
            if (mountedRef.current) {
                setError('Submission failed. Please try again.');
                setSubmitting(false);
            }
        }
    }, [id, navigate, pollUntilFinalized, speak, stopTimer, submitting, submitted]);

    const handleAutoSubmit = useCallback(() => {
        submitExam({
            onSuccess: () => {
                setShowViolationModal(true);
                speak('Your exam has been automatically submitted and flagged for review. Please click Return to Dashboard.');
            },
        });
    }, [submitExam, speak]);

    const handleVisibilityChange = useCallback(() => {
        if (!document.hidden) return;
        if (submitting || submitted) return;
        console.log('[ExamView] onViolation fired, count:', tabViolationsRef.current + 1);
        const newCount = tabViolationsRef.current + 1;
        tabViolationsRef.current = newCount;
        setTabViolations(newCount);
        saveViolationCount(newCount);

        if (newCount === 1) {
            speak('Warning: Do not leave the exam window. This has been recorded.');
        } else if (newCount === 2) {
            speak('Final warning. One more violation will automatically submit your exam.');
        } else if (newCount >= 3) {
            console.log('[ExamView] triggering auto-submit');
            if (autoSubmittedByViolationRef.current) return;
            autoSubmittedByViolationRef.current = true;
            stopListeningRef.current?.();

            // Submit immediately — do NOT wait for TTS.
            // TTS won't play in a hidden tab so onEnd never fires.
            handleSubmitRef.current?.(true);
            console.log('[ExamView] handleSubmitRef called, ref exists:', !!handleSubmitRef.current);

            // Speak the warning when student returns to tab.
            const speakOnReturn = () => {
                if (document.visibilityState === 'visible') {
                    speak(
                        'You have left the exam window 3 times. '
                        + 'Your exam has been automatically submitted and flagged.'
                    );
                    document.removeEventListener('visibilitychange', speakOnReturn);
                }
            };
            document.addEventListener('visibilitychange', speakOnReturn);
        }
    }, [saveViolationCount, speak, submitted, submitting]);

    useEffect(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [handleVisibilityChange]);

    // ── Derived values ───────────────────────────────────────────────────────
    const questions = exam?.questions ?? [];
    const total = questions.length;
    const currentQuestion = questions[currentIndex] ?? null;
    const examType = useMemo(() => detectExamType(questions), [questions]);
    const counts = useMemo(() => getQuestionCounts(questions), [questions]);
    const answered = useMemo(() => getAnsweredCount(questions, answers), [questions, answers]);
    const unanswered = useMemo(() => getUnanswered(questions, answers), [questions, answers]);
    const allDone = answered === total && total > 0;
    const pct = total ? Math.round((answered / total) * 100) : 0;
    const progressColor = pct < 50 ? 'var(--danger)' : pct < 100 ? 'var(--warn)' : 'var(--success)';

    const readOnly = submitting || submitted;
    const isMcqUI = useCallback(
        (q) => q?.type === 'mcq' || (Array.isArray(q?.options) && q.options.length > 0),
        []
    );
    const writtenItems = useMemo(
        () => questions.map((q, index) => ({ q, index })).filter(({ q }) => !isMcqUI(q)),
        [questions, isMcqUI]
    );

    // ── Answer history for undo/redo (per-question) ───────────────────────────
    const [answerHistory, setAnswerHistory] = useState({}); // { [questionId]: { past: string[], future: string[] } }

    // ── Load exam ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;

        // Reset all answer state when a new exam loads
        // Prevents stale answers from previous session
        // being submitted with a new exam ID
        setAnswers({});
        answersRef.current = {};
        setCurrentIndex(0);
        setSubmitting(false);
        setSubmitted(false);
        setShowPlayback(false);
        setShowReview(false);
        playbackAutoOpenedRef.current = false;
        showPlaybackRef.current = false;
        console.log('[ExamView] exam load — answers reset for exam:', id);

        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/exam/${id}`);
                if (cancelled) return;
                const data = res.data ?? {};
                data.questions = Array.isArray(data.questions) ? data.questions : [];
                setExam(data);
                setError(null);
            } catch (err) {
                if (cancelled) return;
                if (err.response?.status === 401)
                    setError('Session expired. Please log in again.');
                else if (err.response?.status === 404)
                    setError('Exam not found. Please check the link.');
                else
                    setError('Failed to load exam. Please try again later.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [id]);

    // ── TTS intro on exam load (with user gesture requirement) ───────────────────
    // Fired only once after questions are available. Using a ref so the listener
    // is registered a single time and never re-added on question navigation.
    const hasIntroFiredRef = useRef(false);
    const introSequenceActiveRef = useRef(false);
    useEffect(() => {
        if (!questions.length || hasIntroFiredRef.current) return;

        const handleUserGesture = () => {
            setShowStartOverlay(false);
            hasIntroFiredRef.current = true;
            introSequenceActiveRef.current = true;
            const introText = getExamTypeTTSIntro(examType);
            speak(introText, {
                onEnd: () => {
                    const firstQ = questions[0];
                    if (!firstQ) return;
                    const firstQuestionText = getQuestionInstruction(firstQ, 1, questions.length);
                    speak(firstQuestionText, {
                        onEnd: () => {
                            introSequenceActiveRef.current = false;
                            setTimeout(() => {
                                setPendingVoiceAutoStartSeq((n) => n + 1);
                            }, 300);
                        },
                    });
                },
            });

            // Remove event listeners after first interaction
            document.removeEventListener('click', handleUserGesture);
            document.removeEventListener('keydown', handleUserGesture);
            document.removeEventListener('touchstart', handleUserGesture);
        };

        // Add event listeners for user gestures (fires only once)
        document.addEventListener('click', handleUserGesture);
        document.addEventListener('keydown', handleUserGesture);
        document.addEventListener('touchstart', handleUserGesture);

        return () => {
            document.removeEventListener('click', handleUserGesture);
            document.removeEventListener('keydown', handleUserGesture);
            document.removeEventListener('touchstart', handleUserGesture);
        };
    }, [examType, questions, speak]);

    // ── TTS per-question read-aloud ──────────────────────────────────────────
    useEffect(() => {
        if (!hasIntroFiredRef.current) return;
        if (introSequenceActiveRef.current) return;
        if (!currentQuestion) return;
        if (showPlayback) return;
        if (playbackAutoOpenedRef.current) return;
        const t = setTimeout(() => {
            const questionText = getQuestionInstruction(currentQuestion, currentIndex + 1, total);
            speak(questionText);
        }, 800); // Increased delay to ensure question is fully rendered
        return () => {
            clearTimeout(t);
            // Don't cancel speech immediately - let it finish when moving between questions
        };
    }, [currentIndex, currentQuestion, total, showPlayback]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Cleanup on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            stopTimer();
            clearTimeout(draftTimerRef.current);
            clearTimeout(transitionTimerRef.current);
            window.speechSynthesis?.cancel();
        };
    }, []);

    // ── Draft save ───────────────────────────────────────────────────────────
    const saveDraft = useCallback(async (nextAnswers = answersRef.current) => {
        if (!id || !draftDirtyRef.current) {
            setSaveStatus('saved');
            return;
        }
        if (draftInFlightRef.current) {
            queuedDraftRef.current = nextAnswers;
            return;
        }
        draftInFlightRef.current = true;
        try {
            setSaveStatus('saving');
            await api.post(`/exam/${id}/submit`, {
                answers: nextAnswers,
                tab_violations: tabViolationsRef.current,
                final: false,
            });
            draftDirtyRef.current = false;
            setSaveStatus('saved');
        } catch {
            setSaveStatus('error');
        } finally {
            draftInFlightRef.current = false;
            if (queuedDraftRef.current) {
                const q = queuedDraftRef.current;
                queuedDraftRef.current = null;
                saveDraft(q);
            }
        }
    }, [id]);

    // ── Answer change handler ────────────────────────────────────────────────
    const handleAnswerChange = useCallback((questionId, value) => {
        if (!questionId) return;
        const qKey = String(questionId);
        setInterimTranscripts(prev => {
            if (!(qKey in prev)) return prev;
            const next = { ...prev };
            delete next[qKey];
            return next;
        });
        const prev = answersRef.current[qKey];
        if (prev === value) return;

        // Update history for this question: push previous value into past, clear future.
        setAnswerHistory(prevHist => {
            const entry = prevHist[qKey] || { past: [], future: [] };
            return {
                ...prevHist,
                [qKey]: {
                    past: [...entry.past, prev ?? ''],
                    future: [],
                },
            };
        });

        const next = { ...answersRef.current, [qKey]: value };
        answersRef.current = next;
        setAnswers(next);
        draftDirtyRef.current = true;
        clearTimeout(draftTimerRef.current);
        const delay = examType === 'writing-only' ? DRAFT_SAVE_DELAY_WRITTEN : DRAFT_SAVE_DELAY_MCQ;
        draftTimerRef.current = setTimeout(() => saveDraft(next), delay);
    }, [examType, saveDraft]);

    // ── Navigation with optional transition card ──────────────────────────────
    const navigateTo = useCallback((toIndex) => {
        if (toIndex < 0 || toIndex >= total) return;
        const { shouldShow, from, to } = detectTypeTransition(questions, currentIndex, toIndex);
        if (shouldShow && examType === 'mixed') {
            setTransitionCard({ from, to });
            transitionTimerRef.current = setTimeout(() => {
                setTransitionCard(null);
                setCurrentIndex(toIndex);
            }, TRANSITION_CARD_DURATION_MS);
        } else {
            setCurrentIndex(toIndex);
        }
    }, [questions, currentIndex, total, examType]);

    const goNext = useCallback(() => navigateTo(currentIndex + 1), [currentIndex, navigateTo]);
    const goPrev = useCallback(() => navigateTo(currentIndex - 1), [currentIndex, navigateTo]);
    const jumpTo = useCallback((i) => navigateTo(i), [navigateTo]);

    const displayAnswers = useMemo(() => {
        if (!currentQuestion?._id) return answers;
        const qId = String(currentQuestion._id);
        const interim = String(interimTranscripts[qId] ?? '').trim();
        if (!interim) return answers;
        const base = String(answers[qId] ?? '').trim();
        return {
            ...answers,
            [qId]: base ? `${base} ${interim}` : interim,
        };
    }, [answers, currentQuestion, interimTranscripts]);

    // ── Voice controller (STT + intent dispatch) ─────────────────────────────
    const {
        voiceMode,
        setVoiceMode,
        isListening,
        startListeningForCurrent,
        stopListening,
        grammarMode,
    } = useExamVoiceController({
        examType,
        currentQuestion,
        currentIndex,
        total,
        readOnly,
        showPlayback,
        showPlaybackRef,
        showReview,
        showPanic,
        secondsLeft,
        speak,
        cancel,
        onHelp: () => {
            stopListening();
            setShowPanic(true);
        },
        onTimeRemaining: (s) => {
            const secs = Math.max(0, Math.floor(Number(s || 0)));
            const msg = `${Math.floor(secs / 60)} minutes and ${secs % 60} seconds remaining`;
            speak(msg);
        },
        onSelectMCQ: (qId, letter) => {
            handleAnswerChange(qId, letter);
            // Always speak confirmation and auto-advance (voice-first behaviour)
            speak(`Option ${letter} selected.`, {
                onEnd: () => {
                    if (currentIndex < total - 1) {
                        goNext();
                    } else {
                        openReviewPanel();
                    }
                },
            });
        },
        onNext: () => {
            if (currentIndex >= total - 1) {
                openReviewPanel();
                return;
            }
            goNext();
        },
        onSkip: () => {
            if (currentIndex >= total - 1) {
                speak("You're already on the last question.");
                return;
            }
            goNext();
        },
        onPrev: goPrev,
        onSubmit: () => openReviewPanel(),
        onClear: (qId) => handleAnswerChange(qId, ''),
        onRepeat: (q, idx, t) => speak(getQuestionInstruction(q, idx + 1, t)),
        onDictate: (qId, text) => {
            const prevText = String(answersRef.current[qId] ?? '').trim();
            const merged = prevText ? `${prevText} ${text}` : text;
            handleAnswerChange(qId, merged);
        },
        onInterimTranscript: (qId, text) => {
            if (!qId) return;

            const now = Date.now();
            const isClear = !text;
            if (!isClear && now - lastInterimUpdateAtRef.current < 180) return;
            lastInterimUpdateAtRef.current = now;

            setInterimTranscripts(prev => {
                const qKey = String(qId);
                if (!text) {
                    if (!(qKey in prev)) return prev;
                    const next = { ...prev };
                    delete next[qKey];
                    return next;
                }
                if (prev[qKey] === text) return prev;
                return { ...prev, [qKey]: text };
            });
        },
        onReview: () => {
            playbackAutoOpenedRef.current = false;
            openReviewPanel();
        },
        onReadOptions: (q) => {
            if (!Array.isArray(q?.options) || q.options.length === 0) {
                speak('No options available for this question.');
                return;
            }
            const letters = ['A', 'B', 'C', 'D'];
            const text = q.options
                .filter(Boolean)
                .slice(0, 4)
                .map((opt, i) => `Option ${letters[i]}: ${opt}`)
                .join('. ');
            speak(text);
        },
        onResume: () => {
            setShowPanic(false);
            setTimeout(() => startListeningForCurrent(), 600);
            speak('Resuming your exam.');
        },
        // ── Written-question voice commands ─────────────────────────────────
        onReadAnswer: (qId) => {
            const text = String(answersRef.current[qId] ?? '').trim();
            if (!text) {
                speak('You have not written anything yet.');
            } else {
                // Strip LaTeX markers before reading aloud
                speak(text.replace(/\$[^$]*\$/g, 'math expression'));
            }
        },
        onCreateStep: (qId) => {
            const prev = String(answersRef.current[qId] ?? '').trim();
            const next = prev ? `${prev}\n\nStep:` : 'Step:';
            handleAnswerChange(qId, next);
            speak('New step added.');
        },
        onClearStep: (qId) => {
            const prev = String(answersRef.current[qId] ?? '');
            // Remove last paragraph separated by double newline
            const parts = prev.split(/\n\n/);
            const next = parts.length > 1 ? parts.slice(0, -1).join('\n\n') : '';
            handleAnswerChange(qId, next);
            speak('Step cleared.');
        },
        onUndo: () => undoCurrent(),
    });

    const openReviewPanel = useCallback(() => {
        if (playbackAutoOpenedRef.current) return;
        playbackAutoOpenedRef.current = true;
        showPlaybackRef.current = true;
        stopListening();
        console.log('[ExamView] openReviewPanel called');

        // One-shot guard — setShowPlayback fires exactly once.
        let opened = false;
        const openPanel = () => {
            if (opened) return;
            opened = true;
            console.log('[ExamView] setShowPlayback(true)');
            setShowPlayback(true);
        };

        // Fallback — if TTS never completes, open after 8s.
        const fallback = setTimeout(openPanel, 8000);

        speak(
            'That was the last question. We are now moving to the '
            + 'review panel. I will read each question and your answer '
            + 'one by one. Say next, previous, change, or skip all.',
            {
                rate: 0.9,
                onEnd: () => {
                    clearTimeout(fallback);
                    openPanel();
                },
                onError: () => {
                    clearTimeout(fallback);
                    // Small delay after error before opening.
                    setTimeout(openPanel, 500);
                },
            }
        );
    }, [speak, stopListening]);

    const handlePlaybackClose = useCallback(() => {
        setShowPlayback(false);
        playbackAutoOpenedRef.current = false;
        setTimeout(() => startListeningForCurrent(), 500);
    }, [startListeningForCurrent]);

    useEffect(() => {
        examSpeechStateRef.current = {
            ...examSpeechStateRef.current,
            voiceMode,
        };
        stopListeningRef.current = stopListening;
        startListeningRef.current = startListeningForCurrent;
    }, [voiceMode, stopListening, startListeningForCurrent]);

    useEffect(() => {
        if (!pendingVoiceAutoStartSeq) return;
        setVoiceMode(true);
        startListeningForCurrent();
    }, [pendingVoiceAutoStartSeq, setVoiceMode, startListeningForCurrent]);



    const handlePanicOpen = useCallback(() => {
        stopListening();
        setShowPanic(true);
    }, [stopListening]);

    const handlePanicResume = useCallback(() => {
        setShowPanic(false);
        setTimeout(() => startListeningForCurrent(), 600);
    }, [startListeningForCurrent]);


    // ── Undo / Redo for current question ──────────────────────────────────────
    const canUndo = useMemo(() => {
        const qId = currentQuestion?._id != null ? String(currentQuestion._id) : null;
        if (!qId) return false;
        return !!(answerHistory[qId]?.past?.length);
    }, [answerHistory, currentQuestion]);

    const canRedo = useMemo(() => {
        const qId = currentQuestion?._id != null ? String(currentQuestion._id) : null;
        if (!qId) return false;
        return !!(answerHistory[qId]?.future?.length);
    }, [answerHistory, currentQuestion]);

    const undoCurrent = useCallback(() => {
        const qId = currentQuestion?._id != null ? String(currentQuestion._id) : null;
        if (!qId) return;

        setAnswerHistory(prevHist => {
            const entry = prevHist[qId];
            if (!entry || entry.past.length === 0) return prevHist;
            const previousValue = entry.past[entry.past.length - 1];
            const newPast = entry.past.slice(0, -1);
            const currentValue = answersRef.current[qId] ?? '';
            const newFuture = [currentValue, ...(entry.future || [])];
            const nextAnswers = { ...answersRef.current, [qId]: previousValue };

            answersRef.current = nextAnswers;
            setAnswers(nextAnswers);
            draftDirtyRef.current = true;
            clearTimeout(draftTimerRef.current);
            const delay = examType === 'writing-only' ? DRAFT_SAVE_DELAY_WRITTEN : DRAFT_SAVE_DELAY_MCQ;
            draftTimerRef.current = setTimeout(() => saveDraft(nextAnswers), delay);

            return {
                ...prevHist,
                [qId]: { past: newPast, future: newFuture },
            };
        });
    }, [currentQuestion, examType, saveDraft]);

    const redoCurrent = useCallback(() => {
        const qId = currentQuestion?._id != null ? String(currentQuestion._id) : null;
        if (!qId) return;

        setAnswerHistory(prevHist => {
            const entry = prevHist[qId];
            if (!entry || !entry.future || entry.future.length === 0) return prevHist;
            const nextValue = entry.future[0];
            const newFuture = entry.future.slice(1);
            const currentValue = answersRef.current[qId] ?? '';
            const newPast = [...(entry.past || []), currentValue];
            const nextAnswers = { ...answersRef.current, [qId]: nextValue };

            answersRef.current = nextAnswers;
            setAnswers(nextAnswers);
            draftDirtyRef.current = true;
            clearTimeout(draftTimerRef.current);
            const delay = examType === 'writing-only' ? DRAFT_SAVE_DELAY_WRITTEN : DRAFT_SAVE_DELAY_MCQ;
            draftTimerRef.current = setTimeout(() => saveDraft(nextAnswers), delay);

            return {
                ...prevHist,
                [qId]: { past: newPast, future: newFuture },
            };
        });
    }, [currentQuestion, examType, saveDraft]);

    // ── Submission ───────────────────────────────────────────────────────────
    const handleSubmit = useCallback(async (isAutoSubmit = false) => {
        console.log('[handleSubmit] called, isAutoSubmit:', isAutoSubmit, 'submitting:', submitting, 'submitted:', submitted);
        if (submitting || submitted) return;

        // Manual submit: confirm unanswered questions
        if (!isAutoSubmit) {
            const unans = getUnansweredQuestions(questions, answersRef.current);
            if (unans.length > 0) {
                setShowReview(true);
                return;
            }
        }

        await submitExam();
    }, [questions, submitExam, submitting, submitted]);

    handleSubmitRef.current = handleSubmit;

    // Keyboard shortcuts (eyes-free friendly): Space = listen, Esc = stop
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== ' ' && e.key !== 'Escape') return;
            const tag = String(e?.target?.tagName || '').toLowerCase();
            const isTypingField = tag === 'textarea' || tag === 'input' || e?.target?.isContentEditable;
            if (isTypingField) return;

            if (e.key === ' ') {
                e.preventDefault();
                setVoiceMode(true);
                startListeningForCurrent();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                stopListening();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [startListeningForCurrent, stopListening]);

    // ── When panic/help overlay opens, always stop main STT so PanicHelp's ─────
    // own recognition can start without a mic-conflict. This covers both the
    // voice-triggered path (handleVoiceIntent already calls stopListening) and
    // the button-click path (onHelp button in ExamTopBar).
    useEffect(() => {
        if (showPanic) {
            stopListening();
        }
    }, [showPanic, stopListening]);

    // ── Early-exit renders ───────────────────────────────────────────────────
    if (loading || (!exam && !error)) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <p style={{ color: 'var(--muted)', fontSize: 18, textAlign: 'center', padding: 40 }}>
                    Loading exam… please wait
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <p role="alert" style={{ color: 'var(--danger)', fontSize: 18 }}>{error}</p>
            </div>
        );
    }

    // ── Submit button text / style ────────────────────────────────────────────
    const submitText = answered === 0
        ? 'Answer at least one question to submit'
        : allDone
            ? 'Submit Exam — All Done!'
            : `Submit (${answered}/${total} answered)`;

    const submitStyle = answered === 0
        ? { background: 'var(--border)', color: 'var(--muted)', cursor: 'not-allowed' }
        : allDone
            ? { background: 'var(--success)', color: 'var(--bg)', animation: 'successPulse 2s infinite' }
            : { background: 'var(--warn)', color: 'var(--bg)' };

    const formatHMS = (seconds) => {
        const s = Math.max(0, Math.floor(Number(seconds || 0)));
        const hh = String(Math.floor(s / 3600)).padStart(2, '0');
        const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    };

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <div className="exam-root min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
            {/* ── Welcome start overlay ── */}
            {showStartOverlay && questions.length > 0 && !loading && (
                <div
                    onClick={() => setShowStartOverlay(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(0, 0, 0, 0.93)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 0,
                        cursor: 'pointer',
                    }}
                >
                    <div style={{
                        background: 'var(--surface)',
                        border: '2px solid var(--yellow)',
                        borderRadius: 16,
                        padding: '48px 56px',
                        maxWidth: 520,
                        width: '90%',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: 3,
                            color: 'var(--muted)',
                            textTransform: 'uppercase',
                            marginBottom: 12,
                        }}>
                            You are now in
                        </div>
                        <div style={{
                            fontSize: '1.5rem',
                            fontWeight: 900,
                            color: 'var(--yellow)',
                            marginBottom: 24,
                            lineHeight: 1.3,
                        }}>
                            {exam?.title || 'Your Exam'}
                        </div>

                        <div style={{ fontSize: 56, marginBottom: 20 }}>🎙</div>

                        <div style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--text)',
                            marginBottom: 12,
                            lineHeight: 1.6,
                        }}>
                            This is a voice-first exam.
                        </div>
                        <div style={{
                            fontSize: '0.95rem',
                            color: 'var(--muted)',
                            marginBottom: 28,
                            lineHeight: 1.7,
                        }}>
                            Press <span style={{
                                background: 'var(--yellow)',
                                color: 'var(--black)',
                                borderRadius: 6,
                                padding: '2px 10px',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                            }}>Space</span> or click the mic button to activate voice.
                            <br />
                            Questions will be read aloud automatically.
                        </div>

                        <button
                            type="button"
                            style={{
                                background: 'var(--yellow)',
                                color: 'var(--black)',
                                border: 'none',
                                borderRadius: 50,
                                padding: '14px 40px',
                                fontSize: '1rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                width: '100%',
                            }}
                        >
                            Tap here or press Space to Start
                        </button>

                        <div style={{
                            marginTop: 20,
                            fontSize: '0.8rem',
                            color: 'var(--muted)',
                        }}>
                            {questions.length} questions
                            {exam?.duration ? ` · ${exam.duration} minutes` : ''}
                        </div>
                    </div>
                </div>
            )}
            {showViolationModal && (
                <ViolationModal onReturn={() => navigate('/login')} />
            )}
            <ExamTopBar
                title={exam?.title || 'Exam'}
                subtitle={paused ? 'Paused' : 'Voice-first exam mode'}
                timerText={secondsLeft === null ? '--:--:--' : formatHMS(secondsLeft)}
                isTimeCritical={isTimeCritical(secondsLeft ?? 0)}
                violationsCount={tabViolations}
                readingMode={readingMode}
                onToggleReadingMode={setReadingMode}
                mcqCount={counts?.mcq ?? 0}
                writeCount={counts?.writing ?? 0}
                activePane={currentQuestion?.type === 'mcq' || Array.isArray(currentQuestion?.options) ? 'mcq' : 'write'}
                onPause={() => {
                    setPaused(p => !p);
                    stopListening();
                }}
                onHelp={handlePanicOpen}
            />

            <ExamSidebar
                examType={examType}
                questions={questions}
                currentIndex={currentIndex}
                answers={answers}
                onJump={jumpTo}
                isAnswered={isAnswered}
                onReadAll={() => {
                    const text = questions.map((q, i) => `Question ${i + 1}. ${q.text}`).join(' ');
                    speak(text);
                }}
                onReadQuestion={(q, i) => {
                    const text = getQuestionInstruction(q, i + 1, total);
                    speak(text);
                }}
            />

            <ExamControlsPanel
                onNewStep={() => { /* TODO: wire math steps */ }}
                onUndo={undoCurrent}
                onRedo={redoCurrent}
                onReviewAll={() => {
                    playbackAutoOpenedRef.current = false;
                    openReviewPanel();
                }}
                onSubmit={() => setShowReview(true)}
                canUndo={canUndo}
                canRedo={canRedo}
            />

            <ExamMainContent
                transitionCard={transitionCard}
                currentQuestion={currentQuestion}
                currentIndex={currentIndex}
                total={total}
                answered={answered}
                pct={pct}
                answers={displayAnswers}
                readOnly={readOnly}
                examType={examType}
                isListening={isListening}
                voiceMode={voiceMode}
                writtenItems={writtenItems}
                isMcqUI={isMcqUI}
                onJump={jumpTo}
                onGoPrev={goPrev}
                onGoNext={goNext}
                onToggleVoiceMode={() => setVoiceMode(v => !v)}
                onStartListening={() => { setVoiceMode(true); startListeningForCurrent(); }}
                onOpenReview={openReviewPanel}
                onAnswerChange={handleAnswerChange}
                onSpeak={speak}
                getQuestionInstruction={getQuestionInstruction}
                readingMode={readingMode}
                saveStatus={saveStatus}
            />

            <ExamBottomBar
                isListening={isListening}
                grammarMode={grammarMode}
                readingMode={readingMode}
            />

            {/* Panic Help */}
            {showPanic && (
                <PanicHelp
                    examType={examType}
                    currentQuestion={currentQuestion}
                    onResume={handlePanicResume}
                    speak={speak}
                    cancel={cancel}
                />
            )}

            {/* Answer Playback */}
            {showPlayback && (
                <AnswerPlayback
                    questions={questions}
                    answers={answers}
                    onEdit={(index) => {
                        handlePlaybackClose();
                        setCurrentIndex(index);
                    }}
                    onComplete={() => {
                        handlePlaybackClose();
                        setShowReview(true);
                    }}
                    onSubmit={() => {
                        // Close playback panel
                        setShowPlayback(false);
                        playbackAutoOpenedRef.current = false;
                        // Ensure review modal never opens
                        setShowReview(false);
                        // Stop all STT
                        stopListening();
                        // Speak farewell and navigate to login
                        try {
                            window.speechSynthesis.cancel();
                            const u = new SpeechSynthesisUtterance(
                                'Your exam has been submitted successfully. Thank you.'
                            );
                            u.onend = () => navigate('/login');
                            u.onerror = () => navigate('/login');
                            window.speechSynthesis.speak(u);
                        } catch {
                            navigate('/login');
                        }
                        // Submit to backend (fire and forget — navigation already scheduled)
                        handleSubmit(true);
                    }}
                    onUpdateAnswer={(qId, ans) => handleAnswerChange(qId, ans)}
                    onClose={handlePlaybackClose}
                    examType={examType}
                    speak={speak}
                    cancel={cancel}
                />
            )}

            {/* Review / Submit modal */}
            {showReview && (
                <ExamReview
                    questions={questions}
                    answers={answers}
                    unanswered={unanswered}
                    speak={speak}
                    cancel={cancel}
                    onClose={() => setShowReview(false)}
                    onEdit={(index) => { setCurrentIndex(index); setShowReview(false); }}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
}
