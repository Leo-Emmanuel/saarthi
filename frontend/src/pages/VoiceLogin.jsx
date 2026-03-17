import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mic, Volume2 } from 'lucide-react';
import useTTS from '../hooks/useTTS';
import usePageTitle from '../hooks/usePageTitle';

// ── Module-level text processing ──────────────────────────────────────────────
// ✅ Extracted from the component: these are pure functions with no dependency
// on React state or hooks, so they belong at module scope (satisfies SRP).
//
// Shared spoken-digit → numeral mapping used by both ID and PIN processing.
// ✅ Single source of truth — eliminates the near-identical duplicate objects
// that previously existed inside processIdText and processPinText.
const DIGIT_WORD_MAP = {
    // ID-safe homophones only (no bare 'O' → '0' which corrupts alphanumeric IDs)
    'ZERO': '0', 'OH': '0',
    'ONE': '1', 'WON': '1',
    'TWO': '2', 'TO': '2', 'TOO': '2',
    'THREE': '3', 'TREE': '3',
    'FOUR': '4', 'FOR': '4', 'FORE': '4',
    'FIVE': '5', 'HIVE': '5',
    'SIX': '6',
    'SEVEN': '7',
    'EIGHT': '8', 'ATE': '8',
    'NINE': '9',
};

/**
 * Normalise a speech-recognition transcript into a clean token.
 *
 * @param {string}  text       - Raw transcript from SpeechRecognition.
 * @param {object}  [options]
 * @param {boolean} [options.digitsOnly=false] - Strip all non-digit chars (PIN mode).
 * @param {object}  [options.extraMap={}]      - Additional word→char mappings to apply
 *                                              before the shared DIGIT_WORD_MAP.
 */
function processSpokenText(text, { digitsOnly = false, extraMap = {} } = {}) {
    let p = text.toUpperCase();
    // Apply caller-supplied overrides first (e.g. bare 'O' → '0' for PIN mode)
    Object.entries(extraMap).forEach(([key, val]) => {
        p = p.replace(new RegExp(`\\b${key}\\b`, 'g'), val);
    });
    // Apply the shared digit-word map
    Object.entries(DIGIT_WORD_MAP).forEach(([key, val]) => {
        p = p.replace(new RegExp(`\\b${key}\\b`, 'g'), val);
    });
    return digitsOnly ? p.replace(/\D/g, '') : p.replace(/[^A-Z0-9]/g, '');
}

