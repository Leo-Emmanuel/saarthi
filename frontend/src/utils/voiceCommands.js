import { normalizeMcqLetter } from './mcqUtils';
import { mathSpeechToNotation } from './mathSpeechToNotation';

/**
 * Intent types returned by parseVoiceCommand.
 */
export const VOICE_INTENT = {
    MCQ_SELECT: 'MCQ_SELECT',
    NEXT: 'NEXT',
    SKIP: 'SKIP',
    PREVIOUS: 'PREVIOUS',
    SUBMIT: 'SUBMIT',
    CLEAR: 'CLEAR',
    REPEAT: 'REPEAT',
    DICTATE: 'DICTATE',
    UNKNOWN: 'UNKNOWN',
    HELP: 'HELP',
    READ_OPTIONS: 'READ_OPTIONS',
    REVIEW: 'REVIEW',
    TIME_REMAINING: 'TIME_REMAINING',
    RESUME: 'RESUME',
    // Written/voice question commands
    READ_ANSWER: 'READ_ANSWER',
    CREATE_STEP: 'CREATE_STEP',
    CLEAR_STEP: 'CLEAR_STEP',
    UNDO: 'UNDO',
    REVIEW_SUBMIT_ANYWAY: 'REVIEW_SUBMIT_ANYWAY',
    REVIEW_GO_BACK: 'REVIEW_GO_BACK',
    REVIEW_READ_ANSWER: 'REVIEW_READ_ANSWER',
    REVIEW_NEXT: 'REVIEW_NEXT',
    REVIEW_PREVIOUS: 'REVIEW_PREVIOUS',
};

/**
 * Checks if spoken text is a navigation/control command (without needing a prefix).
 * Returns the matching VOICE_INTENT string or null.
 * Longer/more-specific checks must come before shorter ones.
 *
 * @param {string} cmd  Lowercased text to match
 * @returns {string|null}
 */
function matchNavCommand(cmd) {
    const text = String(cmd || '').trim();

    // Navigation — next
    if (
        text === 'next question' ||
        text === 'next' ||
        text === 'go next' ||
        text === 'go to next' ||
        text === 'next question please'
    ) return VOICE_INTENT.NEXT;

    // Navigation — previous
    if (
        text === 'previous question' ||
        text === 'previous' ||
        text === 'go back' ||
        text === 'back' ||
        text === 'go to previous' ||
        text === 'previous question please'
    ) return VOICE_INTENT.PREVIOUS;

    // Skip
    if (
        text === 'skip this question' ||
        text === 'skip question' ||
        text === 'skip'
    ) return VOICE_INTENT.SKIP;

    // Submit
    if (
        text.includes('submit paper') ||
        text.includes('submit exam') ||
        text === 'submit' ||
        text === 'submit now'
    ) return VOICE_INTENT.SUBMIT;

    // Repeat / read question
    if (
        text === 'repeat' ||
        text === 'read question' ||
        text === 'read the question' ||
        text === 'repeat question' ||
        text === 'repeat please'
    ) return VOICE_INTENT.REPEAT;

    // Clear (written answer)
    // Written-question specific commands
    if (
        text === 'clear step' ||
        text === 'delete step' ||
        text === 'remove step'
    ) return VOICE_INTENT.CLEAR_STEP;

    // Clear (written answer)
    if (
        text === 'clear' ||
        text === 'erase' ||
        text === 'clear answer' ||
        text === 'clear all'
    ) return VOICE_INTENT.CLEAR;

    if (
        text === 'create next step' ||
        text === 'new step' ||
        text === 'add a step' ||
        text === 'next step'
    ) return VOICE_INTENT.CREATE_STEP;

    if (
        text === 'read my answer' ||
        text === 'read answer' ||
        text === 'hear my answer'
    ) return VOICE_INTENT.READ_ANSWER;

    if (
        text === 'undo' ||
        text === 'undo last' ||
        text === 'undo last change'
    ) return VOICE_INTENT.UNDO;

    return null;
}

