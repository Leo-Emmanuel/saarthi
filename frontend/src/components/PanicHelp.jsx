import { useEffect, useRef, useState } from 'react';
import usePanicHelpVoice from '../hooks/usePanicHelpVoice';

const PanicHelp = ({ examType, currentQuestion, onDismiss, speak, cancel }) => {
  const [countdown, setCountdown] = useState(30);

  const COMMANDS = {
    always: [
      '"help" — show this screen',
      '"read question" — hear question again',
      '"next question" — go to next',
      '"previous question" — go back',
      '"skip" — skip this question',
      '"submit paper" — submit exam',
      '"review answers" — review before submit',
      '"how much time" — hear time remaining',
    ],
    mcq: [
      '"option A / B / C / D" — select answer',
      '"read options" — hear all options',
    ],
    written: [
      '"create next step" — add a new step',
      '"read my answer" — hear your answer',
      '"clear step" — erase current step',
      '"undo" — undo last change',
    ],
  };

  // ── STT: listen for "continue" / "resume" via shared hook ───────────────────
  usePanicHelpVoice({ active: true, onResume: onDismiss });

  // ── Capture speak/cancel in refs so the speech effect stays stable ────────
  const speakRef = useRef(speak);
  const cancelRef = useRef(cancel);
  useEffect(() => { speakRef.current = speak; }, [speak]);
  useEffect(() => { cancelRef.current = cancel; }, [cancel]);

  // ── Auto-dismiss countdown ──────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onDismiss]);

  // ── ESC key to close ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [onDismiss]);

  // ── Speak help text on mount (once only) — use refs for stable callbacks ────
  useEffect(() => {
    const commandList = [
      ...COMMANDS.always,
      ...(currentQuestion?.type === 'mcq' ? COMMANDS.mcq : COMMANDS.written)
    ].join('. ');

    const text = `Help mode. Here are your voice commands. ${commandList}. Say continue or resume to go back to your exam.`;

    cancelRef.current?.();

    const timer = setTimeout(() => {
      speakRef.current?.(text, { rate: 0.9 });
    }, 100);

    return () => clearTimeout(timer);
    // Intentionally empty: speak once on mount. speakRef/cancelRef stay current via effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCommandsToShow = () => {
    const commands = [...COMMANDS.always];

    if (currentQuestion?.type === 'mcq') {
      commands.push(...COMMANDS.mcq);
    } else if (currentQuestion?.type === 'text' || currentQuestion?.type === 'voice') {
      commands.push(...COMMANDS.written);
    }

    return commands;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice Commands Help"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '2px solid var(--yellow)',
        borderRadius: '12px',
        padding: '32px 40px',
        maxWidth: '560px',
        width: '90%',
        fontFamily: "'Sora', sans-serif",
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🆘</div>
          <h2 style={{
            color: 'var(--yellow)',
            fontSize: '1.2rem',
            fontWeight: 800,
            margin: 0,
            marginBottom: '8px',
          }}>
            Voice Commands
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
            Say any of these commands:
          </p>
        </div>

        {/* Commands List */}
        <div style={{ marginBottom: '24px' }}>
          {getCommandsToShow().map((command, index) => (
            <div
              key={index}
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '8px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.78rem',
                color: 'var(--yellow)',
              }}
            >
              {command}
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div style={{ textAlign: 'center' }}>
          {/* Clickable "continue" button — voice AND tap */}
          <button
            type="button"
            onClick={onDismiss}
            className="exam-blink exam-focus"
            aria-label="Resume exam"
            style={{
              display: 'inline-block',
              background: 'var(--green-bg)',
              border: '2px solid var(--green)',
              borderRadius: '999px',
              padding: '10px 24px',
              fontSize: '0.9rem',
              color: 'var(--green)',
              fontWeight: 700,
              marginBottom: '12px',
              cursor: 'pointer',
              fontFamily: "'Sora', sans-serif",
            }}
          >
            🎙 Say &quot;continue&quot; — or tap here to resume
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="exam-focus"
            aria-label="Close help screen"
            style={{
              display: 'block',
              margin: '0 auto',
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--muted)',
              borderRadius: '6px',
              color: 'var(--muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontFamily: "'Sora', sans-serif",
            }}
          >
            Close (ESC)
          </button>
        </div>

        {/* Auto-dismiss countdown */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'var(--muted)',
          marginTop: '12px',
        }}>
          🎙 Listening for &quot;continue&quot;… Auto-dismiss in {countdown}s
        </div>
      </div>
    </div>
  );
};

export default PanicHelp;
