/**
 * MathSerializer.js
 * Converts MathJSON AST nodes to:
 *  1) LaTeX strings (for KaTeX visual rendering)
 *  2) Brief speech strings (compact verbal form)
 *  3) Detailed speech strings (fully structured, unambiguous)
 */

import { NodeType } from './MathAST.js';

// ─── LaTeX Serializer ─────────────────────────────────────────────────────────

export const toLatex = (node) => {
    if (!node) return '';
    if (node.type === 'Empty') return '\\square';

    switch (node.type) {
        case NodeType.NUMBER:
            return node.value;

        case NodeType.SYMBOL:
            return node.name;

        case NodeType.FRACTION:
            return `\\frac{${toLatex(node.numerator)}}{${toLatex(node.denominator)}}`;

        case NodeType.POWER:
            return `{${toLatex(node.base)}}^{${toLatex(node.exponent)}}`;

        case NodeType.SUBSCRIPT:
            return `{${toLatex(node.base)}}_{${toLatex(node.sub)}}`;

        case NodeType.ROOT: {
            const idx = node.index?.value;
            if (!idx || idx === '2') return `\\sqrt{${toLatex(node.radicand)}}`;
            return `\\sqrt[${toLatex(node.index)}]{${toLatex(node.radicand)}}`;
        }

        case NodeType.BRACKETS: {
            const delims = { round: ['(', ')'], square: ['[', ']'], curly: ['\\{', '\\}'] };
            const [open, close] = delims[node.kind] || delims.round;
            return `\\left${open}${toLatex(node.inner)}\\right${close}`;
        }

        case NodeType.EQUATION: {
            const relMap = { '=': '=', '<': '<', '>': '>', '<=': '\\leq', '>=': '\\geq', 'neq': '\\neq' };
            return `${toLatex(node.left)} ${relMap[node.relation] || '='} ${toLatex(node.right)}`;
        }

        case NodeType.INTEGRAL: {
            const limits = node.lower && node.upper
                ? `_{${toLatex(node.lower)}}^{${toLatex(node.upper)}}`
                : '';
            return `\\int${limits} ${toLatex(node.integrand)} \\, d${toLatex(node.variable)}`;
        }

        case NodeType.DERIVATIVE: {
            if (node.order === 1) {
                return `\\frac{d}{d${toLatex(node.variable)}} \\left(${toLatex(node.expr)}\\right)`;
            }
            return `\\frac{d^{${node.order}}}{d${toLatex(node.variable)}^{${node.order}}} \\left(${toLatex(node.expr)}\\right)`;
        }

        case NodeType.SUM:
            return `\\sum_{${toLatex(node.variable)}=${toLatex(node.lower)}}^{${toLatex(node.upper)}} ${toLatex(node.term)}`;

        case NodeType.PRODUCT:
            return `\\prod_{${toLatex(node.variable)}=${toLatex(node.lower)}}^{${toLatex(node.upper)}} ${toLatex(node.term)}`;

        case NodeType.LOG: {
            if (!node.base) return `\\ln\\left(${toLatex(node.argument)}\\right)`;
            return `\\log_{${toLatex(node.base)}}\\left(${toLatex(node.argument)}\\right)`;
        }

        case NodeType.TRIG: {
            const powerStr = node.power ? `^{${toLatex(node.power)}}` : '';
            return `\\${node.fn}${powerStr}\\left(${toLatex(node.argument)}\\right)`;
        }

        case NodeType.MATRIX: {
            const body = node.cells.map(row =>
                row.map(cell => toLatex(cell)).join(' & ')
            ).join(' \\\\ ');
            return `\\begin{pmatrix}${body}\\end{pmatrix}`;
        }

        case NodeType.ADD:
            return node.terms.map(toLatex).join(' + ');

        case NodeType.SUBTRACT:
            return `${toLatex(node.left)} - ${toLatex(node.right)}`;

        case NodeType.MULTIPLY:
            return node.factors.map(toLatex).join(' \\cdot ');

        case NodeType.NEGATE:
            return `-${toLatex(node.expr)}`;

        case NodeType.SEQUENCE:
            return node.nodes.map(toLatex).join(' ');

        default:
            return '';
    }
};

// ─── Speech Serializers ───────────────────────────────────────────────────────

