/**
 * MathExamView.jsx
 * Top-level voice-only mathematical exam writing system.
 * Route: /math-exam/:id
 *
 * Sub-component definitions (CommandHelp, ExamHeader, TapToBegin) are
 * intentionally co-located here — they are private to this route, tightly
 * coupled to its context, and small enough to not warrant separate files.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
// eslint-disable-next-line no-unused-vars -- motion is used via motion.div in CommandHelp/TapToBegin sub-components
import { motion, AnimatePresence } from 'framer-motion';
import 'katex/dist/katex.min.css';

import { useVoiceController } from '../mathExam/hooks/useVoiceController.js';
import StepHistory from '../mathExam/components/StepHistory.jsx';
import VoiceStatusBar from '../mathExam/components/VoiceStatusBar.jsx';
import QuestionPanel from '../mathExam/components/QuestionPanel.jsx';
import ExamControls from '../mathExam/components/ExamControls.jsx';

import { addStep, undo, redo, loadSteps, setVerbosityMode, setInputMode, setCurrentStep } from '../store/mathExamSlice.js';
import { startSession, submitSession, recordAutoSave } from '../store/examSessionSlice.js';
import { saveToLocal, loadFromLocal, clearLocal } from '../mathExam/utils/storageUtils.js';
import { getTTS } from '../mathExam/speech/BrowserTTS.js';
import api from '../config/axios.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sanitize the exam ID coming from the URL parameter.
 * Allows only alphanumeric characters, hyphens and underscores.
 * Falls back to 'default' when the value is absent or invalid.
 */
function sanitizeId(rawId) {
    if (!rawId || typeof rawId !== 'string') return 'default';
    const clean = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
    return clean.length > 0 ? clean : 'default';
}

// ─── Exam data placeholders (replaced at runtime by API fetch) ────────────────
const LOADING_EXAM = { title: 'Loading exam…', duration: 0, questions: [] };
const ERROR_EXAM = { title: 'Failed to load exam', duration: 0, questions: [] };

// ─── Command Cheat-Sheet Overlay ─────────────────────────────────────────────

const COMMAND_GROUPS = [
    { category: '🔄 Mode', commands: ['"enter command mode"', '"exit command mode"', '"brief mode"', '"detailed mode"'] },
    { category: '🧭 Navigate', commands: ['"move left / right"', '"move to numerator / denominator"', '"move to superscript / subscript"', '"next term"', '"go to step 3"', '"move out"'] },
    { category: '📖 Read', commands: ['"read expression briefly"', '"read expression in detail"', '"read all steps"', '"read left side of step 2"', '"where am I"'] },
    { category: '📝 Steps', commands: ['"create next aligned step"', '"edit step 2"', '"delete step 3"', '"undo" / "redo"'] },
    { category: '✏️ Correct', commands: ['"replace numerator with 2x"', '"remove denominator"', '"insert fraction after x"'] },
    { category: '🔢 Math Input', commands: ['"x squared plus 2x"', '"integral from 0 to 1 of x squared d x"', '"x over 2 plus 3"', '"2 by 2 matrix"'] },
    { category: '📋 Exam', commands: ['"review all answers"', '"submit paper"'] },
];

// ─── CommandHelp overlay (private to this route) ──────────────────────────────

