/**
 * CommandParser.js
 * Maps spoken transcript strings → structured command objects.
 *
 * Returns: { type: string, payload: object, confidence: number }
 * All matching is case-insensitive.
 */

// ─── Command Types ────────────────────────────────────────────────────────────

export const CMD = {
    // Mode
    ENTER_COMMAND_MODE: 'ENTER_COMMAND_MODE',
    EXIT_COMMAND_MODE: 'EXIT_COMMAND_MODE',
    // Navigation
    MOVE_LEFT: 'MOVE_LEFT',
    MOVE_RIGHT: 'MOVE_RIGHT',
    MOVE_TO_START: 'MOVE_TO_START',
    MOVE_TO_END: 'MOVE_TO_END',
    MOVE_TO_NUMERATOR: 'MOVE_TO_NUMERATOR',
    MOVE_TO_DENOMINATOR: 'MOVE_TO_DENOMINATOR',
    MOVE_TO_SUPERSCRIPT: 'MOVE_TO_SUPERSCRIPT',
    MOVE_TO_SUBSCRIPT: 'MOVE_TO_SUBSCRIPT',
    NEXT_TERM: 'NEXT_TERM',
    PREV_TERM: 'PREV_TERM',
    NEXT_BRACKET: 'NEXT_BRACKET',
    GO_TO_STEP: 'GO_TO_STEP',
    GO_TO_CELL: 'GO_TO_CELL',
    MOVE_OUT: 'MOVE_OUT',
    // Reading
    READ_BRIEF: 'READ_BRIEF',
    READ_DETAILED: 'READ_DETAILED',
    READ_STEP: 'READ_STEP',
    READ_ALL_STEPS: 'READ_ALL_STEPS',
    READ_POSITION: 'READ_POSITION',
    // Step management
    NEW_STEP: 'NEW_STEP',
    EDIT_STEP: 'EDIT_STEP',
    DELETE_STEP: 'DELETE_STEP',
    // Verbosity
    VERBOSITY_BRIEF: 'VERBOSITY_BRIEF',
    VERBOSITY_DETAILED: 'VERBOSITY_DETAILED',
    // Correction
    REPLACE_SLOT: 'REPLACE_SLOT',
    REMOVE_SLOT: 'REMOVE_SLOT',
    INSERT_AFTER: 'INSERT_AFTER',
    // Exam
    REVIEW_ANSWERS: 'REVIEW_ANSWERS',
    SUBMIT_PAPER: 'SUBMIT_PAPER',
    EXPORT_LATEX: 'EXPORT_LATEX',
    EXPORT_JSON: 'EXPORT_JSON',
    EXPORT_PRINT: 'EXPORT_PRINT',
    // Undo/Redo
    UNDO: 'UNDO',
    REDO: 'REDO',
    // Math input (passes through as raw text for the dictation parser)
    MATH_INPUT: 'MATH_INPUT',
    // Unknown
    UNKNOWN: 'UNKNOWN',
};

// ─── Pattern Definitions ──────────────────────────────────────────────────────
// Order matters — more specific patterns should come first.