export const toBriefSpeech = (node) => {
    if (!node) return '';
    if (node.type === 'Empty') return 'blank';

    switch (node.type) {
        case NodeType.NUMBER:
            return node.value;
        case NodeType.SYMBOL:
            return node.name;
        case NodeType.FRACTION:
            return `${toBriefSpeech(node.numerator)} over ${toBriefSpeech(node.denominator)}`;
        case NodeType.POWER:
            if (node.exponent?.value === '2') return `${toBriefSpeech(node.base)} squared`;
            if (node.exponent?.value === '3') return `${toBriefSpeech(node.base)} cubed`;
            return `${toBriefSpeech(node.base)} to the ${toBriefSpeech(node.exponent)}`;
        case NodeType.SUBSCRIPT:
            return `${toBriefSpeech(node.base)} sub ${toBriefSpeech(node.sub)}`;
        case NodeType.ROOT:
            if (!node.index?.value || node.index?.value === '2') return `root of ${toBriefSpeech(node.radicand)}`;
            return `${ordinal(node.index?.value)} root of ${toBriefSpeech(node.radicand)}`;
        case NodeType.BRACKETS:
            return `bracket ${toBriefSpeech(node.inner)} end bracket`;
        case NodeType.EQUATION:
            return `${toBriefSpeech(node.left)} ${node.relation} ${toBriefSpeech(node.right)}`;
        case NodeType.INTEGRAL: {
            const lim = node.lower && node.upper
                ? ` from ${toBriefSpeech(node.lower)} to ${toBriefSpeech(node.upper)}`
                : '';
            return `integral${lim} of ${toBriefSpeech(node.integrand)} d ${toBriefSpeech(node.variable)}`;
        }
        case NodeType.DERIVATIVE:
            return `d by d ${toBriefSpeech(node.variable)} of ${toBriefSpeech(node.expr)}`;
        case NodeType.SUM:
            return `sum ${toBriefSpeech(node.variable)} from ${toBriefSpeech(node.lower)} to ${toBriefSpeech(node.upper)} of ${toBriefSpeech(node.term)}`;
        case NodeType.PRODUCT:
            return `product ${toBriefSpeech(node.variable)} from ${toBriefSpeech(node.lower)} to ${toBriefSpeech(node.upper)} of ${toBriefSpeech(node.term)}`;
        case NodeType.LOG:
            if (!node.base) return `log of ${toBriefSpeech(node.argument)}`;
            return `log base ${toBriefSpeech(node.base)} of ${toBriefSpeech(node.argument)}`;
        case NodeType.TRIG: {
            const power = node.power ? ` squared` : '';
            return `${node.fn}${power} of ${toBriefSpeech(node.argument)}`;
        }
        case NodeType.MATRIX:
            return `${node.rows} by ${node.cols} matrix`;
        case NodeType.ADD:
            return node.terms.map(toBriefSpeech).join(' plus ');
        case NodeType.SUBTRACT:
            return `${toBriefSpeech(node.left)} minus ${toBriefSpeech(node.right)}`;
        case NodeType.MULTIPLY:
            return node.factors.map(toBriefSpeech).join(' times ');
        case NodeType.NEGATE:
            return `negative ${toBriefSpeech(node.expr)}`;
        case NodeType.SEQUENCE:
            return node.nodes.map(toBriefSpeech).join(' ');
        default:
            return '';
    }
};

