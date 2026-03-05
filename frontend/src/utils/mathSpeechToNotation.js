/**
 * mathSpeechToNotation.js — Maths Voice Parser (pipeline engine)
 *
 * Converts spoken natural-language math expressions into LaTeX strings.
 *
 * ALL rule definitions live in mathRules.js — edit that file to add/change mappings.
 *
 * PIPELINE ORDER (applied in sequence):
 *   1. Structural   — named formulas, grouping keywords, matrices
 *   2. Greek        — Alpha, Beta, ... Omega
 *   3. Calculus     — derivatives, integrals, differentials
 *   4. Limits       — lim, tends to, approaches
 *   5. Powers/Roots — squared, cubed, sqrt, nth root
 *   6. Functions    — sin, cos, log, ln, ...
 *   7. Inequalities — ≤, ≥, ≠, ≈, ∝, ≡
 *   8. Set/Logic    — ∪, ∩, ∈, ∉, ∀, ∃, ℝ, ...
 *   9. Stats        — bar, variance, summation, combinations, P(A|B)
 *  10. Vectors      — vec, hat, dot product, cross product
 *  11. Operators    — fractions, +, -, ×, ÷, ∞, geometry
 *  12. Brackets     — open/close bracket, parenthesis, curly brace
 *  13. Post-cleanup — spacing normalisation
 *
 * @returns {{ latex: string, display: string }}
 *   latex   — raw LaTeX (no wrapping)
 *   display — LaTeX wrapped in $...$ for inline rendering
 */

import {
    STRUCTURAL_RULES,
    GREEK_RULES,
    CALCULUS_RULES,
    LIMIT_RULES,
    POWER_ROOT_RULES,
    FUNCTION_RULES,
    INEQUALITY_RULES,
    SET_LOGIC_RULES,
    STATS_RULES,
    NUMBER_WORD_RULES,
    VECTOR_RULES,
    OPERATOR_RULES,
    BRACKET_RULES,
    POST_CLEANUP_RULES,
} from './mathRules.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyRules(text, rules) {
    let result = text;
    for (const { pattern, replace } of rules) {
        result = result.replace(pattern, replace);
    }
    return result;
}

function normalise(text) {
    return text
        .toLowerCase()
        // Preserve literal commas — they are meaningful in math (coordinates, sets, args).
        // Only strip semicolons and colons which are genuine STT noise.
        .replace(/[;:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Convert raw STT voice transcript to LaTeX notation.
 *
 * @param {string} transcript - Raw speech-to-text string
 * @param {{ wrapLatex?: boolean }} [opts]
 * @returns {{ latex: string, display: string }}
 *
 * @example
 *   mathSpeechToNotation("x squared plus 3 x minus 5 equals 0")
 *   // → { latex: "x^{2} + 3x - 5 = 0", display: "$x^{2} + 3x - 5 = 0$" }
 */
/**
 * Convert raw STT voice transcript to LaTeX notation.
 *
 * The output is wrapped in $...$ ONLY when the result actually contains LaTeX
 * backslash commands (e.g. \frac, \int, \sqrt). Plain text or basic symbol
 * conversions (=, +, -, ×) are returned as-is without wrapping, preventing
 * literal "$" characters appearing in the student's answer textarea.
 *
 * @param {string} transcript - Raw speech-to-text string
 * @param {{ forceWrap?: boolean }} [opts]
 *   forceWrap: if true, always wrap regardless of content (useful for rendering previews)
 * @returns {{ latex: string, display: string, hasLatex: boolean }}
 *   latex   — the converted string (no wrapping)
 *   display — $latex$ if LaTeX was detected, otherwise plain latex
 *   hasLatex — true when actual LaTeX commands are present
 *
 * @example
 *   mathSpeechToNotation("x squared plus 3 x minus 5 equals 0")
 *   // → { latex: "x^{2} + 3x - 5 = 0", display: "$x^{2} + 3x - 5 = 0$", hasLatex: true }
 *
 *   mathSpeechToNotation("2 x 2 minus 5 x minus 3 equals 0")
 *   // → { latex: "2 x 2 - 5 x - 3 = 0", display: "2 x 2 - 5 x - 3 = 0", hasLatex: false }
 */
export function mathSpeechToNotation(transcript, { forceWrap = false } = {}) {
    if (!transcript || typeof transcript !== 'string') {
        return { latex: transcript ?? '', display: transcript ?? '', hasLatex: false };
    }

    let result = normalise(transcript);

    // Ordered pipeline — sequence is critical
    result = applyRules(result, STRUCTURAL_RULES);
    result = applyRules(result, GREEK_RULES);
    result = applyRules(result, CALCULUS_RULES);
    result = applyRules(result, LIMIT_RULES);
    result = applyRules(result, POWER_ROOT_RULES);
    result = applyRules(result, FUNCTION_RULES);
    result = applyRules(result, INEQUALITY_RULES);
    result = applyRules(result, SET_LOGIC_RULES);
    result = applyRules(result, STATS_RULES);
    result = applyRules(result, VECTOR_RULES);
    result = applyRules(result, OPERATOR_RULES);
    // Number words after OPERATOR_RULES so compound-fraction words
    // ('one half', 'two thirds') and limit phrases ('tends to zero')
    // are already converted and won't be seen here.
    result = applyRules(result, NUMBER_WORD_RULES);
    result = applyRules(result, BRACKET_RULES);
    result = applyRules(result, POST_CLEANUP_RULES);

    const latex = result.trim();

    // Only wrap in $...$ when the result contains actual LaTeX backslash commands,
    // or when superscript/subscript braces are present (e.g. x^{2}, a_{n}).
    // Plain text conversions like "equals" → "=" should NOT be wrapped.
    const hasLatex = /\\[a-zA-Z{]|[\^_]\{/.test(latex);
    const display = (hasLatex || forceWrap) ? `$${latex}$` : latex;

    return { latex, display, hasLatex };
}


/** Convenience: returns just the $...$ display string. */
export function toDisplayMath(transcript) {
    return mathSpeechToNotation(transcript).display;
}

/** Convenience: returns just the raw LaTeX string. */
export function toLatex(transcript) {
    return mathSpeechToNotation(transcript).latex;
}