// Steps: 0=Idle  1=Listening ID  2=Listening PIN  3=Verifying
export default function VoiceLogin() {
    usePageTitle('Student Login');
    const { pinLogin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const announce = () => {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(
                'Welcome to Saarthi. You are on the voice login page. '
                + 'Please say your student ID to begin.'
            );
            window.speechSynthesis.speak(u);
            document.removeEventListener('click', announce);
            document.removeEventListener('keydown', announce);
            document.removeEventListener('touchstart', announce);
        };
        document.addEventListener('click', announce);
        document.addEventListener('keydown', announce);
        document.addEventListener('touchstart', announce);
        return () => {
            document.removeEventListener('click', announce);
            document.removeEventListener('keydown', announce);
            document.removeEventListener('touchstart', announce);
        };
    }, []);

    const [step, setStep] = useState(0);
    const stepRef = useRef(0);
    const [status, setStatus] = useState('Welcome to Saarthi. Click start to login.');
    const [isListening, setIsListening] = useState(false);
    const [studentId, setStudentId] = useState('');
    const [pin, setPin] = useState('');
    const [isManual, setIsManual] = useState(false);

    // ✅ Store utterance in a ref to prevent V8 garbage-collecting it before
    // onend fires — a known Chrome bug that causes TTS to hang silently.
    const utteranceRef = useRef(null);
    // Active recognition instance — needed for cleanup and abort-before-restart
    const recognitionRef = useRef(null);
    // Stable ref to handleInput so the recognition.onresult callback always
    // calls the latest version without re-creating the recognition instance.
    const handleInputRef = useRef(null);

    // Processing lock so TTS and Mic don't collide, and to handle state correctly
    const processingRef = useRef(false);
    const listenStartRef = useRef(0);
    const heardResultRef = useRef(false);
    const noSpeechHandledRef = useRef(false);
    const startListeningRef = useRef(() => { });

    // Cancel any lingering TTS on mount/unmount so voice login starts clean.
    useEffect(() => {
        window.speechSynthesis?.cancel();
        return () => {
            window.speechSynthesis?.cancel();
        };
    }, []);

    // Sync state with ref
    useEffect(() => { stepRef.current = step; }, [step]);

    // ── SpeechSynthesis helper ────────────────────────────────────────────────
    const speak = useCallback((text) => {
        setStatus(text);
        window.speechSynthesis.cancel();
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utteranceRef.current = utterance; // ✅ Prevent GC before onend

            const fallback = setTimeout(() => {
                utteranceRef.current = null;
                resolve();
            }, 10000); // Safety resolve if onend never fires

            utterance.onend = () => { clearTimeout(fallback); utteranceRef.current = null; resolve(); };
            utterance.onerror = (e) => {
                clearTimeout(fallback);
                // interrupted/canceled is expected when we cancel TTS — don't log it as error
                if (e.error !== 'interrupted' && e.error !== 'canceled') {
                    console.error('TTS error:', e);
                }
                utteranceRef.current = null;
                resolve();
            };

            // Add interruption handling
            utterance.oninterrupt = (e) => {
                clearTimeout(fallback);
                utteranceRef.current = null;
                resolve();
            };

            window.speechSynthesis.speak(utterance);
        });
    }, []);

    // ── Text processing helpers (wrappers around module-level processSpokenText) ──
    const processIdText = useCallback(
        (text) => processSpokenText(text),           // alphanumeric, no bare O→0
        []
    );

    const processPinText = useCallback(
        (text) => processSpokenText(text, { digitsOnly: true, extraMap: { 'O': '0' } }),
        []
    );

    const startSTTAfterTTS = useCallback((startFn) => {
        const runStart = () => {
            window.speechSynthesis?.cancel();
            setTimeout(startFn, 300);
        };

        if (window.speechSynthesis?.speaking) {
            const poll = setInterval(() => {
                if (!window.speechSynthesis.speaking) {
                    clearInterval(poll);
                    setTimeout(runStart, 500);
                }
            }, 200);
        } else {
            runStart();
        }
    }, []);

    const scheduleRestart = useCallback((delayMs = 500) => {
        setTimeout(() => {
            if (!processingRef.current && (stepRef.current === 1 || stepRef.current === 2)) {
                startListeningRef.current?.();
            }
        }, delayMs);
    }, []);

    // ── Recognition session management ────────────────────────────────────────
    const startRecognitionCore = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setStatus('Voice recognition not supported. Please use the manual login.');
            return;
        }
        // Abort existing session before opening a new one
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* ignore */ }
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognitionRef.current = recognition;

        // Track this listening session so we only say "didn't hear" after enough wait.
        listenStartRef.current = Date.now();
        heardResultRef.current = false;
        noSpeechHandledRef.current = false;

        // Keep the mic open long enough before forcing an end cycle.
        const maxListenTimer = setTimeout(() => {
            if (recognitionRef.current === recognition) {
                try { recognition.stop(); } catch { /* ignore */ }
            }
        }, 10000);

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event) => {
            heardResultRef.current = true;
            const transcript = event.results[0][0].transcript;
            if (handleInputRef.current) handleInputRef.current(transcript);
        };

        recognition.onerror = async (event) => {
            if (event.error === 'aborted') return; // Intentional stop/abort — do not restart.

            if (event.error === 'not-allowed') {
                clearTimeout(maxListenTimer);
                setStatus('Microphone access denied. Please allow microphone access or use manual login.');
                setStep(0);
                stepRef.current = 0;
            } else if (event.error === 'no-speech') {
                // Restart silently for no-speech so we don't spam prompts.
                clearTimeout(maxListenTimer);
                noSpeechHandledRef.current = true;
                scheduleRestart(500);
            } else {
                clearTimeout(maxListenTimer);
                if (processingRef.current || stepRef.current === 0) return;
                console.error('Speech recognition error:', event.error);
                processingRef.current = true;
                await speak('There was a microphone error. Please try again.');
                processingRef.current = false;
                scheduleRestart(200);
            }
        };

        recognition.onend = async () => {
            clearTimeout(maxListenTimer);
            if (recognitionRef.current === recognition) {
                setIsListening(false);
            }

            if (processingRef.current || !(stepRef.current === 1 || stepRef.current === 2)) return;

            // no-speech already handled in onerror; skip duplicate onend handling.
            if (noSpeechHandledRef.current) {
                noSpeechHandledRef.current = false;
                return;
            }

            if (!heardResultRef.current) {
                const elapsed = Date.now() - listenStartRef.current;
                if (elapsed < 8000) {
                    scheduleRestart(500);
                    return;
                }

                processingRef.current = true;
                await speak("I didn't hear anything clearly. Please try again.");
                processingRef.current = false;
                scheduleRestart(1500);
                return;
            }

            // Normal end after a recognized result: keep listening flow alive quietly.
            scheduleRestart(300);
        };

        recognition.start();
        setStatus('Listening...');
    }, [scheduleRestart, speak]);

    const startListening = useCallback(() => {
        startSTTAfterTTS(startRecognitionCore);
    }, [startRecognitionCore, startSTTAfterTTS]);
    startListeningRef.current = startListening;

    // ── Input handler (voice flow logic) ─────────────────────────────────────
    const handleInput = useCallback(async (text) => {
        if (processingRef.current) return;
        processingRef.current = true;

        // Stop continuous listening safely so TTS audio doesn't loop back into mic
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { }
        }

        if (stepRef.current === 1) {
            const cleanId = processIdText(text);
            if (!cleanId) {
                await speak("I didn't catch any letters or numbers. Please try again.");
                processingRef.current = false;
                startListening();
                return;
            }
            setStudentId(cleanId);
            await speak(`I heard: ${cleanId.split('').join(' ')}. Please say your 4-digit PIN.`);
            setStep(2);
            stepRef.current = 2;
            processingRef.current = false;
            setTimeout(startListening, 300);

        } else if (stepRef.current === 2) {
            const rawDigits = processPinText(text);

            if (rawDigits.length < 4) {
                await speak(`PIN must be 4 to 6 digits. I heard ${rawDigits.length} digit${rawDigits.length === 1 ? '' : 's'}. Please try again.`);
                processingRef.current = false;
                startListening();
                return;
            }
            if (rawDigits.length > 6) {
                await speak(`That sounded like more than 6 digits. Please say each digit individually.`);
                processingRef.current = false;
                startListening();
                return;
            }

            const pinText = rawDigits;
            setPin(pinText);
            setStep(3);
            stepRef.current = 3;
            processingRef.current = false;
            verifyLogin(studentId, pinText);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId, processIdText, processPinText, speak, startListening]);

    // Keep ref in sync so recognition.onresult always calls latest handleInput
    handleInputRef.current = handleInput;

    // ── Credential verification ───────────────────────────────────────────────
    const verifyLogin = useCallback(async (id, p) => {
        setStatus('Verifying credentials...');
        const res = await pinLogin(id, p);
        if (res.success) {
            await speak('Login successful. Redirecting.');
            navigate('/student');
            return;
        }

        const code = res.code;
        let message = 'Login failed. Please check your credentials and try again.';
        if (code === 'STUDENT_NOT_FOUND') {
            message = 'Student ID not found. Please check your Student ID and try again.';
        } else if (code === 'WRONG_PIN') {
            message = 'Incorrect PIN. Please try again.';
        } else if (code === 'ACCOUNT_LOCKED') {
            message = 'Your account is temporarily locked due to too many failed attempts. Please try again later.';
            if (res.locked_until) {
                message = `${message} Locked until ${res.locked_until}.`;
            }
        } else if (code === 'ACCOUNT_INACTIVE') {
            message = 'Your account is not active. Please contact your administrator.';
        } else if (code === 'RATE_LIMITED') {
            message = 'Too many login attempts. Please wait a moment before trying again.';
        }

        setStatus(message);
        await speak(message);
        setStudentId('');
        setPin('');
        setStep(0);
        stepRef.current = 0;
    }, [pinLogin, speak, navigate]);

    // ── Start voice flow ──────────────────────────────────────────────────────
    const { initUnlock } = useTTS();

    const startProcess = useCallback(async () => {
        initUnlock(); // Unlock global TTS on user click
        setStep(1);
        stepRef.current = 1;
        await speak('Please say your Student ID.');
        startListening();
    }, [speak, startListening, initUnlock]);

    const stopListening = useCallback(() => {
        window.speechSynthesis.cancel();
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* ignore */ }
        }
        setStatus('Voice stopped. Click Start to try again.');
        setIsListening(false);
        setStep(0);
        stepRef.current = 0;
    }, []);

    // ✅ Cleanup: abort recognition and cancel TTS on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { /* ignore */ }
            }
        };
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4"
            style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
            <Volume2
                size={64}
                className="mb-6 animate-pulse"
                style={{ color: 'var(--accent)' }}
            />
            <h1
                className="mb-8 text-center"
                style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}
            >
                Saarthi Voice Login
            </h1>

            <p className="text-xl mb-8 text-center max-w-md" style={{ color: 'var(--text)' }}>
                {status}
            </p>

            {step === 0 && (
                <button
                    onClick={startProcess}
                    className="text-xl shadow-lg transition transform hover:scale-105"
                    style={{
                        background: 'var(--accent)',
                        color: 'var(--bg)',
                        fontWeight: 800,
                        padding: '16px 32px',
                        borderRadius: '999px',
                        border: 'none',
                    }}
                >
                    Start Voice Login
                </button>
            )}

            {/* Only pulse when actually actively listening */}
            {(step === 1 || step === 2) && (
                <div className="flex flex-col items-center">
                    <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isListening ? 'animate-ping' : 'opacity-50'}`}
                        style={{ background: 'var(--accent)', transition: 'opacity 0.2s' }}
                    >
                        <Mic size={32} style={{ color: 'var(--bg)' }} />
                    </div>
                    <p style={{ color: 'var(--accent)', fontWeight: 600 }}>{isListening ? 'Listening...' : 'Thinking...'}</p>
                    <button
                        onClick={stopListening}
                        className="mt-4 text-sm underline"
                        style={{ color: 'var(--muted)' }}
                    >
                        Stop
                    </button>
                </div>
            )}

            {/* ✅ Debug display removed — was exposing studentId and PIN in plain text in the UI */}

            {/* Manual Fallback Toggle */}
            <div className="fixed bottom-8">
                <button
                    onClick={() => setIsManual(!isManual)}
                    className="underline text-sm"
                    style={{ color: 'var(--muted)' }}
                >
                    {isManual ? 'Switch to Voice Mode' : 'Having trouble? Type credentials'}
                </button>
            </div>

            {/* Manual Input Modal */}
            {isManual && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.8)' }}>
                    <div
                        className="max-w-sm w-full relative"
                        style={{
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            padding: 32,
                            borderRadius: 'var(--radius)',
                            border: '3px solid var(--border)',
                        }}
                    >
                        <button
                            onClick={() => setIsManual(false)}
                            className="absolute top-2 right-2"
                            style={{ color: 'var(--muted)' }}
                        >
                            ✕
                        </button>
                        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--accent)' }}>Manual Login</h2>
                        <input
                            type="text"
                            placeholder="Student ID"
                            className="w-full p-2 border rounded mb-3"
                            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                        />
                        <input
                            type="password"
                            placeholder="4-6 digit PIN"
                            maxLength="6"
                            className="w-full p-2 border rounded mb-4"
                            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        />
                        <button
                            onClick={() => verifyLogin(studentId, pin)}
                            className="w-full font-bold"
                            style={{
                                background: 'var(--accent)',
                                color: 'var(--bg)',
                                padding: '10px 16px',
                                borderRadius: '50px',
                                border: 'none',
                            }}
                        >
                            Login
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