const PATTERNS = [
    // ── Mode ──
    [/\benter\s+command\s+mode\b/, CMD.ENTER_COMMAND_MODE, {}],
    [/\b(exit|leave|stop)\s+command\s+mode\b/, CMD.EXIT_COMMAND_MODE, {}],

    // ── Undo/Redo ──
    [/\bundo\b/, CMD.UNDO, {}],
    [/\bredo\b/, CMD.REDO, {}],

    // ── Navigation ──
    [/\bmove\s+left\b/, CMD.MOVE_LEFT, {}],
    [/\bmove\s+right\b/, CMD.MOVE_RIGHT, {}],
    [/\b(go\s+to|move\s+to)\s+start\b/, CMD.MOVE_TO_START, {}],
    [/\b(go\s+to|move\s+to)\s+end\b/, CMD.MOVE_TO_END, {}],
    [/\b(go\s+to|move\s+to)\s+numerator\b/, CMD.MOVE_TO_NUMERATOR, {}],
    [/\b(go\s+to|move\s+to)\s+denominator\b/, CMD.MOVE_TO_DENOMINATOR, {}],
    [/\b(go\s+to|move\s+to)\s+superscript\b/, CMD.MOVE_TO_SUPERSCRIPT, {}],
    [/\b(go\s+to|move\s+to)\s+subscript\b/, CMD.MOVE_TO_SUBSCRIPT, {}],
    [/\b(next\s+term|move\s+to\s+next\s+term)\b/, CMD.NEXT_TERM, {}],
    [/\b(previous\s+term|prev\s+term|move\s+to\s+previous\s+term)\b/, CMD.PREV_TERM, {}],
    [/\bnext\s+bracket\b/, CMD.NEXT_BRACKET, {}],
    [/\bmove\s+out\b/, CMD.MOVE_OUT, {}],

    // go to step N
    [/\bgo\s+to\s+step\s+(\d+)\b/, CMD.GO_TO_STEP, (m) => ({ stepNumber: parseInt(m[1]) })],

    // go to row R column C
    [/\bgo\s+to\s+row\s+(\d+)\s+col(?:umn)?\s+(\d+)\b/, CMD.GO_TO_CELL, (m) => ({ row: parseInt(m[1]) - 1, col: parseInt(m[2]) - 1 })],

    // ── Reading ──
    [/\bread\s+expression\s+briefly\b/, CMD.READ_BRIEF, {}],
    [/\bread\s+(briefly|in\s+brief)\b/, CMD.READ_BRIEF, {}],
    [/\bread\s+expression\s+(in\s+detail|detailed)\b/, CMD.READ_DETAILED, {}],
    [/\bread\s+(in\s+detail|detailed|fully)\b/, CMD.READ_DETAILED, {}],
    [/\bread\s+all\s+steps\b/, CMD.READ_ALL_STEPS, {}],
    [/\bread\s+my\s+position\b/, CMD.READ_POSITION, {}],
    [/\bwhere\s+am\s+i\b/, CMD.READ_POSITION, {}],

    // read [left|right] side of step N
    [/\bread\s+(left|right)\s+side\s+of\s+step\s+(\d+)\b/, CMD.READ_STEP,
        (m) => ({ side: m[1], stepNumber: parseInt(m[2]) - 1 })],

    // ── Step Management ──
    [/\bcreate\s+(next|new)\s+(aligned\s+)?step\b/, CMD.NEW_STEP, {}],
    [/\badd\s+(next|new)?\s*(aligned\s+)?step\b/, CMD.NEW_STEP, {}],
    [/\bedit\s+step\s+(\d+)\b/, CMD.EDIT_STEP, (m) => ({ stepNumber: parseInt(m[1]) - 1 })],
    [/\bdelete\s+step\s+(\d+)\b/, CMD.DELETE_STEP, (m) => ({ stepNumber: parseInt(m[1]) - 1 })],

    // ── Verbosity ──
    [/\bswitch\s+to\s+brief\s+mode\b/, CMD.VERBOSITY_BRIEF, {}],
    [/\bbrief\s+mode\b/, CMD.VERBOSITY_BRIEF, {}],
    [/\bswitch\s+to\s+detailed?\s+mode\b/, CMD.VERBOSITY_DETAILED, {}],
    [/\bdetailed?\s+mode\b/, CMD.VERBOSITY_DETAILED, {}],

    // ── Correction ──
    // replace numerator with X
    [/\breplace\s+(numerator|denominator|base|exponent|subscript|argument|integrand|term)\s+with\s+(.+)$/,
        CMD.REPLACE_SLOT, (m) => ({ slot: m[1], withText: m[2].trim() })],
    // remove denominator
    [/\bremove\s+(numerator|denominator|base|exponent|subscript|argument)\b/,
        CMD.REMOVE_SLOT, (m) => ({ slot: m[1] })],
    // insert fraction after x
    [/\binsert\s+(.+?)\s+after\s+(.+)$/,
        CMD.INSERT_AFTER, (m) => ({ what: m[1].trim(), after: m[2].trim() })],

    // ── Exam Controls ──
    [/\breview\s+all\s+(answers|steps)\b/, CMD.REVIEW_ANSWERS, {}],
    [/\bsubmit\s+(paper|exam)\b/, CMD.SUBMIT_PAPER, {}],
    [/\bexport\s+as\s+latex\b/, CMD.EXPORT_LATEX, {}],
    [/\bexport\s+as\s+json\b/, CMD.EXPORT_JSON, {}],
    [/\bexport\s+(print|as\s+print)\b/, CMD.EXPORT_PRINT, {}],
];

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a spoken transcript into a structured command.
 * @param {string} transcript - Raw transcript from STT
 * @param {number} rawConfidence - Confidence score (0–1) from STT
 * @returns {{ type: string, payload: object, confidence: number, originalText: string }}
 */