export const toDetailedSpeech = (node, depth = 0) => {
    if (!node) return '';
    if (node.type === 'Empty') return 'empty placeholder';
    const indent = depth > 0 ? ', ' : '';

    switch (node.type) {
        case NodeType.NUMBER:
            return `the number ${node.value}`;
        case NodeType.SYMBOL:
            return `the variable ${node.name}`;
        case NodeType.FRACTION:
            return `a fraction with numerator: ${toDetailedSpeech(node.numerator, depth + 1)}, and denominator: ${toDetailedSpeech(node.denominator, depth + 1)}`;
        case NodeType.POWER:
            return `${toDetailedSpeech(node.base, depth + 1)} raised to the power of ${toDetailedSpeech(node.exponent, depth + 1)}`;
        case NodeType.SUBSCRIPT:
            return `${toDetailedSpeech(node.base, depth + 1)} with subscript ${toDetailedSpeech(node.sub, depth + 1)}`;
        case NodeType.ROOT: {
            const idx = node.index?.value || '2';
            const name = idx === '2' ? 'square' : idx === '3' ? 'cube' : `${idx}th`;
            return `the ${name} root of ${toDetailedSpeech(node.radicand, depth + 1)}`;
        }
        case NodeType.BRACKETS:
            return `open ${node.kind} bracket, containing: ${toDetailedSpeech(node.inner, depth + 1)}, close ${node.kind} bracket`;
        case NodeType.EQUATION:
            return `equation: left side is ${toDetailedSpeech(node.left, depth + 1)}, relation is ${relationWord(node.relation)}, right side is ${toDetailedSpeech(node.right, depth + 1)}`;
        case NodeType.INTEGRAL: {
            const lim = node.lower && node.upper
                ? `, with lower limit ${toDetailedSpeech(node.lower, depth + 1)} and upper limit ${toDetailedSpeech(node.upper, depth + 1)},`
                : ', indefinite,';
            return `definite integral${lim} of ${toDetailedSpeech(node.integrand, depth + 1)}, with respect to ${toDetailedSpeech(node.variable, depth + 1)}`;
        }
        case NodeType.DERIVATIVE: {
            const ord = node.order > 1 ? `${ordinal(node.order)} ` : '';
            return `the ${ord}derivative of ${toDetailedSpeech(node.expr, depth + 1)}, with respect to ${toDetailedSpeech(node.variable, depth + 1)}`;
        }
        case NodeType.SUM:
            return `summation where ${toDetailedSpeech(node.variable, depth + 1)} runs from ${toDetailedSpeech(node.lower, depth + 1)} to ${toDetailedSpeech(node.upper, depth + 1)}, of the term: ${toDetailedSpeech(node.term, depth + 1)}`;
        case NodeType.PRODUCT:
            return `product where ${toDetailedSpeech(node.variable, depth + 1)} runs from ${toDetailedSpeech(node.lower, depth + 1)} to ${toDetailedSpeech(node.upper, depth + 1)}, of the term: ${toDetailedSpeech(node.term, depth + 1)}`;
        case NodeType.LOG:
            if (!node.base) return `the natural logarithm of ${toDetailedSpeech(node.argument, depth + 1)}`;
            return `logarithm base ${toDetailedSpeech(node.base, depth + 1)}, of ${toDetailedSpeech(node.argument, depth + 1)}`;
        case NodeType.TRIG: {
            const power = node.power ? ` to the power of ${toDetailedSpeech(node.power, depth + 1)}` : '';
            return `${node.fn}${power}, of ${toDetailedSpeech(node.argument, depth + 1)}`;
        }
        case NodeType.MATRIX: {
            let result = `a ${node.rows} by ${node.cols} matrix. `;
            for (let r = 0; r < node.rows; r++) {
                result += `Row ${r + 1}: `;
                for (let c = 0; c < node.cols; c++) {
                    result += `column ${c + 1} is ${toDetailedSpeech(node.cells[r][c], depth + 1)}${c < node.cols - 1 ? ', ' : '. '}`;
                }
            }
            return result;
        }
        case NodeType.ADD:
            return `the sum of: ${node.terms.map((t, i) => `term ${i + 1}: ${toDetailedSpeech(t, depth + 1)}`).join(', plus ')}`;
        case NodeType.SUBTRACT:
            return `${toDetailedSpeech(node.left, depth + 1)}, minus, ${toDetailedSpeech(node.right, depth + 1)}`;
        case NodeType.MULTIPLY:
            return `the product of: ${node.factors.map((f, i) => `factor ${i + 1}: ${toDetailedSpeech(f, depth + 1)}`).join(', times ')}`;
        case NodeType.NEGATE:
            return `negative ${toDetailedSpeech(node.expr, depth + 1)}`;
        case NodeType.SEQUENCE:
            return node.nodes.map((n, i) => `part ${i + 1}: ${toDetailedSpeech(n, depth + 1)}`).join('. ');
        default:
            return '';
    }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ordinal = (n) => {
    const num = parseInt(n);
    if (num === 2) return 'second';
    if (num === 3) return 'third';
    if (num === 4) return 'fourth';
    return `${num}th`;
};

const relationWord = (rel) => {
    const map = { '=': 'equals', '<': 'is less than', '>': 'is greater than', '<=': 'is less than or equal to', '>=': 'is greater than or equal to', 'neq': 'is not equal to' };
    return map[rel] || 'equals';
};
