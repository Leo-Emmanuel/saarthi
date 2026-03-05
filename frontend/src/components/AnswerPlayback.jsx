import { useState, useEffect, useCallback, useRef } from 'react';

const AnswerPlayback = ({ questions, answers, onEdit, onComplete, examType, speak, cancel }) => {
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [reviewed, setReviewed] = useState([]);

  const currentQuestion = questions[playbackIndex];
  const currentQuestionId = currentQuestion?._id?.toString();
  const currentAnswer = answers[currentQuestionId] || "No answer given";

  const readCurrentAnswer = useCallback(() => {
    if (!currentQuestion) return;

    const ans = answers[currentQuestionId] || "No answer given";
    const text = `Question ${playbackIndex + 1}: ${currentQuestion.text}. Your answer: ${ans}. Say change to edit or next to keep.`;

    if (cancel) cancel();

    // Slight delay to ensure prior cancellation finishes to prevent interruption errors
    const timer = setTimeout(() => {
      if (speak) {
        speak(text, {
          rate: 0.9,
          onStart: () => setIsReading(true),
          onEnd: () => setIsReading(false),
          onError: (e) => console.error('AnswerPlayback TTS error:', e),
          onInterrupt: (e) => {
            console.log('AnswerPlayback TTS interrupted:', e);
            setIsReading(false);
          }
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentQuestion, currentQuestionId, answers, playbackIndex, speak, cancel]);

  useEffect(() => {
    const cleanup = readCurrentAnswer();
    return cleanup;
  }, [readCurrentAnswer]);

  const handleNext = () => {
    const nextIndex = playbackIndex + 1;
    if (nextIndex >= questions.length) {
      onComplete();
    } else {
      setPlaybackIndex(nextIndex);
      setReviewed([...reviewed, currentQuestionId]);
    }
  };

  const handleChange = () => {
    onEdit(playbackIndex);
  };

  const handleRepeat = () => {
    readCurrentAnswer();
  };

  const handleSkipAll = () => {
    onComplete();
  };

  // Auto-advance when reaching the end
  useEffect(() => {
    if (playbackIndex >= questions.length) {
      onComplete();
    }
  }, [playbackIndex, questions.length, onComplete]);

  if (!currentQuestion) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--bg)',
      zIndex: 9998,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Sora', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface)',
        padding: '20px',
        borderBottom: '2px solid var(--yellow)',
        textAlign: 'center'
      }}>
        <h1 style={{
          color: 'var(--yellow)',
          fontSize: '1.1rem',
          fontWeight: 800,
          margin: 0,
          marginBottom: '8px'
        }}>
          Answer Playback
        </h1>
        <div style={{
          color: 'var(--muted)',
          fontSize: '0.9rem'
        }}>
          Reviewing {playbackIndex + 1} of {questions.length} answers
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '4px',
        background: 'var(--border)',
        position: 'relative'
      }}>
        <div style={{
          height: '100%',
          background: 'var(--yellow)',
          width: `${((playbackIndex + 1) / questions.length) * 100}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'var(--surface)',
          border: '2px solid var(--yellow)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '600px',
          width: '100%'
        }}>
          {/* Question */}
          <div style={{
            marginBottom: '24px'
          }}>
            <div style={{
              color: 'var(--yellow)',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '12px'
            }}>
              Question {playbackIndex + 1}
            </div>
            <div style={{
              color: 'var(--text)',
              fontSize: '1rem',
              lineHeight: 1.5
            }}>
              {currentQuestion.text}
            </div>
          </div>

          {/* Answer */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--yellow)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              color: 'var(--muted)',
              fontSize: '0.8rem',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Your Answer
            </div>
            <div style={{
              color: 'var(--yellow)',
              fontSize: '0.95rem',
              fontStyle: 'italic',
              lineHeight: 1.4
            }}>
              {currentAnswer}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <button
              onClick={handleChange}
              className="exam-focus"
              style={{
                padding: '12px 24px',
                border: '2px solid var(--red)',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--red)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Sora', sans-serif"
              }}
            >
              ← Change Answer
            </button>

            <button
              onClick={handleNext}
              className="exam-focus"
              style={{
                padding: '12px 24px',
                border: '2px solid var(--yellow)',
                borderRadius: '8px',
                background: 'var(--yellow)',
                color: 'var(--black)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Sora', sans-serif"
              }}
            >
              Keep & Next →
            </button>
          </div>

          {/* Voice Commands */}
          <div style={{
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--muted)',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            🎤 Say 'change' to edit, 'next' to keep, 'repeat' to hear again, or 'skip all' to submit
          </div>
        </div>
      </div>

      {/* Reading Indicator */}
      {isReading && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--yellow-bg2)',
          border: '1px solid var(--yellow)',
          borderRadius: '6px',
          fontSize: '0.8rem',
          color: 'var(--yellow)'
        }}>
          🔊 Reading...
        </div>
      )}
    </div>
  );
};

export default AnswerPlayback;
