import { VOICE_INTENT, parseVoiceCommand } from './voiceCommands';

/**
 * Dispatches voice intents to the appropriate exam callback.
 * Extracted from useExamVoiceController for testability.
 *
 * Callbacks available on callbacksRef.current:
 *   onHelp, onTimeRemaining, onSelectMCQ, onNext, onPrev, onSubmit,
 *   onClear, onRepeat, onDictate, onReview, onReadOptions, onResume,
 *   onReadAnswer, onCreateStep, onClearStep, onUndo, cancel, speak
 */
export function handleVoiceIntent({
    transcriptRaw,
    localGrammarMode,
    startedQuestionType,
    startedQuestionId,
    q,
    indexRef,
    total,
    secondsLeftRef,
    callbacksRef,
    stopListening,
}) {
    const cbs = callbacksRef.current;

    const { intent, payload } = parseVoiceCommand(transcriptRaw, localGrammarMode, startedQuestionType);

    switch (intent) {
        case VOICE_INTENT.HELP:
            cbs.cancel?.();
            stopListening();
            cbs.onHelp?.();
            break;

        case VOICE_INTENT.TIME_REMAINING:
            if (cbs.onTimeRemaining) cbs.onTimeRemaining(secondsLeftRef.current);
            break;

        case VOICE_INTENT.READ_OPTIONS:
            cbs.onReadOptions?.(q);
            break;

        case VOICE_INTENT.REVIEW:
            stopListening();
            cbs.onReview?.();
            break;

        case VOICE_INTENT.RESUME:
            cbs.onResume?.();
            break;

        case VOICE_INTENT.MCQ_SELECT:
            stopListening();
            cbs.onSelectMCQ?.(startedQuestionId, payload?.letter, { grammarMode: localGrammarMode, question: q });
            break;

        case VOICE_INTENT.NEXT:
            stopListening();
            cbs.onNext?.();
            break;

        case VOICE_INTENT.PREVIOUS:
            stopListening();
            cbs.onPrev?.();
            break;

        case VOICE_INTENT.SUBMIT:
            stopListening();
            cbs.onSubmit?.();
            break;

        case VOICE_INTENT.CLEAR:
            cbs.onClear?.(startedQuestionId);
            break;

        case VOICE_INTENT.REPEAT:
            cbs.onRepeat?.(q, indexRef.current, total);
            break;

        case VOICE_INTENT.DICTATE: {
            const text = payload?.text ?? '';
            if (!text) break;
            cbs.onDictate?.(startedQuestionId, text);
            break;
        }

        // ── Written/voice question commands ─────────────────────────────────
        case VOICE_INTENT.READ_ANSWER:
            // Read back the student's current answer via TTS
            cbs.onReadAnswer?.(startedQuestionId, q);
            break;

        case VOICE_INTENT.CREATE_STEP:
            // Append a line break / new step separator in the answer
            cbs.onCreateStep?.(startedQuestionId);
            break;

        case VOICE_INTENT.CLEAR_STEP:
            // Erase only the current step (last paragraph/line)
            cbs.onClearStep?.(startedQuestionId);
            break;

        case VOICE_INTENT.UNDO:
            // Undo the last dictated segment
            cbs.onUndo?.(startedQuestionId);
            break;

        default:
            break;
    }
}
