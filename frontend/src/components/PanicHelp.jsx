import { useEffect, useRef } from 'react';
import usePanicHelpVoice from '../hooks/usePanicHelpVoice';

// Commands keyed by exam type
const MCQ_COMMANDS = [
  { voice: 'A / B / C / D', action: 'Select answer' },
  { voice: 'Next', action: 'Next question' },
  { voice: 'Previous', action: 'Go back' },
  { voice: 'Repeat', action: 'Hear question again' },
  { voice: 'Submit', action: 'Submit exam' },
];

const WRITING_COMMANDS = [
  { voice: 'New step', action: 'Start a new line' },
  { voice: 'Undo', action: 'Remove last sentence' },
  { voice: 'Read answer', action: 'Hear your answer back' },
  { voice: 'Submit', action: 'Submit exam' },
];

function getCommandsForType(examType) {
  if (examType === 'mcq-only') return MCQ_COMMANDS;
  if (examType === 'writing-only') return WRITING_COMMANDS;
  // mixed — show both, deduplicating Submit
  return [
    ...MCQ_COMMANDS,
    ...WRITING_COMMANDS.filter(c => c.voice !== 'Submit'),
  ];
}

function buildTTSText(examType) {
  const opening =
    'Help menu open. Here are your available voice commands. Say continue or resume to return to your exam.';

  const mcqSet =
    'Say A, B, C, or D to select an answer. Say next to go to the next question. ' +
    'Say previous to go back. Say repeat to hear the question again. Say submit to finish the exam.';

  const writingSet =
    'Dictate your answer naturally. Say new step to start a new line. ' +
    'Say undo to remove the last sentence. Say read answer to hear your answer back. ' +
    'Say submit to finish.';

  if (examType === 'mcq-only') return `${opening} ${mcqSet}`;
  if (examType === 'writing-only') return `${opening} ${writingSet}`;
  return `${opening} ${mcqSet} ${writingSet}`;
}

const PanicHelp = ({ examType, currentQuestion, onResume, onDismiss, speak, cancel }) => {
  const dismiss = onResume || onDismiss;
  const closedRef = useRef(false);

  const panicVoice = usePanicHelpVoice({
    active: true,
    onResume: () => {
      if (closedRef.current) return;
      closedRef.current = true;
      dismiss?.();
    },
  });
  const stopHelpStt = panicVoice?.stop || (() => {});

  const handleResume = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    stopHelpStt();
    dismiss?.();
  };

  useEffect(() => {
    closedRef.current = false;
    return () => {
      closedRef.current = true;
      stopHelpStt();
    };
  }, [stopHelpStt]);

  // ── Focus management — move focus to Continue button on open ─────────────
  const continueBtnRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    const timer = setTimeout(() => continueBtnRef.current?.focus(), 50);
    return () => {
      clearTimeout(timer);
      try { returnFocusRef.current?.focus(); } catch (_) { /* ignore */ }
    };
  }, []);

  // ── Keyboard dismiss: Esc / Enter / Space ─────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        handleResume();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [dismiss, stopHelpStt]);

  // ── Speak help text on mount ─────────────────────────────────────────────
  useEffect(() => {
    // Wait for exam STT to fully stop before speaking
    const t = setTimeout(() => {
      window.speechSynthesis?.cancel();
      const text = buildTTSText(examType);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis?.speak(utterance);
    }, 800);
    return () => {
      clearTimeout(t);
      window.speechSynthesis?.cancel();
    };
  }, [examType]);

  const questionNumber = currentQuestion?.number ?? currentQuestion?.index ?? null;
  const commands = getCommandsForType(examType);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Help menu"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        aria-label="Help menu"
        style={{
          background: 'var(--surface, #1a1a2e)',
          border: '2px solid var(--yellow, #f5c518)',
          borderRadius: '14px',
          padding: '36px 44px',
          maxWidth: '600px',
          width: '92%',
          maxHeight: '90vh',
          overflowY: 'auto',
          fontFamily: "'Sora', sans-serif",
        }}
      >
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '3rem', lineHeight: 1 }}>🆘</div>
          <h2 style={{
            color: 'var(--yellow, #f5c518)',
            fontSize: '2rem',
            fontWeight: 800,
            margin: '8px 0 4px',
            letterSpacing: '0.05em',
          }}>
            HELP
          </h2>
          {questionNumber !== null && (
            <p style={{ color: 'var(--muted, #aaa)', fontSize: '1.1rem', margin: 0 }}>
              You are on question {questionNumber}
            </p>
          )}
        </div>

        {/* Command list */}
        <div
          role="list"
          aria-label="Available voice commands"
          style={{ marginBottom: '24px' }}
        >
          {commands.map(({ voice, action }) => (
            <div
              key={voice}
              role="listitem"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--surface2, #12122a)',
                border: '1px solid var(--border, #333)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '1.3rem' }} aria-hidden="true">🎤</span>
              <span style={{
                color: 'var(--yellow, #f5c518)',
                fontWeight: 700,
                fontSize: '1.1rem',
                minWidth: '160px',
              }}>
                &ldquo;{voice}&rdquo;
              </span>
              <span style={{
                color: 'var(--text, #eee)',
                fontSize: '1rem',
              }}>
                → {action}
              </span>
            </div>
          ))}
        </div>

        {/* Listening indicator */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              fontSize: '2rem',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          >
            🎙️
          </span>
          <p style={{
            color: 'var(--muted, #aaa)',
            fontSize: '1rem',
            margin: '6px 0 0',
          }}>
            Listening… say &ldquo;continue&rdquo; to resume
          </p>
        </div>

        {/* Continue button */}
        <div style={{ textAlign: 'center' }}>
          <button
            ref={continueBtnRef}
            type="button"
            onClick={handleResume}
            aria-label="Continue exam"
            style={{
              background: 'var(--yellow, #f5c518)',
              color: '#000',
              border: 'none',
              borderRadius: '10px',
              padding: '16px 40px',
              fontSize: '1.2rem',
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: "'Sora', sans-serif",
              letterSpacing: '0.03em',
            }}
          >
            Continue Exam
          </button>
        </div>
      </div>

      {/* Inline keyframe for pulsing mic — isolated to this overlay */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.18); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default PanicHelp;
