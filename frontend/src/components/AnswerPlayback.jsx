import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

const AnswerPlayback = memo(forwardRef(function AnswerPlayback({
  show = true,
  questions = [],
  answers = {},
  onEdit,
  onComplete,
  onClose,
  onUpdateAnswer,
  onSubmit,
  examType,
  speak,
  cancel,
}, ref) {
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [changingAnswer, setChangingAnswer] = useState(false);

  const reviewRecRef = useRef(null);
  const endReviewRecRef = useRef(null);
  const reviewActiveRef = useRef(false);
  const reviewAbortedRef = useRef(false);
  const endReviewAbortedRef = useRef(false);
  const changingAnswerRef = useRef(false);
  const handleNextRef = useRef(null);
  const handlePrevRef = useRef(null);
  const handleChangeRef = useRef(null);
  const handleRepeatRef = useRef(null);
  const handleSkipAllRef = useRef(null);
  const startReviewSTTRef = useRef(null);
  const isReadingRef = useRef(false);

  const currentQuestion = questions[playbackIndex];
  const currentQuestionId = currentQuestion?._id != null ? String(currentQuestion._id) : '';
  const currentRawAnswer = answers?.[currentQuestionId] ?? '';
  const currentAnswer = String(currentRawAnswer || '').trim() || 'No answer given';
  const total = questions.length;
  const current = playbackIndex + 1;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  const startEndOfReviewSTT = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !reviewActiveRef.current) return;

    if (endReviewRecRef.current) {
      endReviewAbortedRef.current = true;
      try { endReviewRecRef.current.abort(); } catch { /* noop */ }
      endReviewRecRef.current = null;
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    endReviewRecRef.current = rec;
    endReviewAbortedRef.current = false;

    rec.onresult = (event) => {
      const t = event.results[0][0].transcript.toLowerCase().trim();
      console.log('[Review End STT] heard:', t);

      if (t.includes('submit')) {
        endReviewAbortedRef.current = true;
        try { rec.abort(); } catch { /* noop */ }
        onSubmit?.() ?? onComplete?.();
        // ExamView handles farewell speech and navigation.
      } else if (t.includes('previous') || t.includes('back')) {
        endReviewAbortedRef.current = true;
        try { rec.abort(); } catch { /* noop */ }
        setPlaybackIndex(Math.max(questions.length - 1, 0));
      } else if (speak) {
        speak('Say submit to submit, or previous to go back.', {
          rate: 0.9,
          onEnd: () => startEndOfReviewSTT(),
        });
      } else {
        setTimeout(startEndOfReviewSTT, 500);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      if (!reviewActiveRef.current) return;
      setTimeout(startEndOfReviewSTT, 1000);
    };

    rec.onend = () => {
      if (endReviewAbortedRef.current) return;
      if (!reviewActiveRef.current) return;
      setTimeout(startEndOfReviewSTT, 300);
    };

    endReviewAbortedRef.current = false;
    try {
      rec.start();
      console.log('[Review End STT] started');
    } catch (e) {
      console.log('[Review End STT] start error:', e.message);
      if (reviewActiveRef.current) setTimeout(startEndOfReviewSTT, 1000);
    }
  }, [onComplete, onSubmit, questions.length, speak]);

  const handleNext = useCallback(() => {
    if (changingAnswerRef.current) return;
    if (playbackIndex >= questions.length - 1) {
      if (reviewRecRef.current) {
        reviewAbortedRef.current = true;
        try { reviewRecRef.current.abort(); } catch { /* noop */ }
        reviewRecRef.current = null;
      }
      if (speak && onSubmit) {
        speak(
          'You have reviewed all questions. ' +
          'Say submit to submit your exam, ' +
          'or say previous to go back and review again.',
          {
            rate: 0.9,
            onEnd: () => {
              startEndOfReviewSTT();
            },
          }
        );
      } else {
        onComplete?.();
      }
      return;
    }
    setPlaybackIndex(playbackIndex + 1);
  }, [onComplete, onSubmit, playbackIndex, questions.length, speak, startEndOfReviewSTT]);

  const handlePrev = useCallback(() => {
    if (changingAnswerRef.current) return;
    if (playbackIndex > 0) {
      setPlaybackIndex(playbackIndex - 1);
    } else {
      speak?.('This is the first question.');
    }
  }, [playbackIndex, speak]);

  const startReviewSTT = useCallback(() => {
    if (!reviewActiveRef.current) return;
    if (changingAnswerRef.current) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (reviewRecRef.current) {
      reviewAbortedRef.current = true;
      try { reviewRecRef.current.abort(); } catch { /* noop */ }
      reviewRecRef.current = null;
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    reviewRecRef.current = rec;
    reviewAbortedRef.current = false;
    let gotResult = false;

    rec.onresult = (event) => {
      gotResult = true;
      const t = event.results[0][0].transcript.toLowerCase().trim();

      console.log('[Review STT] heard:', t);

      if (t.includes('skip')) handleSkipAllRef.current?.();
      else if (t.includes('next') || t.includes('keep')) handleNextRef.current?.();
      else if (t.includes('previous') || t.includes('back')) handlePrevRef.current?.();
      else if (t.includes('change')) handleChangeRef.current?.();
      else if (t.includes('repeat')) handleRepeatRef.current?.();
      else {
        setTimeout(startReviewSTT, 300);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      if (!reviewActiveRef.current) return;
      console.log('[Review STT] error:', e.error, '— retrying');
      setTimeout(startReviewSTT, 800);
    };

    rec.onend = () => {
      // Only restart if no result was received and not intentionally aborted.
      if (reviewAbortedRef.current) return;
      if (!reviewActiveRef.current) return;
      if (changingAnswerRef.current) return;
      if (gotResult) return;
      setTimeout(startReviewSTT, 300);
    };

    try {
      rec.start();
      console.log('[Review STT] started');
    } catch (e) {
      console.log('[Review STT] start error:', e.message);
      if (reviewActiveRef.current) setTimeout(startReviewSTT, 1000);
    }
  }, []);

  const readCurrentAnswer = useCallback(() => {
    if (!currentQuestion || !speak || changingAnswerRef.current) return undefined;

    const ans = answers?.[currentQuestionId] || 'No answer given';
    const questionText =
      `Question ${playbackIndex + 1} of ${questions.length}. ` +
      `${currentQuestion.text}. ` +
      `Your answer is: ${ans}.`;

    const commandText =
      'Say next to keep, change to edit, ' +
      'previous to go back, skip all to submit, ' +
      'or repeat to hear again.';

    // Only cancel if we are already reading (restart case), not on first mount.
    if (isReadingRef.current && cancel) cancel();

    // Stop STT before TTS speaks.
    if (reviewRecRef.current) {
      reviewAbortedRef.current = true;
      try { reviewRecRef.current.abort(); } catch { /* noop */ }
      reviewRecRef.current = null;
    }

    setIsReading(true);
    let commandTimer = null;
    let startSttTimer = null;

    const timer = setTimeout(() => {
      speak(questionText, {
        rate: 0.9,
        onEnd: () => {
          commandTimer = setTimeout(() => {
            speak(commandText, {
              rate: 0.85,
              onEnd: () => {
                setIsReading(false);
                startSttTimer = setTimeout(() => {
                  startReviewSTTRef.current?.();
                }, 300);
              },
              onError: () => {
                setIsReading(false);
                startSttTimer = setTimeout(() => {
                  startReviewSTTRef.current?.();
                }, 300);
              },
            });
          }, 1500);
        },
        onError: () => {
          setIsReading(false);
          startSttTimer = setTimeout(() => {
            startReviewSTTRef.current?.();
          }, 300);
        },
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      if (commandTimer) clearTimeout(commandTimer);
      if (startSttTimer) clearTimeout(startSttTimer);
    };
  }, [
    currentQuestion,
    currentQuestionId,
    answers,
    playbackIndex,
    questions.length,
    speak,
    cancel,
    startReviewSTT,
    // isReading intentionally omitted — accessed via ref
    // to prevent infinite re-render loop
  ]);

  const startChangeSTT = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log('[Review Change STT] heard:', transcript);

      let newAnswer = transcript;
      if (/\boption a\b|^a$/.test(transcript)) newAnswer = 'A';
      else if (/\boption b\b|^b$/.test(transcript)) newAnswer = 'B';
      else if (/\boption c\b|^c$/.test(transcript)) newAnswer = 'C';
      else if (/\boption d\b|^d$/.test(transcript)) newAnswer = 'D';

      const qId = currentQuestion?._id?.toString?.() || (currentQuestion?._id != null ? String(currentQuestion._id) : '');
      if (qId && onUpdateAnswer) {
        onUpdateAnswer(qId, newAnswer);
      }

      setChangingAnswer(false);

      speak?.(`Answer updated to: ${newAnswer}. Continuing review.`, {
        rate: 0.9,
        onEnd: () => {
          startReviewSTT();
        },
      });
    };

    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      setChangingAnswer(false);
      speak?.('Could not hear your answer. Please try again.', {
        onEnd: () => startReviewSTT(),
      });
    };

    try {
      rec.start();
    } catch (e) {
      console.error('[Review Change STT] failed to start:', e);
    }
  }, [currentQuestion, onUpdateAnswer, speak, startReviewSTT]);

  const handleChange = useCallback(() => {
    // Backward compatibility for non-review contexts that still depend on onEdit.
    if (!onUpdateAnswer && onEdit) {
      onEdit(playbackIndex);
      return;
    }
    if (!currentQuestion || !speak) return;
    setChangingAnswer(true);

    if (reviewRecRef.current) {
      reviewAbortedRef.current = true;
      try { reviewRecRef.current.abort(); } catch { /* noop */ }
    }

    const q = currentQuestion;
    let changeText = `Changing answer for Question ${playbackIndex + 1}. ${q.text}.`;
    if (q.type === 'mcq' && Array.isArray(q.options) && q.options.length > 0) {
      const letters = ['A', 'B', 'C', 'D'];
      const opts = q.options
        .filter(Boolean)
        .slice(0, 4)
        .map((o, i) => `Option ${letters[i]}: ${o}`)
        .join('. ');
      changeText += ` ${opts}.`;
      changeText += ' Please say Option A, Option B, Option C, or Option D.';
    } else {
      changeText += ' Please say your new answer now.';
    }

    if (cancel) cancel();
    speak(changeText, {
      rate: 0.9,
      onEnd: () => {
        startChangeSTT();
      },
    });
  }, [cancel, currentQuestion, onEdit, onUpdateAnswer, playbackIndex, speak, startChangeSTT]);

  const handleRepeat = useCallback(() => {
    if (changingAnswerRef.current) return;
    readCurrentAnswer();
  }, [readCurrentAnswer]);

  const handleSkipAll = useCallback(() => {
    if (changingAnswerRef.current) return;
    if (reviewRecRef.current) {
      reviewAbortedRef.current = true;
      try { reviewRecRef.current.abort(); } catch { /* noop */ }
      reviewRecRef.current = null;
    }
    if (speak && onSubmit) {
      speak('Skipping review. Say submit to submit your exam.', {
        rate: 0.9,
        onEnd: () => startEndOfReviewSTT(),
      });
    } else {
      onComplete?.();
    }
  }, [onComplete, speak, startEndOfReviewSTT]);

  useEffect(() => {
    changingAnswerRef.current = changingAnswer;
  }, [changingAnswer]);

  useEffect(() => {
    isReadingRef.current = isReading;
  }, [isReading]);

  useEffect(() => {
    const cleanup = readCurrentAnswer();
    return cleanup;
  }, [currentQuestionId, playbackIndex]);

  useImperativeHandle(ref, () => ({
    startReview: () => {
      console.log('[Review] startReview() called');
      setPlaybackIndex(0);
    },
  }), []);

  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);
  useEffect(() => { handlePrevRef.current = handlePrev; }, [handlePrev]);
  useEffect(() => { handleChangeRef.current = handleChange; }, [handleChange]);
  useEffect(() => { handleRepeatRef.current = handleRepeat; }, [handleRepeat]);
  useEffect(() => { handleSkipAllRef.current = handleSkipAll; }, [handleSkipAll]);

  useEffect(() => {
    startReviewSTTRef.current = startReviewSTT;
  }, [startReviewSTT]);

  useEffect(() => {
    reviewActiveRef.current = true;
    return () => {
      reviewActiveRef.current = false;
      reviewAbortedRef.current = true;
      endReviewAbortedRef.current = true;
      if (reviewRecRef.current) {
        reviewAbortedRef.current = true;
        try { reviewRecRef.current.abort(); } catch { /* noop */ }
        reviewRecRef.current = null;
      }
      if (endReviewRecRef.current) {
        try { endReviewRecRef.current.abort(); } catch { /* noop */ }
        endReviewRecRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show || !currentQuestion) return null;

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
      fontFamily: "'Sora', sans-serif",
    }}>
      <div style={{
        background: 'var(--surface)',
        padding: '20px',
        borderBottom: '2px solid var(--yellow)',
        textAlign: 'center',
      }}>
        <h1 style={{
          color: 'var(--yellow)',
          fontSize: '1.1rem',
          fontWeight: 800,
          margin: 0,
          marginBottom: '10px',
        }}>
          Answer Playback
        </h1>
        <div style={{
          color: 'var(--muted)',
          fontSize: '0.9rem',
        }}>
          Reviewing answer {current} of {total}
        </div>
      </div>

      <div style={{
        height: '4px',
        background: 'var(--border)',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          background: 'var(--yellow)',
          width: `${pct}%`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          background: 'var(--surface)',
          border: '2px solid var(--yellow)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '700px',
          width: '100%',
        }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              color: 'var(--yellow)',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '12px',
            }}>
              Question {current}
            </div>
            <div style={{
              color: 'var(--text)',
              fontSize: '1rem',
              lineHeight: 1.5,
            }}>
              {currentQuestion.text}
            </div>
          </div>

          {!currentRawAnswer && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--warn-bg, rgba(255,180,0,0.1))',
              border: '1px solid var(--warn, #f5a623)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              color: 'var(--warn, #f5a623)',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}>
              ⚠️ No answer recorded
            </div>
          )}

          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--yellow)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <div style={{
              color: 'var(--muted)',
              fontSize: '0.8rem',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Your Answer
            </div>
            <div style={{
              color: 'var(--yellow)',
              fontSize: '0.95rem',
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}>
              {currentAnswer}
            </div>
          </div>

          {changingAnswer && (
            <div style={{
              textAlign: 'center',
              padding: '16px',
              color: 'var(--yellow)',
              fontSize: '1rem',
              fontWeight: 600,
              background: 'var(--surface)',
              border: '2px solid var(--yellow)',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              🎤 Listening for your new answer...
            </div>
          )}

          {!changingAnswer && (
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}>
            <button
              onClick={handleChange}
              className="exam-focus"
              aria-label="Change answer"
              style={{
                padding: '12px 24px',
                border: '2px solid var(--red, #e74c3c)',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--red, #e74c3c)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Sora', sans-serif",
              }}
            >
              ← Change Answer
            </button>

            <button
              onClick={handlePrev}
              className="exam-focus"
              aria-label="Go to previous answer"
              style={{
                padding: '12px 24px',
                border: '2px solid var(--yellow)',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--yellow)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Sora', sans-serif",
              }}
            >
              ← Previous
            </button>

            <button
              onClick={handleNext}
              className="exam-focus"
              aria-label="Keep and go to next answer"
              style={{
                padding: '12px 24px',
                border: '2px solid var(--yellow)',
                borderRadius: '8px',
                background: 'var(--yellow)',
                color: 'var(--black, #000)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Sora', sans-serif",
              }}
            >
              Keep &amp; Next →
            </button>

            <button
              onClick={handleSkipAll}
              className="exam-focus"
              aria-label="Skip all and submit"
              style={{
                padding: '12px 24px',
                border: '2px solid var(--muted, #888)',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--muted, #888)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Sora', sans-serif",
              }}
            >
              Skip All → Submit
            </button>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <button
              onClick={() => onSubmit?.()}
              className="exam-focus"
              aria-label="Submit exam"
              style={{
                padding: '14px 40px',
                border: 'none',
                borderRadius: '8px',
                background: 'var(--success, #27ae60)',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Sora', sans-serif",
                boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--success-dark, #229954)';
                e.target.style.boxShadow = '0 6px 16px rgba(39, 174, 96, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--success, #27ae60)';
                e.target.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.3)';
              }}
            >
              ✓ Submit Exam
            </button>
          </div>

          <div style={{
            textAlign: 'center',
            fontSize: '0.82rem',
            color: 'var(--muted)',
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.6,
          }}>
            <div>🎤 Say 'change', 'next', 'previous', 'repeat', or 'skip all'</div>
            <div>⌨️ ← / P · → / N · R · Esc</div>
          </div>
        </div>
      </div>

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
          color: 'var(--yellow)',
        }}>
          🔊 Reading...
        </div>
      )}
    </div>
  );
}));

export default AnswerPlayback;