/**
 * Check if a spoken phrase is PURELY a navigation command (not ambiguous with dictation).
 * Only matches exact phrases we are confident about being commands, not math content.
 *
 * @param {string} spoken  Lowercased
 * @returns {string|null}
 */
function matchUnambiguousCommand(spoken) {
    // These are clearly commands — no overlap with math/text dictation
    const exact = matchNavCommand(spoken);
    if (exact) return exact;

    // Prefix-based checks
    if (spoken.startsWith('command ')) {
        const cmd = spoken.replace(/^command\s*/, '').trim();
        return matchNavCommand(cmd);
    }

    return null;
}

function parseGlobalIntent(spoken) {
    if (spoken.includes('help') || spoken.includes('what can i say') ||
        spoken.includes("i'm lost") || spoken.includes('im lost')) {
        return { intent: VOICE_INTENT.HELP };
    }
    if (spoken.includes('how much time') || spoken.includes('time remaining') ||
        spoken.includes('time left')) {
        return { intent: VOICE_INTENT.TIME_REMAINING };
    }
    if (spoken.includes('read question') || spoken.includes('repeat question') ||
        spoken.includes('read the question') || spoken.includes('hear the question')) {
        return { intent: VOICE_INTENT.REPEAT };
    }
    if (spoken.includes('review answers') || spoken.includes('review my answers') ||
        spoken.includes('show review') || spoken.includes('check answers') ||
        spoken.includes('check my answers')) {
        return { intent: VOICE_INTENT.REVIEW };
    }
    return null;
}

function parseResumeIntent(spoken) {
    if (
        spoken === 'continue' ||
        spoken === 'resume' ||
        spoken === 'continue please' ||
        spoken === 'resume please' ||
        spoken === 'continue exam' ||
        spoken === 'resume exam' ||
        spoken.includes('go back to exam') ||
        spoken.includes('close help') ||
        spoken.includes('resume the exam') ||
        spoken.includes('continue the exam')
    ) {
        return { intent: VOICE_INTENT.RESUME };
    }
    return null;
}

function parseCommandPrefixMode(spoken, transcript, questionType) {
    const navIntent = matchUnambiguousCommand(spoken);
    if (navIntent) return { intent: navIntent };

    if (questionType === 'mcq') {
        const isExplicit =
            /^[abcd]$/i.test(spoken) ||
            /^(option|answer)\s+[abcd]$/i.test(spoken);
        const letter = normalizeMcqLetter(spoken);
        if (letter && isExplicit) return { intent: VOICE_INTENT.MCQ_SELECT, payload: { letter } };
        return { intent: VOICE_INTENT.UNKNOWN };
    }

    return { intent: VOICE_INTENT.DICTATE, payload: { text: mathSpeechToNotation(transcript.trim()).display } };
}

function withMcqConfidenceGate({ spoken, parsed, confidence }) {
    if (parsed.intent !== VOICE_INTENT.MCQ_SELECT) return parsed;
    // Single-letter MCQ selections are the noisiest; enforce stricter confidence.
    if (/^[abcd]$/i.test(spoken) && confidence < 0.85) {
        return { intent: VOICE_INTENT.UNKNOWN };
    }
    return parsed;
}

/**
 * Parse a raw voice transcript into a structured intent based on the current
 * grammar mode.
 *
 * Grammar modes:
 *  - 'strict'         MCQ-only exam. Only letter answers or navigation commands.
 *  - 'command-prefix' Mixed exam. Navigation requires either "command X" or exact phrase.
 *                     MCQ questions: only explicit letter answers.
 *                     Written questions: free dictation.
 *  - 'dictation'      Writing-only exam. Navigation via "command X" OR exact phrase.
 *                     Everything else is dictated with math conversion.
 *
 * @param {string} transcript   Raw transcript from SpeechRecognition
 * @param {'strict'|'dictation'|'command-prefix'} grammarMode
 * @param {'mcq'|'text'|string} questionType  Current question's type
 * @param {number} [recognitionConfidence=1] Confidence score from SpeechRecognition final result.
 * @returns {{ intent: string, payload?: object }}
 */
