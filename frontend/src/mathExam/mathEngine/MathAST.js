/**
 * MathAST.js
 * MathJSON-compatible Abstract Syntax Tree definitions.
 * This is the SINGLE SOURCE OF TRUTH for all mathematical expressions.
 * LaTeX is only ever generated FROM this AST for visual rendering.
 */

// ─── Node Types ──────────────────────────────────────────────────────────────

export const NodeType = {
    NUMBER: 'Number',
    SYMBOL: 'Symbol',
    FRACTION: 'Fraction',
    POWER: 'Power',
    SUBSCRIPT: 'Subscript',
    ROOT: 'Root',
    BRACKETS: 'Brackets',
    EQUATION: 'Equation',
    INTEGRAL: 'Integral',
    DERIVATIVE: 'Derivative',
    SUM: 'Sum',
    PRODUCT: 'Product',
    LOG: 'Log',
    TRIG: 'Trig',
    MATRIX: 'Matrix',
    ADD: 'Add',
    SUBTRACT: 'Subtract',
    MULTIPLY: 'Multiply',
    NEGATE: 'Negate',
    SEQUENCE: 'Sequence',       // linear chain of terms
    ALIGNED_STEPS: 'AlignedSteps',
};

// ─── Factory Functions ────────────────────────────────────────────────────────

export const Num = (value) => ({ type: NodeType.NUMBER, value: String(value) });
export const Sym = (name) => ({ type: NodeType.SYMBOL, name });

export const Fraction = (numerator, denominator) => ({
    type: NodeType.FRACTION,
    numerator,
    denominator,
});

export const Power = (base, exponent) => ({
    type: NodeType.POWER,
    base,
    exponent,
});

export const Subscript = (base, sub) => ({
    type: NodeType.SUBSCRIPT,
    base,
    sub,
});

export const Root = (radicand, index = 2) => ({
    type: NodeType.ROOT,
    radicand,
    index: typeof index === 'number' ? Num(index) : index,
});

export const Brackets = (inner, kind = 'round') => ({
    type: NodeType.BRACKETS,
    inner,
    kind, // 'round' | 'square' | 'curly'
});

export const Equation = (left, right, relation = '=') => ({
    type: NodeType.EQUATION,
    left,
    right,
    relation, // '=' | '<' | '>' | '<=' | '>=' | 'neq'
});

export const Integral = (integrand, variable, lower = null, upper = null) => ({
    type: NodeType.INTEGRAL,
    integrand,
    variable,
    lower,
    upper,
});

export const Derivative = (expr, variable, order = 1) => ({
    type: NodeType.DERIVATIVE,
    expr,
    variable,
    order,
});

export const Summation = (term, variable, lower, upper) => ({
    type: NodeType.SUM,
    term,
    variable,
    lower,
    upper,
});

export const Product = (term, variable, lower, upper) => ({
    type: NodeType.PRODUCT,
    term,
    variable,
    lower,
    upper,
});

export const Log = (argument, base = null) => ({
    type: NodeType.LOG,
    argument,
    base, // null = natural log (ln)
});

export const Trig = (fn, argument, power = null) => ({
    type: NodeType.TRIG,
    fn, // 'sin' | 'cos' | 'tan' | 'sec' | 'csc' | 'cot' | 'arcsin' | 'arccos' | 'arctan'
    argument,
    power,
});

export const Matrix = (rows, cols, cells) => ({
    type: NodeType.MATRIX,
    rows,
    cols,
    cells, // 2D array: cells[r][c] = ASTNode
});

export const Add = (...terms) => ({ type: NodeType.ADD, terms });
export const Subtract = (left, right) => ({ type: NodeType.SUBTRACT, left, right });
export const Multiply = (...factors) => ({ type: NodeType.MULTIPLY, factors });
export const Negate = (expr) => ({ type: NodeType.NEGATE, expr });

export const Sequence = (nodes) => ({ type: NodeType.SEQUENCE, nodes });

export const AlignedSteps = (steps) => ({
    type: NodeType.ALIGNED_STEPS,
    steps, // Array of { id, ast, timestamp }
});

// ─── Empty / Placeholder ─────────────────────────────────────────────────────

export const EMPTY = { type: 'Empty' };
export const isEmptyNode = (node) => !node || node.type === 'Empty';

// ─── Deep Clone ──────────────────────────────────────────────────────────────

export const cloneAST = (node) => {
    if (!node) return null;
    return JSON.parse(JSON.stringify(node));
};

// ─── Children Accessor ───────────────────────────────────────────────────────
// Returns named child slots for navigation

export const getChildren = (node) => {
    if (!node) return {};
    switch (node.type) {
        case NodeType.FRACTION:
            return { numerator: node.numerator, denominator: node.denominator };
        case NodeType.POWER:
            return { base: node.base, exponent: node.exponent };
        case NodeType.SUBSCRIPT:
            return { base: node.base, sub: node.sub };
        case NodeType.ROOT:
            return { radicand: node.radicand, index: node.index };
        case NodeType.BRACKETS:
            return { inner: node.inner };
        case NodeType.EQUATION:
            return { left: node.left, right: node.right };
        case NodeType.INTEGRAL:
            return { integrand: node.integrand, variable: node.variable, lower: node.lower, upper: node.upper };
        case NodeType.DERIVATIVE:
            return { expr: node.expr, variable: node.variable };
        case NodeType.SUM:
        case NodeType.PRODUCT:
            return { term: node.term, lower: node.lower, upper: node.upper };
        case NodeType.LOG:
            return { argument: node.argument, ...(node.base ? { base: node.base } : {}) };
        case NodeType.TRIG:
            return { argument: node.argument };
        case NodeType.ADD:
            return node.terms.reduce((acc, t, i) => ({ ...acc, [`term_${i}`]: t }), {});
        case NodeType.MULTIPLY:
            return node.factors.reduce((acc, f, i) => ({ ...acc, [`factor_${i}`]: f }), {});
        case NodeType.SEQUENCE:
            return node.nodes.reduce((acc, n, i) => ({ ...acc, [`node_${i}`]: n }), {});
        default:
            return {};
    }
};
