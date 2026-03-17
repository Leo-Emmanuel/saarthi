/**
 * ConfidenceFilter.js
 * Handles low-confidence STT results by generating disambiguation prompts.
 */

// Threshold below which we ask for confirmation
export const CONFIDENCE_THRESHOLD = 0.50;

/**
 * Check result and decide whether to use it, disambiguate, or reject.
 * @returns 'accept' | 'disambiguate' | 'reject'
 */
export const filterResult = (transcript, confidence) => {
    if (confidence >= CONFIDENCE_THRESHOLD) return 'accept';
    if (confidence >= 0.45) return 'disambiguate';
    return 'reject';
};

const MATH_AMBIGUOUS_PAIRS = [
    [/\bintegral\b/, /\binterval\b/, 'integral', 'interval'],
    [/\bderivative\b/, /\bdefinite\b/, 'derivative', 'definite integral'],
    [/\b(sine|sin)\b/, /\bsign\b/, 'sine', 'sign'],
    [/\blog\b/, /\block\b/, 'logarithm', 'lock'],
    [/\bsum\b/, /\b(some|son)\b/, 'summation', 'some'],
    [/\bmatrix\b/, /\bmatrices\b/, 'matrix', 'matrices'],
    [/\bvector\b/, /\bfactor\b/, 'vector', 'factor'],
    [/\bpi\b/, /\bpie\b/, 'pi (π)', 'pie'],
    [/\binfinite\b/, /\binfinity\b/, 'infinite', 'infinity'],
    [/\btheta\b/, /\bdata\b/, 'theta (θ)', 'data'],
];

/**
 * Generate a disambiguation prompt for a low-confidence transcript.
 */
export const buildDisambiguationPrompt = (transcript) => {
    const t = transcript.toLowerCase();
    for (const [patA, patB, wordA, wordB] of MATH_AMBIGUOUS_PAIRS) {
        if (patA.test(t)) {
            return `Did you mean ${wordA}, or ${wordB}?`;
        }
        if (patB.test(t)) {
            return `Did you mean ${wordB}, or ${wordA}?`;
        }
    }
    // Generic fallback
    return `I heard "${transcript}". Is that correct? Say "yes" to confirm or "no" to try again.`;
};

/**
 * Parse a confirmation response.
 * @returns 'yes' | 'no' | 'first' | 'second' | 'unclear'
 */
export const parseConfirmation = (transcript, wordA, wordB) => {
    const t = transcript.toLowerCase().trim();
    if (wordA && t.includes(wordA.toLowerCase())) return 'first';
    if (wordB && t.includes(wordB.toLowerCase())) return 'second';
    if (/\b(first|one)\b/.test(t)) return 'first';
    if (/\b(second|two)\b/.test(t)) return 'second';
    if (/\b(yes|correct|confirm|right|yep|yeah)\b/.test(t)) return 'yes';
    if (/\b(no|nope|wrong|incorrect|cancel|retry|again)\b/.test(t)) return 'no';
    return 'unclear';
};
