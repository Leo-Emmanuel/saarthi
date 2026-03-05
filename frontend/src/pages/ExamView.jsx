import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/axios';
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
import useGradingStatusPoll from '../hooks/useGradingStatusPoll';
import useTTS from '../hooks/useTTS';
import useTabDetection from '../hooks/useTabDetection';
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

// Grading status polling
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_RETRIES = 30; // ~90 seconds before giving up

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExamView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const handleSubmitRef = useRef(null);

    // ── TTS Hook ──────────────────────────────────────────────────────
    // TODO: Get TTS settings from Redux or login response
    const { speak, cancel } = useTTS({ rate: 1.0, pitch: 1.0, voice: null });

    // ── Tab Detection Hook ───────────────────────────────────────────────
    const { violations } = useTabDetection({
        speak,
        maxViolations: 3,
        onViolation: (violation, allViolations) => {
            setTabViolations(allViolations);
        }
    });

    // ── Exam data ────────────────────────────────────────────────────────────
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Answers ──────────────────────────────────────────────────────────────
    const [answers, setAnswers] = useState({});   // { [questionId]: answerString }
    const answersRef = useRef({});

    // ── Navigation ───────────────────────────────────────────────────────────
    const [currentIndex, setCurrentIndex] = useState(0);

    // ── Transition card (mixed exams) ────────────────────────────────────────
    const [transitionCard, setTransitionCard] = useState(null); // null | { from, to }
    const transitionTimerRef = useRef(null);

    // ── Submission / grading ─────────────────────────────────────────────────
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { gradingStatus, setGradingStatus, startGradingPoll, stopGradingPoll } = useGradingStatusPoll({
        id,
        api,
        pollIntervalMs: POLL_INTERVAL_MS,
        maxRetries: MAX_POLL_RETRIES,
    });

    // ── Review screen ────────────────────────────────────────────────────────
    const [showReview, setShowReview] = useState(false);

    // ── New Features State ───────────────────────────────────────────────
    const [showPanic, setShowPanic] = useState(false);
    const [showPlayback, setShowPlayback] = useState(false);
    const [tabViolations, setTabViolations] = useState([]);

    // ── Save status ──────────────────────────────────────────────────────────
    const [saveStatus, setSaveStatus] = useState('saved');
    const draftTimerRef = useRef(null);
    const draftInFlightRef = useRef(false);
    const queuedDraftRef = useRef(null);
    const draftDirtyRef = useRef(false);

    // ── Voice / global exam mode ──────────────────────────────────────────────
    const [readingMode, setReadingMode] = useState('brief'); // 'brief' | 'detailed'
    const [paused, setPaused] = useState(false);
    const mountedRef = useRef(true);

    // ── Timer ────────────────────────────────────────────────────────────────
    const { secondsLeft, stop: stopTimer } = useExamTimer({
        durationMinutes: exam?.duration,
        paused,
        enabled: !submitted,
        onExpire: () => {
            if (!submitted) handleSubmitRef.current?.(true);
        },
    });

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
    useEffect(() => {
        if (!questions.length || hasIntroFiredRef.current) return;

        let firstQuestionTimer = null;
        const handleUserGesture = () => {
            hasIntroFiredRef.current = true;
            const introText = getExamTypeTTSIntro(examType);
            speak(introText);

            // Read first question after intro
            firstQuestionTimer = setTimeout(() => {
                const firstQ = questions[0];
                if (firstQ) {
                    const questionText = getQuestionInstruction(firstQ, 1, questions.length);
                    speak(questionText);
                }
            }, 2000);

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
            if (firstQuestionTimer) clearTimeout(firstQuestionTimer);
            document.removeEventListener('click', handleUserGesture);
            document.removeEventListener('keydown', handleUserGesture);
            document.removeEventListener('touchstart', handleUserGesture);
        };
    }, [questions.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── TTS per-question read-aloud ──────────────────────────────────────────
    useEffect(() => {
        if (!currentQuestion) return;
        const t = setTimeout(() => {
            const questionText = getQuestionInstruction(currentQuestion, currentIndex + 1, total);
            speak(questionText);
        }, 800); // Increased delay to ensure question is fully rendered
        return () => {
            clearTimeout(t);
            // Don't cancel speech immediately - let it finish when moving between questions
        };
    }, [currentIndex, currentQuestion, total]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Cleanup on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            stopTimer();
            stopGradingPoll();
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
            await api.post(`/exam/${id}/submit`, { answers: nextAnswers, final: false });
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
        showReview,
        showPanic,
        secondsLeft,
        speak,
        cancel,
        onHelp: () => setShowPanic(true),
        onTimeRemaining: (s) => {
            const secs = Math.max(0, Math.floor(Number(s || 0)));
            const msg = `${Math.floor(secs / 60)} minutes and ${secs % 60} seconds remaining`;
            speak(msg);
        },
        onSelectMCQ: (qId, letter) => {
            handleAnswerChange(qId, letter);
            // Always speak confirmation and auto-advance (voice-first behaviour)
            speak(`Option ${letter} selected. Moving to next question.`, {
                onEnd: () => {
                    if (currentIndex < total - 1) {
                        goNext();
                    } else {
                        speak("You're on the last question. Opening review.");
                        setShowReview(true);
                    }
                },
            });
        },
        onNext: () => {
            if (currentIndex >= total - 1) {
                speak("You're on the last question. Opening review and submit.");
                setShowReview(true);
                return;
            }
            goNext();
        },
        onPrev: goPrev,
        onSubmit: () => setShowReview(true),
        onClear: (qId) => handleAnswerChange(qId, ''),
        onRepeat: (q, idx, t) => speak(getQuestionInstruction(q, idx + 1, t)),
        onDictate: (qId, text) => {
            const prevText = String(answersRef.current[qId] ?? '').trim();
            const merged = prevText ? `${prevText} ${text}` : text;
            handleAnswerChange(qId, merged);
        },
        onReview: () => setShowReview(true),
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
            speak('Resuming your exam.');
            // Re-engage mic after help closes
            setTimeout(() => startListeningForCurrent(), 600);
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

        let nextAnswers = null;
        setAnswerHistory(prevHist => {
            const entry = prevHist[qId];
            if (!entry || entry.past.length === 0) return prevHist;
            const previousValue = entry.past[entry.past.length - 1];
            const newPast = entry.past.slice(0, -1);
            const currentValue = answersRef.current[qId] ?? '';
            const newFuture = [currentValue, ...(entry.future || [])];
            nextAnswers = { ...answersRef.current, [qId]: previousValue };
            return {
                ...prevHist,
                [qId]: { past: newPast, future: newFuture },
            };
        });

        if (nextAnswers) {
            answersRef.current = nextAnswers;
            setAnswers(nextAnswers);
            draftDirtyRef.current = true;
            clearTimeout(draftTimerRef.current);
            const delay = examType === 'writing-only' ? DRAFT_SAVE_DELAY_WRITTEN : DRAFT_SAVE_DELAY_MCQ;
            draftTimerRef.current = setTimeout(() => saveDraft(nextAnswers), delay);
        }
    }, [currentQuestion, examType, saveDraft]);

    const redoCurrent = useCallback(() => {
        const qId = currentQuestion?._id != null ? String(currentQuestion._id) : null;
        if (!qId) return;

        let nextAnswers = null;
        setAnswerHistory(prevHist => {
            const entry = prevHist[qId];
            if (!entry || !entry.future || entry.future.length === 0) return prevHist;
            const nextValue = entry.future[0];
            const newFuture = entry.future.slice(1);
            const currentValue = answersRef.current[qId] ?? '';
            const newPast = [...(entry.past || []), currentValue];
            nextAnswers = { ...answersRef.current, [qId]: nextValue };
            return {
                ...prevHist,
                [qId]: { past: newPast, future: newFuture },
            };
        });

        if (nextAnswers) {
            answersRef.current = nextAnswers;
            setAnswers(nextAnswers);
            draftDirtyRef.current = true;
            clearTimeout(draftTimerRef.current);
            const delay = examType === 'writing-only' ? DRAFT_SAVE_DELAY_WRITTEN : DRAFT_SAVE_DELAY_MCQ;
            draftTimerRef.current = setTimeout(() => saveDraft(nextAnswers), delay);
        }
    }, [currentQuestion, examType, saveDraft]);

    // ── Submission ───────────────────────────────────────────────────────────
    const handleSubmit = useCallback(async (isAutoSubmit = false) => {
        if (submitting || submitted) return;

        // Manual submit: confirm unanswered questions
        if (!isAutoSubmit) {
            const unans = getUnansweredQuestions(questions, answersRef.current);
            if (unans.length > 0) {
                setShowReview(true);
                return;
            }
        }

        setSubmitting(true);
        setShowReview(false);
        stopTimer();
        stopGradingPoll();

        try {
            await api.post(`/exam/${id}/submit`, {
                answers: answersRef.current,
                tab_violations: tabViolations,
                final: true,
            });
            setSubmitted(true);
            startGradingPoll();
        } catch (err) {
            if (mountedRef.current) {
                setError('Submission failed. Please try again.');
                setSubmitting(false);
            }
        }
    }, [id, submitting, submitted, questions]);

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

    // ── Grading complete screen ───────────────────────────────────────────────
    if (gradingStatus === 'graded') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center"
                style={{ background: 'var(--bg)', color: 'var(--text)', gap: 16 }}>
                <p style={{ fontSize: 36 }}>🎉</p>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--success)' }}>
                    Exam Submitted & Graded
                </h1>
                <p style={{ color: 'var(--muted)' }}>Your results have been recorded.</p>
                <button
                    type="button"
                    onClick={() => navigate('/student')}
                    style={{
                        marginTop: 16,
                        padding: '12px 32px',
                        background: 'var(--accent)',
                        color: 'var(--bg)',
                        border: 'none',
                        borderRadius: 50,
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: 'pointer',
                    }}
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (submitted && gradingStatus === 'grading') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center"
                style={{ background: 'var(--bg)', color: 'var(--text)', gap: 12 }}>
                <p style={{ fontSize: 32 }}>⏳</p>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--warn)' }}>
                    Grading in Progress…
                </h1>
                <p style={{ color: 'var(--muted)' }}>
                    Your answers are being graded. You can safely close this page.
                </p>
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
            <ExamTopBar
                title={exam?.title || 'Exam'}
                subtitle={paused ? 'Paused' : 'Voice-first exam mode'}
                timerText={secondsLeft === null ? '--:--:--' : formatHMS(secondsLeft)}
                isTimeCritical={isTimeCritical(secondsLeft ?? 0)}
                violationsCount={violations.length}
                readingMode={readingMode}
                onToggleReadingMode={setReadingMode}
                mcqCount={counts?.mcq ?? 0}
                writeCount={counts?.writing ?? 0}
                activePane={currentQuestion?.type === 'mcq' || Array.isArray(currentQuestion?.options) ? 'mcq' : 'write'}
                onPause={() => {
                    setPaused(p => !p);
                    stopListening();
                }}
                onHelp={() => setShowPanic(true)}
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
                onReviewAll={() => setShowPlayback(true)}
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
                answers={answers}
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
                onOpenReview={() => setShowReview(true)}
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
                    onDismiss={() => {
                        setShowPanic(false);
                        // Re-engage mic after overlay closes
                        setTimeout(() => startListeningForCurrent(), 600);
                    }}
                    speak={speak}
                    cancel={cancel}
                />
            )}

            {/* Answer Playback */}
            {showPlayback && (
                <AnswerPlayback
                    questions={questions}
                    answers={answers}
                    onEdit={(index) => { setShowPlayback(false); setCurrentIndex(index); }}
                    onComplete={() => { setShowPlayback(false); setShowReview(true); }}
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
                    onClose={() => setShowReview(false)}
                    onEdit={(index) => { setCurrentIndex(index); setShowReview(false); }}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
}