export const parseCommand = (transcript, rawConfidence = 1.0) => {
    const text = transcript.toLowerCase().trim();

    for (const [pattern, cmdType, payloadExtractor] of PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            const payload = typeof payloadExtractor === 'function'
                ? payloadExtractor(match)
                : payloadExtractor;
            return {
                type: cmdType,
                payload: payload || {},
                confidence: rawConfidence,
                originalText: transcript,
            };
        }
    }

    // Not a recognized command — treat as math dictation input
    return {
        type: CMD.MATH_INPUT,
        payload: { text: transcript },
        confidence: rawConfidence,
        originalText: transcript,
    };
};

// ─── Disambiguation ──────────────────────────────────────────────────────────

const DISAMBIGUATION_PAIRS = [
    [/integral/, /interval/, 'integral', 'interval'],
    [/matrix/, /matrices/, 'matrix', 'matrices'],
    [/derivative/, /definite/, 'derivative', 'definite integral'],
    [/log/, /lock/, 'logarithm', 'lock'],
    [/sum/, /some|son/, 'summation', 'some'],
    [/sine|sin/, /sign/, 'sine', 'sign'],
];

/**
 * Check if a transcript is ambiguous and return disambiguation prompt.
 */
export const getDisambiguationPrompt = (transcript) => {
    const text = transcript.toLowerCase();
    for (const [pA, pB, wordA, wordB] of DISAMBIGUATION_PAIRS) {
        if (pA.test(text) || pB.test(text)) {
            if (pA.test(text) && pB.test(text)) continue;
            // Could be either
            return `Did you say "${wordA}" or "${wordB}"?`;
        }
    }
    return null;
};

// ─── Math Dictation Parser ────────────────────────────────────────────────────
// Converts natural language math dictation into MathJSON AST nodes

import {
    Num, Sym, Fraction, Power, Subscript, Root, Brackets,
    Equation, Integral, Derivative, Summation, Product,
    Log, Trig, Matrix, Add, Subtract, Multiply, Sequence, EMPTY
} from './MathAST.js';

/**
 * Parse natural language math text into an AST.
 * Handles common spoken math patterns.
 */
export const parseMathDictation = (text) => {
    const t = text.toLowerCase().trim();
    return parseExpression(t);
};

const parseExpression = (text) => {
    // Try various high-level structures first

    // Integral
    const intMatch = text.match(/^integral\s+(?:from\s+(.+?)\s+to\s+(.+?)\s+)?of\s+(.+?)\s+d\s*([a-z])$/);
    if (intMatch) {
        const lower = intMatch[1] ? parseSimple(intMatch[1]) : null;
        const upper = intMatch[2] ? parseSimple(intMatch[2]) : null;
        return Integral(parseExpression(intMatch[3]), Sym(intMatch[4]), lower, upper);
    }

    // Derivative: d by dx of ...
    const derivMatch = text.match(/^d\s+by\s+d([a-z])\s+of\s+(.+)$/);
    if (derivMatch) {
        return Derivative(parseExpression(derivMatch[2]), Sym(derivMatch[1]), 1);
    }

    // Sum: sum from n=1 to N of ...
    const sumMatch = text.match(/^sum\s+from\s+([a-z])\s*(?:equals|=)?\s*(.+?)\s+to\s+(.+?)\s+of\s+(.+)$/);
    if (sumMatch) {
        return Summation(parseExpression(sumMatch[4]), Sym(sumMatch[1]), parseSimple(sumMatch[2]), parseSimple(sumMatch[3]));
    }

    // Product
    const prodMatch = text.match(/^product\s+from\s+([a-z])\s*(?:equals|=)?\s*(.+?)\s+to\s+(.+?)\s+of\s+(.+)$/);
    if (prodMatch) {
        return Product(parseExpression(prodMatch[4]), Sym(prodMatch[1]), parseSimple(prodMatch[2]), parseSimple(prodMatch[3]));
    }

    // Equation: X equals Y
    const eqMatch = text.match(/^(.+?)\s+equals\s+(.+)$/);
    if (eqMatch) {
        return Equation(parseSimple(eqMatch[1]), parseSimple(eqMatch[2]), '=');
    }

    // Fraction: X over Y
    const fracMatch = text.match(/^(.+?)\s+over\s+(.+)$/);
    if (fracMatch) {
        return Fraction(parseSimple(fracMatch[1]), parseSimple(fracMatch[2]));
    }

    // Log
    const logMatch = text.match(/^log\s+(?:base\s+(.+?)\s+)?of\s+(.+)$/);
    if (logMatch) {
        return Log(parseSimple(logMatch[2]), logMatch[1] ? parseSimple(logMatch[1]) : null);
    }

    // Matrix
    const matMatch = text.match(/^(\d+)\s+by\s+(\d+)\s+matrix$/);
    if (matMatch) {
        const r = parseInt(matMatch[1]), c = parseInt(matMatch[2]);
        const cells = Array.from({ length: r }, () => Array.from({ length: c }, () => EMPTY));
        return Matrix(r, c, cells);
    }

    // Default: parse as simple expression
    return parseSimple(text);
};