const CommandHelp = ({ onClose }) => (
    <AnimatePresence>
        <motion.div
            key="help-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Voice command reference"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.93, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.93, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                style={{
                    background: 'var(--surface)',
                    border: '3px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: 24,
                    boxShadow: '0 0 32px rgba(255,229,0,0.15)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>🎙 Voice Commands</h2>
                    <button onClick={onClose} aria-label="Close" className="text-xl w-8 h-8 flex items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" style={{ color: 'var(--muted)' }}>×</button>
                </div>
                <div className="space-y-4">
                    {COMMAND_GROUPS.map(({ category, commands }) => (
                        <div key={category}>
                            <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }} className="uppercase tracking-wider mb-2">{category}</h3>
                            <div className="grid grid-cols-2 gap-1">
                                {commands.map(cmd => (
                                    <code key={cmd} style={{ fontSize: 12, background: 'var(--card)', color: 'var(--text)', border: '2px solid var(--border)' }} className="rounded px-2 py-1 block truncate">
                                        {cmd}
                                    </code>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)' }} className="mt-4 text-center">Press <kbd style={{ background: 'var(--card)', padding: '2px 6px', borderRadius: 4 }}>H</kbd> anytime to toggle this panel</p>
            </motion.div>
        </motion.div>
    </AnimatePresence>
);

// ─── ExamHeader (private to this route) ──────────────────────────────────────

// ExamHeader is a presentational component. All mic-lifecycle coordination
// (continuous-listening loop, session flags) lives exclusively in MathExamView.
// onToggleMic is pre-wired by the parent so that voice-input state is always
// consistent with the session's internal flags before rendering.
const ExamHeader = ({ title, onToggleMic, isListening, onOpenHelp, isSupported }) => {
    const dispatch = useDispatch();
    // ✅ Granular selectors — avoid re-rendering on unrelated state changes
    const verbosityMode = useSelector(s => s.mathExam.verbosityMode);
    const isExamMode = useSelector(s => s.examSession.isExamMode);
    const duration = useSelector(s => s.examSession.duration);
    const totalQuestions = useSelector(s => s.examSession.totalQuestions);
    const isSubmitted = useSelector(s => s.examSession.isSubmitted);

    const totalSeconds = typeof duration === 'number' && duration > 0 ? duration * 60 : 0;
    const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

    // Reset countdown whenever duration changes (new exam loaded)
    useEffect(() => { setSecondsLeft(totalSeconds); }, [totalSeconds]);

    // Tick countdown every second while exam is active
    useEffect(() => {
        if (!isExamMode || isSubmitted || secondsLeft <= 0) return;
        const id = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) { clearInterval(id); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [isExamMode, isSubmitted, secondsLeft <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

    const hh = String(Math.floor(secondsLeft / 3600)).padStart(2, '0');
    const mm = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
    const ss = String(secondsLeft % 60).padStart(2, '0');
    const timerLabel = `${hh}:${mm}:${ss}`;
    const timerWarning = secondsLeft <= 300 && secondsLeft > 0; // red in last 5 mins

    return (
        <header
            role="banner"
            className="flex-shrink-0 flex items-center justify-between gap-4 px-4 md:px-6"
            style={{
                background: 'var(--surface)',
                borderBottom: '3px solid var(--accent)',
                height: '68px',
            }}
        >
            {/* Brand + title */}
            <div className="flex items-center gap-3 min-w-0">
                <div
                    aria-label="Saarthi logo"
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: '12px',
                        background: 'var(--accent)',
                        color: 'var(--bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 20,
                        boxShadow: '0 0 16px rgba(255, 229, 0, 0.4)',
                    }}
                >
                    S
                </div>
                <div className="truncate">
                    <h1
                        className="truncate"
                        style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: 'var(--text)',
                        }}
                    >
                        {title}
                    </h1>
                    <p
                        style={{
                            fontSize: 12,
                            color: 'var(--muted)',
                        }}
                    >
                        Saarthi · Voice Math {totalQuestions ? `· ${totalQuestions} questions` : ''}
                    </p>
                </div>
            </div>

            {/* Center: timer + mode toggles */}
            <div className="flex-1 flex items-center justify-center gap-5">
                {/* Timer pill */}
                <div
                    role="timer"
                    aria-label={`Time remaining ${timerLabel}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 18px',
                        borderRadius: 999,
                        border: `3px solid ${timerWarning ? 'var(--danger)' : 'var(--warn)'}`,
                        color: timerWarning ? 'var(--danger)' : 'var(--warn)',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 18,
                        background: 'transparent',
                        transition: 'border-color 0.5s, color 0.5s',
                    }}
                >
                    <span
                        aria-hidden="true"
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: '999px',
                            background: timerWarning ? 'var(--danger)' : 'var(--warn)',
                            boxShadow: timerWarning ? '0 0 10px rgba(255,68,68,0.9)' : '0 0 10px rgba(255,140,0,0.9)',
                            animation: 'saarthi-blink 1.2s infinite',
                        }}
                    />
                    <span>{timerLabel}</span>
                </div>

                {/* Verbosity + input mode toggles */}
                <div className="hidden md:flex items-center gap-3">
                    <div
                        aria-label="Audio reading mode"
                        style={{
                            display: 'flex',
                            borderRadius: 999,
                            border: '2px solid var(--border)',
                            overflow: 'hidden',
                        }}
                    >
                        {['brief', 'detailed'].map(mode => (
                            <button
                                key={mode}
                                type="button"
                                aria-label={mode === 'brief' ? 'Brief reading mode' : 'Detailed reading mode'}
                                onClick={() => dispatch(setVerbosityMode(mode))}
                                style={{
                                    padding: '6px 10px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.5,
                                    background: verbosityMode === mode ? 'var(--accent)' : 'transparent',
                                    color: verbosityMode === mode ? 'var(--bg)' : 'var(--muted)',
                                    border: 'none',
                                }}
                            >
                                {mode === 'brief' ? 'Brief' : 'Detailed'}
                            </button>
                        ))}
                    </div>


                </div>
            </div>

            {/* Right: pause + help + status */}
            <div className="flex items-center gap-3">
                <motion.button
                    id="mic-toggle"
                    whileTap={{ scale: 0.95 }}
                    onClick={onToggleMic}
                    type="button"
                    aria-label={isListening ? 'Pause voice input' : 'Start voice input (Space)'}
                    style={{
                        padding: '8px 18px',
                        borderRadius: 999,
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 13,
                        background: isListening ? 'var(--danger)' : 'var(--accent)',
                        color: 'var(--bg)',
                    }}
                >
                    {isListening ? '⏸ Pause' : '🎙 Listen'}
                </motion.button>

                <button
                    type="button"
                    onClick={onOpenHelp}
                    aria-label="Open voice command help"
                    title="Press H for help"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '999px',
                        border: '3px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    ❓
                </button>

                <div className="hidden lg:flex flex-col items-end">
                    {!isSupported && (
                        <span
                            style={{
                                fontSize: 11,
                                color: 'var(--warn)',
                            }}
                        >
                            ⚠ No speech API
                        </span>
                    )}
                    <span
                        style={{
                            fontSize: 11,
                            color: 'var(--muted)',
                        }}
                    >
                        {isExamMode ? '🔒 Exam mode' : '✏️ Practice'}
                    </span>
                </div>
            </div>
        </header>
    );
};

// ─── TapToBegin gate overlay (private to this route) ─────────────────────────

const TapToBegin = ({ onBegin }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 cursor-pointer select-none"
        style={{ background: 'var(--bg)' }}
        onClick={onBegin}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onBegin(); }}
        role="button"
        tabIndex={0}
        aria-label="Tap or press Enter to begin voice-guided exam"
    >
        <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
                background: 'rgba(255,229,0,0.15)',
                border: '3px solid var(--accent)',
                boxShadow: '0 0 32px rgba(255,229,0,0.4)',
            }}
        >
            <span className="text-5xl" aria-hidden="true">🎙</span>
        </motion.div>
        <div className="text-center space-y-2">
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Tap or press any key to begin</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>Voice guidance will start automatically</p>
        </div>
        <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full animate-ping" style={{ background: 'var(--accent)' }} aria-hidden="true" />
            <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Saarthi · Voice Math Exam</p>
        </div>
    </motion.div>
);

// ─── MathExamView ─────────────────────────────────────────────────────────────

const MathExamView = () => {
    const { id: rawId } = useParams();
    // ✅ Validate / sanitize the URL param before using it as a storage key
    const safeId = sanitizeId(rawId);

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [showHelp, setShowHelp] = useState(false);
    const [showGate, setShowGate] = useState(true); // fullscreen tap-to-begin gate

    // ── Live exam data from the API ───────────────────────────────────────────
    const [exam, setExam] = useState(LOADING_EXAM);
    const [examLoading, setExamLoading] = useState(true);
    const [examError, setExamError] = useState(null);

    // ✅ Granular selectors — each component/hook only subscribes to what it reads
    const steps = useSelector(s => s.mathExam.steps);
    const currentStepIndex = useSelector(s => s.mathExam.currentStepIndex);
    const isListening = useSelector(s => s.mathExam.isListening);
    const pendingConfirmation = useSelector(s => s.mathExam.pendingConfirmation);
    const title = useSelector(s => s.examSession.title);

    const autoSaveRef = useRef(null);
    // Holds the latest bound startListening function from the voice controller
    const startListeningRef = useRef(null);
    /**
     * userStoppedRef — set to true when the user explicitly presses Stop or Esc.
     * The auto-restart loop checks this flag and will NOT restart the mic while
     * it is true, resolving the contradiction between the Stop UI and auto-restart.
     * Reset to false when the user manually starts listening again.
     */
    const userStoppedRef = useRef(false);
    /**
     * readyToAutoListen — becomes true only after the welcome TTS in handleBegin
     * finishes speaking.  This prevents the auto-restart loop from firing the mic
     * immediately (before the welcome message ends), which would cause STT to
     * accidentally transcribe the TTS audio.
     */
    const readyToAutoListenRef = useRef(false);

    // ── Auth-guard + fetch exam data ───────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        setExamLoading(true);
        setExamError(null);
        api.get(`/exam/${safeId}`)
            .then(res => {
                const data = res.data;
                // Ensure questions is always an array
                if (!Array.isArray(data.questions)) data.questions = [];
                data.questions = data.questions.map((q) => ({
                    ...q,
                    type: q?.type === 'mcq' ? 'mcq' : 'text',
                }));
                setExam(data);
            })
            .catch(err => {
                console.error('Failed to load exam:', err);
                const status = err.response?.status;
                if (status === 401) { navigate('/login'); return; }
                setExam(ERROR_EXAM);
                setExamError(status === 404 ? 'Exam not found.' : 'Failed to load exam.');
            })
            .finally(() => setExamLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rawId]);

    // ── Initialise session (re-runs when the exam loads) ─────────────────────
    useEffect(() => {
        if (examLoading) return; // wait for data
        // Reset auto-listen gate on each route change
        readyToAutoListenRef.current = false;
        userStoppedRef.current = false;
        setShowGate(true);

        const saved = loadFromLocal(safeId);
        if (saved?.steps?.length > 0) {
            dispatch(loadSteps(saved.steps));
        } else {
            dispatch(addStep({ ast: { type: 'Empty' }, latex: '' }));
        }
        dispatch(startSession({
            examId: safeId,
            title: exam.title,
            duration: exam.duration,
            totalQuestions: exam.questions.length,
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examLoading]);

    // ── Called when the student taps / presses the gate ──────────────────────
    const handleBegin = useCallback(() => {
        setShowGate(false);
        userStoppedRef.current = false; // fresh session — no deliberate stop yet

        const saved = loadFromLocal(safeId);
        const hasSession = saved?.steps?.length > 0;

        const welcomeMsg = hasSession
            ? `Welcome back. Restored ${saved.steps.length} step${saved.steps.length !== 1 ? 's' : ''} from your previous session. Listening now.`
            : 'Welcome to Saarthi Math Exam. Voice guidance is now active. Dictate a math expression or say enter command mode for navigation. Say help for a command list.';

        // Speak welcome → gate opens → THEN allow auto-restart to start the mic
        getTTS().speak(welcomeMsg).then(() => {
            // ✅ Only enable auto-restart after TTS has finished so the mic does
            //    not accidentally capture the welcome speech output.
            readyToAutoListenRef.current = true;
            // Small extra pause so TTS audio fully decays before STT activates
            setTimeout(() => {
                if (startListeningRef.current) startListeningRef.current();
            }, 500);
        });
    }, [safeId]);

    // ── Auto-save every 30 s ──────────────────────────────────────────────────
    // Use refs so the interval fires WITHOUT being torn down every time `steps`
    // changes — this avoids timer-starvation and resource churn when the user
    // is typing quickly.
    const stepsRef = useRef(steps);
    const safeIdRef = useRef(safeId);
    useEffect(() => { stepsRef.current = steps; }, [steps]);
    useEffect(() => { safeIdRef.current = safeId; }, [safeId]);

    useEffect(() => {
        autoSaveRef.current = setInterval(() => {
            if (stepsRef.current.length > 0) {
                saveToLocal(stepsRef.current, safeIdRef.current);
                dispatch(recordAutoSave());
            }
        }, 30_000);
        return () => clearInterval(autoSaveRef.current);
    }, [dispatch]);

    // ── Export & submit handlers ───────────────────────────────────────────────
    const handleSubmit = useCallback(() => {
        dispatch(submitSession());
        clearLocal(safeId);
        getTTS().speakNow('Your paper has been submitted. Returning to dashboard.').then(() => navigate('/student'));
    }, [dispatch, navigate, safeId]);

    // ── Voice controller ───────────────────────────────────────────────────────
    const { startListening: _startListening, stopListening: _stopListening, say, readStep, readAll, isSupported } = useVoiceController({
        onSubmit: handleSubmit,
    });

    /**
     * Wrap startListening / stopListening so we can maintain userStoppedRef in
     * one place without duplicating logic at every call site.
     */
    const startListening = useCallback(() => {
        userStoppedRef.current = false;
        _startListening();
    }, [_startListening]);

    const stopListening = useCallback(() => {
        // ✅ Mark the stop as deliberate so the auto-restart loop does not
        //    immediately re-open the mic and contradict the user's intent.
        userStoppedRef.current = true;
        _stopListening();
    }, [_stopListening]);

    // Keep ref in sync with the latest startListening binding (used by handleBegin)
    useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

    // ── H / Space key shortcuts ───────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.key === 'h' || e.key === 'H') {
                setShowHelp(v => !v);
            }

            if (e.key === ' ') {
                e.preventDefault(); // prevent page scroll
                if (!showGate) {
                    // Toggle mic exactly like the header button does
                    if (isListening) {
                        stopListening();
                    } else {
                        startListening();
                    }
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showGate, isListening, startListening, stopListening]);

    // ── Esc key stops listening deliberately ──────────────────────────────────
    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === 'Escape') {
                stopListening(); // sets userStoppedRef = true, mic will not auto-restart
            }
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [stopListening]);

    // ── Auto-restart loop (continuous voice mode) ─────────────────────────────
    // Restarts the mic after each utterance, UNLESS:
    //   • the tap-to-begin gate is still visible  (showGate)
    //   • the user explicitly stopped the mic     (userStoppedRef)
    //   • TTS welcome hasn't finished yet          (readyToAutoListenRef)
    //   • a confirmation is awaiting a response   (pendingConfirmation)
    useEffect(() => {
        if (
            !showGate &&
            !isListening &&
            !pendingConfirmation &&
            readyToAutoListenRef.current &&
            !userStoppedRef.current
        ) {
            // 800 ms debounce gives TTS time to finish before STT opens
            const t = setTimeout(() => {
                if (startListeningRef.current && !userStoppedRef.current) {
                    startListeningRef.current();
                }
            }, 800);
            return () => clearTimeout(t);
        }
    }, [isListening, showGate, pendingConfirmation]);

    // ─────────────────────────────────────────────────────────────────────────

    // Loading screen
    if (examLoading) {
        return (
            <div
                className="h-screen flex items-center justify-center flex-col gap-4"
                style={{ background: 'var(--bg)', color: 'var(--text)' }}
            >
                <div
                    className="animate-spin"
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: '999px',
                        borderWidth: 4,
                        borderStyle: 'solid',
                        borderColor: 'var(--accent)',
                        borderTopColor: 'transparent',
                    }}
                />
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading exam…</p>
            </div>
        );
    }

    // Error screen
    if (examError) {
        return (
            <div
                className="h-screen flex items-center justify-center flex-col gap-4 p-6 text-center"
                style={{ background: 'var(--bg)', color: 'var(--text)' }}
            >
                <span style={{ fontSize: 48 }}>⚠️</span>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{examError}</h2>
                <button
                    type="button"
                    onClick={() => navigate('/student')}
                    style={{
                        marginTop: 8,
                        padding: '10px 24px',
                        borderRadius: '999px',
                        background: 'var(--accent)',
                        color: 'var(--bg)',
                        fontWeight: 700,
                        border: 'none',
                    }}
                    aria-label="Back to student dashboard"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    const totalMcq = (exam.questions || []).filter(q => q.type === 'mcq').length;
    const totalWritten = (exam.questions || []).filter(q => q.type !== 'mcq').length;

    return (
        <div
            className="h-screen flex flex-col overflow-hidden font-sans"
            aria-label="Saarthi Voice Math Exam System"
            style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >

            {/* Skip link */}
            <a href="#workspace" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                Skip to workspace
            </a>

            {/* Tap-to-begin gate (covers everything until first gesture) */}
            <AnimatePresence>
                {showGate && <TapToBegin onBegin={handleBegin} />}
            </AnimatePresence>

            <ExamHeader
                title={title || exam.title}
                onToggleMic={isListening ? stopListening : startListening}
                isListening={isListening}
                onOpenHelp={() => setShowHelp(v => !v)}
                isSupported={isSupported}
            />

            {/* 3-column body */}
            <div
                id="workspace"
                className="flex-1 flex min-h-0"
                style={{ background: 'var(--bg)' }}
            >
                {/* LEFT: Question Panel (280px) */}
                <div
                    className="flex-shrink-0 hidden md:flex flex-col"
                    style={{
                        width: 280,
                        background: 'var(--surface)',
                        borderRight: '3px solid var(--border)',
                    }}
                    role="navigation"
                    aria-label="Question list"
                >
                    <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: 'var(--border)' }} aria-live="polite">
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent2)', border: '2px solid var(--accent2)', borderRadius: 999, padding: '2px 8px' }}>
                            MCQ {totalMcq}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', border: '2px solid var(--success)', borderRadius: 999, padding: '2px 8px' }}>
                            WRITE {totalWritten}
                        </span>
                    </div>
                    <QuestionPanel questions={exam.questions} />
                </div>

                {/* CENTRE: Workspace */}
                <main
                    className="flex-1 flex flex-col min-h-0 overflow-hidden"
                    aria-label="Step-by-step math workspace"
                >
                    <div
                        className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-2.5"
                        style={{
                            background: 'var(--surface)',
                            borderBottom: '3px solid var(--border)',
                        }}
                    >
                        <p
                            style={{
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                                color: 'var(--muted)',
                            }}
                        >
                            Step {currentStepIndex + 1} of {steps.length}
                        </p>
                        <button
                            type="button"
                            onClick={startListening}
                            aria-label="Start listening for math dictation"
                            style={{
                                fontSize: 12,
                                color: 'var(--accent)',
                                background: 'transparent',
                                border: 'none',
                            }}
                        >
                            🎙 Click or press Space to listen
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
                        <StepHistory
                            onEditStep={(idx) => {
                                dispatch(setCurrentStep(idx));
                                say(`Now editing step ${idx + 1}.`);
                            }}
                            onReadStep={(idx) => readStep(idx)}
                        />
                    </div>
                </main>

                {/* RIGHT: Controls (240px) */}
                <div
                    className="flex-shrink-0 hidden lg:flex flex-col"
                    style={{
                        width: 240,
                        background: 'var(--surface)',
                        borderLeft: '3px solid var(--border)',
                    }}
                    aria-label="Exam controls panel"
                >
                    <ExamControls
                        onReview={readAll}
                        onSubmit={() => {
                            say('Are you sure you want to submit? Say "yes" to confirm or "no" to cancel.');
                            dispatch({ type: 'mathExam/setPendingConfirmation', payload: { prompt: 'Say yes to submit or no to cancel.', type: 'SUBMIT' } });
                        }}
                        onUndo={() => dispatch(undo())}
                        onRedo={() => dispatch(redo())}
                        onNewStep={() => dispatch(addStep({ ast: { type: 'Empty' }, latex: '' }))}
                    />
                </div>
            </div>

            {/* Persistent voice status bar */}
            <VoiceStatusBar />

            {/* Help overlay */}
            {showHelp && <CommandHelp onClose={() => setShowHelp(false)} />}

            {/* Screen-reader live region */}
            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" id="sr-status" />
        </div>
    );
};

export default MathExamView;
