# Code Citations

## License: unknown
https://github.com/shaho/reserve-next/blob/9c54b57ba3e79bd94d2acb7990106bedd536af42/pages/signup.js

```
Here is the full file contents of [AnswerPlayback.jsx](e:\saarthi\frontend\src\components\AnswerPlayback.jsx):

```jsx
import { useState, useEffect, useCallback, useRef, memo } from 'react';

const AnswerPlayback = memo(function AnswerPlayback({ questions, answers, onEdit, onComplete, examType, speak, cancel }) {
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [reviewed, setReviewed] = useState([]);
  const hasStartedRef = useRef(false);
  const speakRef = useRef(speak);
  const cancelRef = useRef(cancel);
  const readCurrentAnswerRef = useRef(null);

  useEffect(() => { speakRef.current = speak; }, [speak]);
  useEffect(() => { cancelRef.current = cancel; }, [cancel]);
  useEffect(() => { readCurrentAnswerRef.current = readCurrentAnswer; }, [readCurrentAnswer]);

  const currentQuestion = questions[playbackIndex];
  const currentQuestionId = currentQuestion?._id?.toString();
  const rawAnswer = answers?.[currentQuestionId];
  const hasAnswer = rawAnswer !== undefined && rawAnswer !== null && String(rawAnswer).trim() !== '';
  const currentAnswer = hasAnswer ? rawAnswer : 'No answer given';

  const readCurrentAnswer = useCallback(() => {
    if (!currentQuestion) return;

    const ans = hasAnswer ? rawAnswer : 'No answer given';
    const text = `Question ${playbackIndex + 1}: ${currentQuestion.text}. Your answer: ${ans}. Say change to edit or next to keep.`;

    cancelRef.current?.();

    // Slight delay to ensure prior cancellation finishes to prevent interruption errors
    const timer = setTimeout(() => {
      speakRef.current?.(text, {
        rate: 0.9,
        onStart: () => setIsReading(true),
        onEnd: () => setIsReading(false),
        onError: (e) => {
          if (e?.error !== 'interrupted' && e?.error !== 'canceled') {
            console.error('AnswerPlayback TTS error:', e);
          }
        },
        onInterrupt: () => setIsReading(false),
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [currentQuestion, currentQuestionId, rawAnswer, hasAnswer, playbackIndex]);

  useEffect(() => {
    hasStartedRef.current = false;
  }, [playbackIndex]);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    // readCurrentAnswerRef.current is always the latest version of readCurrentAnswer
    // (kept in sync above). We intentionally depend only on playbackIndex here:
    // readCurrentAnswer changes reference when isReading state flips (setIsReading true/false),
    // but those flips must NOT re-trigger this effect — that was the cause of the 130+ render loop.
    // For a given playbackIndex, the underlying question/answer data is stable during playback.
    const cleanup = readCurrentAnswerRef.current?.();
    return cleanup;
  }, [playbackIndex]); // playbackIndex-only dep is intentional — see comment above

  const handleNext = useCallback(() => {
    const nextIndex = playbackIndex + 1;
    if (nextIndex >= questions.length) {
      onComplete?.();
    } else {
      setPlaybackIndex(nextIndex);
      setReviewed(prev => [...prev, currentQuestionId]);
    }
  }, [playbackIndex, questions.length, onComplete, currentQuestionId]);

  const handleChange = useCallback(() => {
    onEdit?.(playbackIndex);
  }, [onEdit, playbackIndex]);

  const handleRepeat = useCallback(() => {
    readCurrentAnswer();
  }, [readCurrentAnswer]);

  const handleSkipAll = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      // Don't intercept when focus
```


## License: unknown
https://github.com/shaho/reserve-next/blob/9c54b57ba3e79bd94d2acb7990106bedd536af42/pages/signup.js

```
Here is the full file contents of [AnswerPlayback.jsx](e:\saarthi\frontend\src\components\AnswerPlayback.jsx):

```jsx
import { useState, useEffect, useCallback, useRef, memo } from 'react';

const AnswerPlayback = memo(function AnswerPlayback({ questions, answers, onEdit, onComplete, examType, speak, cancel }) {
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [reviewed, setReviewed] = useState([]);
  const hasStartedRef = useRef(false);
  const speakRef = useRef(speak);
  const cancelRef = useRef(cancel);
  const readCurrentAnswerRef = useRef(null);

  useEffect(() => { speakRef.current = speak; }, [speak]);
  useEffect(() => { cancelRef.current = cancel; }, [cancel]);
  useEffect(() => { readCurrentAnswerRef.current = readCurrentAnswer; }, [readCurrentAnswer]);

  const currentQuestion = questions[playbackIndex];
  const currentQuestionId = currentQuestion?._id?.toString();
  const rawAnswer = answers?.[currentQuestionId];
  const hasAnswer = rawAnswer !== undefined && rawAnswer !== null && String(rawAnswer).trim() !== '';
  const currentAnswer = hasAnswer ? rawAnswer : 'No answer given';

  const readCurrentAnswer = useCallback(() => {
    if (!currentQuestion) return;

    const ans = hasAnswer ? rawAnswer : 'No answer given';
    const text = `Question ${playbackIndex + 1}: ${currentQuestion.text}. Your answer: ${ans}. Say change to edit or next to keep.`;

    cancelRef.current?.();

    // Slight delay to ensure prior cancellation finishes to prevent interruption errors
    const timer = setTimeout(() => {
      speakRef.current?.(text, {
        rate: 0.9,
        onStart: () => setIsReading(true),
        onEnd: () => setIsReading(false),
        onError: (e) => {
          if (e?.error !== 'interrupted' && e?.error !== 'canceled') {
            console.error('AnswerPlayback TTS error:', e);
          }
        },
        onInterrupt: () => setIsReading(false),
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [currentQuestion, currentQuestionId, rawAnswer, hasAnswer, playbackIndex]);

  useEffect(() => {
    hasStartedRef.current = false;
  }, [playbackIndex]);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    // readCurrentAnswerRef.current is always the latest version of readCurrentAnswer
    // (kept in sync above). We intentionally depend only on playbackIndex here:
    // readCurrentAnswer changes reference when isReading state flips (setIsReading true/false),
    // but those flips must NOT re-trigger this effect — that was the cause of the 130+ render loop.
    // For a given playbackIndex, the underlying question/answer data is stable during playback.
    const cleanup = readCurrentAnswerRef.current?.();
    return cleanup;
  }, [playbackIndex]); // playbackIndex-only dep is intentional — see comment above

  const handleNext = useCallback(() => {
    const nextIndex = playbackIndex + 1;
    if (nextIndex >= questions.length) {
      onComplete?.();
    } else {
      setPlaybackIndex(nextIndex);
      setReviewed(prev => [...prev, currentQuestionId]);
    }
  }, [playbackIndex, questions.length, onComplete, currentQuestionId]);

  const handleChange = useCallback(() => {
    onEdit?.(playbackIndex);
  }, [onEdit, playbackIndex]);

  const handleRepeat = useCallback(() => {
    readCurrentAnswer();
  }, [readCurrentAnswer]);

  const handleSkipAll = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      // Don't intercept when focus
```


## License: unknown
https://github.com/shaho/reserve-next/blob/9c54b57ba3e79bd94d2acb7990106bedd536af42/pages/signup.js

```
Here is the full file contents of [AnswerPlayback.jsx](e:\saarthi\frontend\src\components\AnswerPlayback.jsx):

```jsx
import { useState, useEffect, useCallback, useRef, memo } from 'react';

const AnswerPlayback = memo(function AnswerPlayback({ questions, answers, onEdit, onComplete, examType, speak, cancel }) {
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [reviewed, setReviewed] = useState([]);
  const hasStartedRef = useRef(false);
  const speakRef = useRef(speak);
  const cancelRef = useRef(cancel);
  const readCurrentAnswerRef = useRef(null);

  useEffect(() => { speakRef.current = speak; }, [speak]);
  useEffect(() => { cancelRef.current = cancel; }, [cancel]);
  useEffect(() => { readCurrentAnswerRef.current = readCurrentAnswer; }, [readCurrentAnswer]);

  const currentQuestion = questions[playbackIndex];
  const currentQuestionId = currentQuestion?._id?.toString();
  const rawAnswer = answers?.[currentQuestionId];
  const hasAnswer = rawAnswer !== undefined && rawAnswer !== null && String(rawAnswer).trim() !== '';
  const currentAnswer = hasAnswer ? rawAnswer : 'No answer given';

  const readCurrentAnswer = useCallback(() => {
    if (!currentQuestion) return;

    const ans = hasAnswer ? rawAnswer : 'No answer given';
    const text = `Question ${playbackIndex + 1}: ${currentQuestion.text}. Your answer: ${ans}. Say change to edit or next to keep.`;

    cancelRef.current?.();

    // Slight delay to ensure prior cancellation finishes to prevent interruption errors
    const timer = setTimeout(() => {
      speakRef.current?.(text, {
        rate: 0.9,
        onStart: () => setIsReading(true),
        onEnd: () => setIsReading(false),
        onError: (e) => {
          if (e?.error !== 'interrupted' && e?.error !== 'canceled') {
            console.error('AnswerPlayback TTS error:', e);
          }
        },
        onInterrupt: () => setIsReading(false),
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [currentQuestion, currentQuestionId, rawAnswer, hasAnswer, playbackIndex]);

  useEffect(() => {
    hasStartedRef.current = false;
  }, [playbackIndex]);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    // readCurrentAnswerRef.current is always the latest version of readCurrentAnswer
    // (kept in sync above). We intentionally depend only on playbackIndex here:
    // readCurrentAnswer changes reference when isReading state flips (setIsReading true/false),
    // but those flips must NOT re-trigger this effect — that was the cause of the 130+ render loop.
    // For a given playbackIndex, the underlying question/answer data is stable during playback.
    const cleanup = readCurrentAnswerRef.current?.();
    return cleanup;
  }, [playbackIndex]); // playbackIndex-only dep is intentional — see comment above

  const handleNext = useCallback(() => {
    const nextIndex = playbackIndex + 1;
    if (nextIndex >= questions.length) {
      onComplete?.();
    } else {
      setPlaybackIndex(nextIndex);
      setReviewed(prev => [...prev, currentQuestionId]);
    }
  }, [playbackIndex, questions.length, onComplete, currentQuestionId]);

  const handleChange = useCallback(() => {
    onEdit?.(playbackIndex);
  }, [onEdit, playbackIndex]);

  const handleRepeat = useCallback(() => {
    readCurrentAnswer();
  }, [readCurrentAnswer]);

  const handleSkipAll = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      // Don't intercept when focus
```


## License: unknown
https://github.com/shaho/reserve-next/blob/9c54b57ba3e79bd94d2acb7990106bedd536af42/pages/signup.js

```
Here is the full file contents of [AnswerPlayback.jsx](e:\saarthi\frontend\src\components\AnswerPlayback.jsx):

```jsx
import { useState, useEffect, useCallback, useRef, memo } from 'react';

const AnswerPlayback = memo(function AnswerPlayback({ questions, answers, onEdit, onComplete, examType, speak, cancel }) {
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [reviewed, setReviewed] = useState([]);
  const hasStartedRef = useRef(false);
  const speakRef = useRef(speak);
  const cancelRef = useRef(cancel);
  const readCurrentAnswerRef = useRef(null);

  useEffect(() => { speakRef.current = speak; }, [speak]);
  useEffect(() => { cancelRef.current = cancel; }, [cancel]);
  useEffect(() => { readCurrentAnswerRef.current = readCurrentAnswer; }, [readCurrentAnswer]);

  const currentQuestion = questions[playbackIndex];
  const currentQuestionId = currentQuestion?._id?.toString();
  const rawAnswer = answers?.[currentQuestionId];
  const hasAnswer = rawAnswer !== undefined && rawAnswer !== null && String(rawAnswer).trim() !== '';
  const currentAnswer = hasAnswer ? rawAnswer : 'No answer given';

  const readCurrentAnswer = useCallback(() => {
    if (!currentQuestion) return;

    const ans = hasAnswer ? rawAnswer : 'No answer given';
    const text = `Question ${playbackIndex + 1}: ${currentQuestion.text}. Your answer: ${ans}. Say change to edit or next to keep.`;

    cancelRef.current?.();

    // Slight delay to ensure prior cancellation finishes to prevent interruption errors
    const timer = setTimeout(() => {
      speakRef.current?.(text, {
        rate: 0.9,
        onStart: () => setIsReading(true),
        onEnd: () => setIsReading(false),
        onError: (e) => {
          if (e?.error !== 'interrupted' && e?.error !== 'canceled') {
            console.error('AnswerPlayback TTS error:', e);
          }
        },
        onInterrupt: () => setIsReading(false),
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [currentQuestion, currentQuestionId, rawAnswer, hasAnswer, playbackIndex]);

  useEffect(() => {
    hasStartedRef.current = false;
  }, [playbackIndex]);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    // readCurrentAnswerRef.current is always the latest version of readCurrentAnswer
    // (kept in sync above). We intentionally depend only on playbackIndex here:
    // readCurrentAnswer changes reference when isReading state flips (setIsReading true/false),
    // but those flips must NOT re-trigger this effect — that was the cause of the 130+ render loop.
    // For a given playbackIndex, the underlying question/answer data is stable during playback.
    const cleanup = readCurrentAnswerRef.current?.();
    return cleanup;
  }, [playbackIndex]); // playbackIndex-only dep is intentional — see comment above

  const handleNext = useCallback(() => {
    const nextIndex = playbackIndex + 1;
    if (nextIndex >= questions.length) {
      onComplete?.();
    } else {
      setPlaybackIndex(nextIndex);
      setReviewed(prev => [...prev, currentQuestionId]);
    }
  }, [playbackIndex, questions.length, onComplete, currentQuestionId]);

  const handleChange = useCallback(() => {
    onEdit?.(playbackIndex);
  }, [onEdit, playbackIndex]);

  const handleRepeat = useCallback(() => {
    readCurrentAnswer();
  }, [readCurrentAnswer]);

  const handleSkipAll = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      // Don't intercept when focus
```