const parseSimple = (text) => {
    const t = text.trim();

    // Number
    if (/^-?\d+(\.\d+)?$/.test(t)) return Num(t);

    // Infinity
    if (t === 'infinity' || t === 'infinite') return Sym('\\infty');

    // Trig functions: sin of ...
    const trigMatch = t.match(/^(sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan)\s+(?:of\s+)?(.+)$/);
    if (trigMatch) return Trig(trigMatch[1], parseSimple(trigMatch[2]));

    // Power: X squared / X to the power N
    const sqMatch = t.match(/^(.+?)\s+squared$/);
    if (sqMatch) return Power(parseSimple(sqMatch[1]), Num(2));
    const cbMatch = t.match(/^(.+?)\s+cubed$/);
    if (cbMatch) return Power(parseSimple(cbMatch[1]), Num(3));
    const powMatch = t.match(/^(.+?)\s+to\s+the\s+(?:power\s+(?:of\s+)?)?(.+)$/);
    if (powMatch) return Power(parseSimple(powMatch[1]), parseSimple(powMatch[2]));

    // Root
    const sqrtMatch = t.match(/^(?:square\s+)?root\s+of\s+(.+)$/);
    if (sqrtMatch) return Root(parseSimple(sqrtMatch[1]));
    const nthRootMatch = t.match(/^(.+?)\s+root\s+of\s+(.+)$/);
    if (nthRootMatch) return Root(parseSimple(nthRootMatch[2]), parseSimple(nthRootMatch[1]));

    // Subscript: a sub 1
    const subMatch = t.match(/^([a-z])\s+sub\s+(.+)$/);
    if (subMatch) return Subscript(Sym(subMatch[1]), parseSimple(subMatch[2]));

    // Brackets
    const brMatch = t.match(/^(?:open\s+bracket|bracket)\s+(.+?)\s+(?:close\s+bracket|end\s+bracket)$/);
    if (brMatch) return Brackets(parseSimple(brMatch[1]));

    // Plus / minus / times — simple inline
    if (/\s+plus\s+/.test(t)) {
        const parts = t.split(/\s+plus\s+/);
        return Add(...parts.map(parseSimple));
    }
    if (/\s+minus\s+/.test(t)) {
        const parts = t.split(/\s+minus\s+/);
        return Subtract(parseSimple(parts[0]), parseSimple(parts.slice(1).join(' minus ')));
    }
    if (/\s+times\s+/.test(t)) {
        const parts = t.split(/\s+times\s+/);
        return Multiply(...parts.map(parseSimple));
    }

    // Single letter = symbol
    if (/^[a-z]$/.test(t)) return Sym(t);

    // Compound (e.g. "2x", "3x squared") - split number prefix
    const numSymMatch = t.match(/^(\d+)([a-z])$/);
    if (numSymMatch) return Multiply(Num(numSymMatch[1]), Sym(numSymMatch[2]));

    // Fallback: treat as symbol/text sequence
    if (/^[\w\s]+$/.test(t)) {
        const tokens = t.split(/\s+/).map(tok => {
            if (/^\d+$/.test(tok)) return Num(tok);
            if (/^[a-z]$/.test(tok)) return Sym(tok);
            return Sym(tok);
        });
        if (tokens.length === 1) return tokens[0];
        return Sequence(tokens);
    }

    return Sym(t);
};