export function parseVoiceCommand(transcript, grammarMode, questionType, recognitionConfidence = 1) {
    const spoken = String(transcript ?? '').trim().toLowerCase();
    if (!spoken) return { intent: VOICE_INTENT.UNKNOWN };

    // ── Global intercepts — always recognised in any mode ───────────────────
    const globalIntent = parseGlobalIntent(spoken);
    if (globalIntent) return globalIntent;

    if ((grammarMode !== 'dictation') && (
        spoken.includes('read options') || spoken.includes('read the options') ||
        spoken.includes('read choices') || spoken.includes('what are the options') ||
        spoken.includes('hear the options')
    )) {
        return { intent: VOICE_INTENT.READ_OPTIONS };
    }
    // RESUME: only match when the entire spoken phrase is clearly a resume command.
    // Avoid broad 'startsWith' to prevent false positives during free dictation
    // (e.g. "continuing from where I left off" must NOT trigger RESUME).
    const resumeIntent = parseResumeIntent(spoken);
    if (resumeIntent) return resumeIntent;

    // ── Strict mode (MCQ-only exam) ─────────────────────────────────────────
    if (grammarMode === 'strict') {
        const letter = normalizeMcqLetter(spoken);
        if (letter) {
            return withMcqConfidenceGate({
                spoken,
                parsed: { intent: VOICE_INTENT.MCQ_SELECT, payload: { letter } },
                confidence: recognitionConfidence,
            });
        }

        const navIntent = matchUnambiguousCommand(spoken);
        if (navIntent) return { intent: navIntent };

        return { intent: VOICE_INTENT.UNKNOWN };
    }

    // ── Command-prefix mode (mixed exam) ────────────────────────────────────
    if (grammarMode === 'command-prefix') {
        return withMcqConfidenceGate({
            spoken,
            parsed: parseCommandPrefixMode(spoken, transcript, questionType),
            confidence: recognitionConfidence,
        });
    }

    // ── Dictation mode (writing-only exam) ──────────────────────────────────
    // Try nav/control commands first (with or without "command" prefix)
    const navIntent = matchUnambiguousCommand(spoken);
    if (navIntent) return { intent: navIntent };

    // Everything else is free dictation with math conversion
    return { intent: VOICE_INTENT.DICTATE, payload: { text: mathSpeechToNotation(transcript.trim()).display } };
}

export function parseReviewVoiceCommand(transcript) {
    const spoken = String(transcript ?? '').trim().toLowerCase();
    if (!spoken) return { intent: VOICE_INTENT.UNKNOWN };

    if (spoken.includes('submit anyway') || spoken.includes('confirm submit') || spoken === 'submit') {
        return { intent: VOICE_INTENT.REVIEW_SUBMIT_ANYWAY };
    }

    if (spoken.includes('go back') || spoken.includes('back to exam') || spoken.includes('close review')) {
        return { intent: VOICE_INTENT.REVIEW_GO_BACK };
    }

    const readMatch = spoken.match(/read answer\s+(\d+)/);
    if (readMatch) {
        return { intent: VOICE_INTENT.REVIEW_READ_ANSWER, payload: { index: Number(readMatch[1]) } };
    }

    if (spoken === 'next' || spoken.includes('next question')) {
        return { intent: VOICE_INTENT.REVIEW_NEXT };
    }

    if (spoken === 'previous' || spoken.includes('previous question')) {
        return { intent: VOICE_INTENT.REVIEW_PREVIOUS };
    }

    return { intent: VOICE_INTENT.UNKNOWN };
}
