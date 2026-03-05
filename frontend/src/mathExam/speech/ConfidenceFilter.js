/**
 * ConfidenceFilter.js
 * Handles low-confidence STT results by generating disambiguation prompts.
 */

// Threshold below which we ask for confirmation
export const CONFIDENCE_THRESHOLD = 0.72;

/**
 * Check result and decide whether to use it, disambiguate, or reject.
 * @returns 'accept' | 'disambiguate' | 'reject'
 */
export const filterResult = (transcript, confidence) => {
    if (confidence >= CONFIDENCE_THRESHOLD) return 'accept';
    if (confidence >= 0.45) return 'disambiguate';
    return 'reject';
};

/**
 * Generate a disambiguation prompt for a low-confidence transcript.
 */
export const buildDisambiguationPrompt = (transcript) => {
    return `I heard "${transcript}". Is that correct? Say "yes" to confirm or "no" to try again.`;
};

/**
 * Parse a confirmation response.
 * @returns 'yes' | 'no' | 'unclear'
 */
export const parseConfirmation = (transcript) => {
    const t = transcript.toLowerCase().trim();
    if (/\b(yes|correct|confirm|right|yep|yeah)\b/.test(t)) return 'yes';
    if (/\b(no|nope|wrong|incorrect|cancel|retry|again)\b/.test(t)) return 'no';
    return 'unclear';
};
