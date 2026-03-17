import { getExamIntroMessage, getQuestionInstruction } from './examMessaging';

// ── Type detection ─────────────────────────────────────────────────────────────

/**
 * Compute exam type from the questions array.
 * Never relies on a stored field — always derived at runtime.
 * @returns {'mcq-only'|'writing-only'|'mixed'|'empty'|'unknown'}
 */
export function detectExamType(questions) {
    if (!questions || questions.length === 0) return 'empty';

    const hasMCQ = questions.some(q =>
        q?.type === 'mcq'
        || (Array.isArray(q?.options) && q.options.length > 0)
        || /\bA\)\s+/i.test(q?.text || '')
    );
    const hasWriting = questions.some(q =>
        q?.type === 'text' &&
        (!Array.isArray(q?.options) || q.options.length === 0)
    );

    if (hasMCQ && !hasWriting) return 'mcq-only';
    if (!hasMCQ && hasWriting) return 'writing-only';
    if (hasMCQ && hasWriting) return 'mixed';
    return 'unknown';
}

/** Returns true when the question is a multiple-choice question. */
export function isMCQQuestion(question) {
    if (!question) return false;
    if (question.type === 'mcq') return true;
    if (Array.isArray(question.options) && question.options.length > 0) return true;
    // Fallback: inline MCQ pattern in text, e.g. "... (A) ... (B) ..."
    return /\bA\)\s+.*\bB\)\s+/i.test(question.text || '');
}

/** Returns true when the question expects a written / dictated answer. */
export function isWrittenQuestion(question) {
    if (!question) return false;
    const hasOptions = Array.isArray(question.options) && question.options.length > 0;
    return !hasOptions && question.type === 'text';
}

// ── Question counts ────────────────────────────────────────────────────────────

export function getQuestionCounts(questions) {
    const list = Array.isArray(questions) ? questions : [];
    return {
        total: list.length,
        mcq: list.filter(isMCQQuestion).length,
        writing: list.filter(isWrittenQuestion).length,
        voice: 0,
    };
}

// ── Answered state ─────────────────────────────────────────────────────────────

/**
 * Returns true if the given answer satisfies the minimum threshold for the
 * question type.  For MCQ a non-empty string is enough; for written answers
 * the word count must meet question.minWords (defaulting to 3).
 */
export function isAnswered(question, answer) {
    if (!answer || !question) return false;
    if (isMCQQuestion(question)) return String(answer).trim().length > 0;
    if (isWrittenQuestion(question)) {
        const rawMinWords = Number(question.minWords || 0);
        const minWords = rawMinWords > 0 ? rawMinWords : 3;
        return String(answer).trim().split(/\s+/).filter(Boolean).length >= minWords;
    }
    return false;
}

/**
 * Returns the subset of questions that have no (or insufficient) answer.
 * @param {object[]} questions
 * @param {{ [questionId: string]: string }} answers
 * @returns {number[]} 1-based question numbers
 */
export function getUnanswered(questions, answers) {
    const list = Array.isArray(questions) ? questions : [];
    const bag = answers || {};
    return list
        .map((q, i) => ({ q, i, num: i + 1 }))
        .filter(({ q }) => !isAnswered(q, bag[q._id]))
        .map(({ num }) => num);
}

/**
 * Returns the full question objects that have no valid answer yet.
 * @param {object[]} questions
 * @param {{ [questionId: string]: string }} answers
 * @returns {object[]} unanswered question objects
 */
export function getUnansweredQuestions(questions, answers) {
    const list = Array.isArray(questions) ? questions : [];
    const bag = answers || {};
    return list.filter(q => !isAnswered(q, bag[q._id]));
}

/**
 * Returns the count of questions that have a valid answer.
 */
export function getAnsweredCount(questions, answers) {
    const list = Array.isArray(questions) ? questions : [];
    const bag = answers || {};
    return list.filter(q => isAnswered(q, bag[q._id])).length;
}

// ── Navigation helpers ─────────────────────────────────────────────────────────

/**
 * Determines whether navigating from fromIndex to toIndex crosses a question
 * type boundary (MCQ ↔ written), which should trigger a transition card in
 * mixed exams.
 *
 * @param {object[]} questions
 * @param {number} fromIndex 0-based
 * @param {number} toIndex 0-based
 * @returns {{ shouldShow: boolean, from: 'mcq'|'written', to: 'mcq'|'written' }}
 */
export function detectTypeTransition(questions, fromIndex, toIndex) {
    const noop = { shouldShow: false, from: null, to: null };
    if (!Array.isArray(questions)) return noop;
    const fromQ = questions[fromIndex];
    const toQ = questions[toIndex];
    if (!fromQ || !toQ) return noop;

    const typeOf = q => (q.type === 'mcq' ? 'mcq' : 'written');
    const from = typeOf(fromQ);
    const to = typeOf(toQ);
    if (from === to) return noop;
    return { shouldShow: true, from, to };
}

// ── Voice grammar ──────────────────────────────────────────────────────────────

/**
 * Returns the voice grammar mode to use for the current question.
 * - 'strict'         → MCQ-only exam (only A/B/C/D + submit)
 * - 'dictation'      → writing-only exam (free dictation)
 * - 'command-prefix' → mixed exam (say "command next" etc.)
 */
export function getVoiceGrammarMode(examType, currentQuestion) {
    if (examType === 'mcq-only') return 'strict';
    if (examType === 'writing-only') return 'dictation';
    // mixed — mode depends on which type the current question is
    if (isMCQQuestion(currentQuestion)) return 'strict';
    return 'command-prefix';
}

// ── Timer helpers ──────────────────────────────────────────────────────────────

/** Converts exam duration in minutes to total seconds. */
export function durationToSeconds(durationMinutes) {
    return Math.max(0, Number(durationMinutes || 0)) * 60;
}

/**
 * Formats a seconds count as a "MM:SS" string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatTimeRemaining(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
}

/**
 * Returns true when the remaining time is in the critical window (≤ 60 s and
 * greater than zero — timer has started but is almost up).
 */
export function isTimeCritical(seconds) {
    return seconds > 0 && seconds <= 60;
}

// ── Labels & TTS ──────────────────────────────────────────────────────────────

/**
 * Returns a human-readable label for the exam type.
 * @param {'mcq-only'|'writing-only'|'mixed'|string} examType
 * @returns {string}
 */
export function getExamTypeLabel(examType) {
    switch (examType) {
        case 'mcq-only': return 'Multiple Choice (MCQ)';
        case 'writing-only': return 'Written Exam';
        case 'mixed': return 'Mixed Exam (MCQ + Written)';
        default: return 'Exam';
    }
}

/**
 * Returns the TTS announcement string spoken when the exam first loads.
 * @param {'mcq-only'|'writing-only'|'mixed'|string} examType
 * @returns {string}
 */
export function getExamTypeTTSIntro(examType) {
    switch (examType) {
        case 'mcq-only':
            return 'This is a multiple choice exam. Say Option A, B, C, or D to answer each question.';
        case 'writing-only':
            return 'This is a written exam. Speak or type your answer for each question. Say command next to move to the next question.';
        case 'mixed':
            return 'This exam has both multiple choice and written questions. For multiple choice questions say A, B, C, or D. For written questions speak or type your answer freely. Say command next to advance.';
        default:
            return 'Your exam is ready. Good luck.';
    }
}

// ── Re-exports (kept for backwards compatibility) ──────────────────────────────
export { getExamIntroMessage, getQuestionInstruction };
