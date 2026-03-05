import { normalizeMcqLetter } from './mcqUtils';
import { mathSpeechToNotation } from './mathSpeechToNotation';

/**
 * Intent types returned by parseVoiceCommand.
 */
export const VOICE_INTENT = {
    MCQ_SELECT: 'MCQ_SELECT',
    NEXT: 'NEXT',
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
    // Navigation — next
    if (
        cmd === 'next question' ||
        cmd === 'next' ||
        cmd === 'go next' ||
        cmd === 'go to next'
    ) return VOICE_INTENT.NEXT;

    // Navigation — previous
    if (
        cmd === 'previous question' ||
        cmd === 'previous' ||
        cmd === 'go back' ||
        cmd === 'back' ||
        cmd === 'go to previous'
    ) return VOICE_INTENT.PREVIOUS;

    // Skip
    if (
        cmd === 'skip this question' ||
        cmd === 'skip question' ||
        cmd === 'skip'
    ) return VOICE_INTENT.NEXT;

    // Submit
    if (
        cmd.includes('submit paper') ||
        cmd.includes('submit exam') ||
        cmd === 'submit'
    ) return VOICE_INTENT.SUBMIT;

    // Repeat / read question
    if (
        cmd === 'repeat' ||
        cmd === 'read question' ||
        cmd === 'read the question' ||
        cmd === 'repeat question'
    ) return VOICE_INTENT.REPEAT;

    // Clear (written answer)
    if (
        cmd === 'clear step' ||
        cmd === 'clear' ||
        cmd === 'erase' ||
        cmd === 'stop'
    ) return VOICE_INTENT.CLEAR;

    // Written-question specific commands
    if (
        cmd === 'create next step' ||
        cmd === 'new step' ||
        cmd === 'add a step' ||
        cmd === 'next step'
    ) return VOICE_INTENT.CREATE_STEP;

    if (
        cmd === 'read my answer' ||
        cmd === 'read answer' ||
        cmd === 'hear my answer'
    ) return VOICE_INTENT.READ_ANSWER;

    if (
        cmd === 'undo' ||
        cmd === 'undo last' ||
        cmd === 'undo last change'
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
 * @param {'mcq'|'text'|'voice'|string} questionType  Current question's type
 * @returns {{ intent: string, payload?: object }}
 */
export function parseVoiceCommand(transcript, grammarMode, questionType) {
    const spoken = String(transcript ?? '').trim().toLowerCase();
    if (!spoken) return { intent: VOICE_INTENT.UNKNOWN };

    // ── Global intercepts — always recognised in any mode ───────────────────
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
    if (spoken.includes('read options') || spoken.includes('read the options') ||
        spoken.includes('read choices') || spoken.includes('what are the options') ||
        spoken.includes('hear the options')) {
        return { intent: VOICE_INTENT.READ_OPTIONS };
    }
    if (spoken.includes('review answers') || spoken.includes('review my answers') ||
        spoken.includes('show review') || spoken.includes('check answers') ||
        spoken.includes('check my answers')) {
        return { intent: VOICE_INTENT.REVIEW };
    }
    // RESUME: only match when the entire spoken phrase is clearly a resume command.
    // Avoid broad 'startsWith' to prevent false positives during free dictation
    // (e.g. "continuing from where I left off" must NOT trigger RESUME).
    if (
        spoken === 'continue' ||
        spoken === 'resume' ||
        spoken === 'continue please' ||
        spoken === 'resume please' ||
        spoken === 'continue exam' ||
        spoken === 'resume exam' ||
        spoken === 'go back' ||
        spoken.includes('go back to exam') ||
        spoken.includes('close help') ||
        spoken.includes('resume the exam') ||
        spoken.includes('continue the exam')
    ) {
        return { intent: VOICE_INTENT.RESUME };
    }

    // ── Strict mode (MCQ-only exam) ─────────────────────────────────────────
    if (grammarMode === 'strict') {
        const letter = normalizeMcqLetter(spoken);
        if (letter) return { intent: VOICE_INTENT.MCQ_SELECT, payload: { letter } };

        const navIntent = matchUnambiguousCommand(spoken);
        if (navIntent) return { intent: navIntent };

        return { intent: VOICE_INTENT.UNKNOWN };
    }

    // ── Command-prefix mode (mixed exam) ────────────────────────────────────
    if (grammarMode === 'command-prefix') {
        // Always try nav commands first (with or without "command" prefix)
        const navIntent = matchUnambiguousCommand(spoken);
        if (navIntent) return { intent: navIntent };

        // MCQ question: only accept explicit letter forms
        if (questionType === 'mcq') {
            const isExplicit =
                /^[abcd]$/i.test(spoken) ||
                /^(option|answer)\s+[abcd]$/i.test(spoken);
            const letter = normalizeMcqLetter(spoken);
            if (letter && isExplicit) return { intent: VOICE_INTENT.MCQ_SELECT, payload: { letter } };
            return { intent: VOICE_INTENT.UNKNOWN };
        }

        // Written/voice question: free dictation with math conversion
        return { intent: VOICE_INTENT.DICTATE, payload: { text: mathSpeechToNotation(transcript.trim()).display } };
    }

    // ── Dictation mode (writing-only exam) ──────────────────────────────────
    // Try nav/control commands first (with or without "command" prefix)
    const navIntent = matchUnambiguousCommand(spoken);
    if (navIntent) return { intent: navIntent };

    // Everything else is free dictation with math conversion
    return { intent: VOICE_INTENT.DICTATE, payload: { text: mathSpeechToNotation(transcript.trim()).display } };
}
