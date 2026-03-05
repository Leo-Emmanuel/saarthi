/**
 * MathNavigator.js
 * AST-aware cursor navigation for the voice math editor.
 * The cursor is: { stepIndex: number, path: string[] }
 * where path is an array of child slot names to reach the current node.
 *
 * Navigation is purely structural — no string scanning.
 */

import { NodeType, getChildren } from './MathAST.js';

// ─── Get node at a given path ─────────────────────────────────────────────────

export const getNodeAtPath = (ast, path) => {
    let current = ast;
    for (const key of path) {
        if (!current) return null;
        const children = getChildren(current);
        current = children[key];
    }
    return current;
};

// ─── Set node at a given path (immutable via deep clone done at slice level) ─

export const setNodeAtPath = (ast, path, newNode) => {
    if (path.length === 0) return newNode;
    const [head, ...tail] = path;
    const result = { ...ast };
    // Walk and rebuild the parent chain immutably
    if (tail.length === 0) {
        // Directly assign child
        return rebuildWithChild(result, head, newNode);
    } else {
        const children = getChildren(result);
        const child = children[head];
        const updatedChild = setNodeAtPath(child, tail, newNode);
        return rebuildWithChild(result, head, updatedChild);
    }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rebuildWithChild = (node, key, newChild) => {
    switch (node.type) {
        case NodeType.FRACTION:
            if (key === 'numerator') return { ...node, numerator: newChild };
            if (key === 'denominator') return { ...node, denominator: newChild };
            break;
        case NodeType.POWER:
            if (key === 'base') return { ...node, base: newChild };
            if (key === 'exponent') return { ...node, exponent: newChild };
            break;
        case NodeType.SUBSCRIPT:
            if (key === 'base') return { ...node, base: newChild };
            if (key === 'sub') return { ...node, sub: newChild };
            break;
        case NodeType.ROOT:
            if (key === 'radicand') return { ...node, radicand: newChild };
            if (key === 'index') return { ...node, index: newChild };
            break;
        case NodeType.BRACKETS:
            return { ...node, inner: newChild };
        case NodeType.EQUATION:
            if (key === 'left') return { ...node, left: newChild };
            if (key === 'right') return { ...node, right: newChild };
            break;
        case NodeType.INTEGRAL:
            if (key === 'integrand') return { ...node, integrand: newChild };
            if (key === 'variable') return { ...node, variable: newChild };
            if (key === 'lower') return { ...node, lower: newChild };
            if (key === 'upper') return { ...node, upper: newChild };
            break;
        case NodeType.DERIVATIVE:
            if (key === 'expr') return { ...node, expr: newChild };
            if (key === 'variable') return { ...node, variable: newChild };
            break;
        case NodeType.SUM:
        case NodeType.PRODUCT:
            if (key === 'term') return { ...node, term: newChild };
            if (key === 'lower') return { ...node, lower: newChild };
            if (key === 'upper') return { ...node, upper: newChild };
            break;
        case NodeType.LOG:
            if (key === 'argument') return { ...node, argument: newChild };
            if (key === 'base') return { ...node, base: newChild };
            break;
        case NodeType.TRIG:
            if (key === 'argument') return { ...node, argument: newChild };
            if (key === 'power') return { ...node, power: newChild };
            break;
        case NodeType.ADD: {
            const idx = parseInt(key.replace('term_', ''));
            const newTerms = [...node.terms];
            newTerms[idx] = newChild;
            return { ...node, terms: newTerms };
        }
        case NodeType.MULTIPLY: {
            const idx = parseInt(key.replace('factor_', ''));
            const newFactors = [...node.factors];
            newFactors[idx] = newChild;
            return { ...node, factors: newFactors };
        }
        case NodeType.SEQUENCE: {
            const idx = parseInt(key.replace('node_', ''));
            const newNodes = [...node.nodes];
            newNodes[idx] = newChild;
            return { ...node, nodes: newNodes };
        }
        default:
            break;
    }
    return node;
};

// ─── Navigation Commands ──────────────────────────────────────────────────────
// Each returns a new path, or the same path if navigation is not possible.

/**
 * Enter the first child slot of the current node.
 */
export const navigateInto = (ast, path) => {
    const node = getNodeAtPath(ast, path);
    if (!node) return path;
    const children = Object.keys(getChildren(node));
    if (children.length === 0) return path;
    return [...path, children[0]];
};

/**
 * Exit to the parent.
 */
export const navigateOut = (path) => {
    if (path.length === 0) return path;
    return path.slice(0, -1);
};

/**
 * Move to a specific named child slot (e.g. 'numerator', 'denominator')
 */
export const navigateTo = (ast, path, slot) => {
    const node = getNodeAtPath(ast, path);
    if (!node) return path;
    const children = getChildren(node);
    if (children[slot] !== undefined) return [...path, slot];
    return path;
};

/**
 * Navigate to the next sibling slot within the same parent.
 */
export const navigateNextSibling = (ast, path) => {
    if (path.length === 0) return path;
    const parentPath = path.slice(0, -1);
    const currentKey = path[path.length - 1];
    const parent = getNodeAtPath(ast, parentPath);
    if (!parent) return path;
    const siblings = Object.keys(getChildren(parent));
    const idx = siblings.indexOf(currentKey);
    if (idx < 0 || idx >= siblings.length - 1) return path;
    return [...parentPath, siblings[idx + 1]];
};

/**
 * Navigate to the previous sibling slot.
 */
export const navigatePrevSibling = (ast, path) => {
    if (path.length === 0) return path;
    const parentPath = path.slice(0, -1);
    const currentKey = path[path.length - 1];
    const parent = getNodeAtPath(ast, parentPath);
    if (!parent) return path;
    const siblings = Object.keys(getChildren(parent));
    const idx = siblings.indexOf(currentKey);
    if (idx <= 0) return path;
    return [...parentPath, siblings[idx - 1]];
};

/**
 * Describe the current position in plain English (for audio feedback).
 */
export const describePath = (ast, path) => {
    if (path.length === 0) return 'at the root of the expression';
    const parts = [];
    let current = ast;
    for (const key of path) {
        const children = getChildren(current);
        current = children[key];
        parts.push(slotLabel(key));
    }
    return `at ${parts.join(', inside ')}`;
};

const slotLabel = (key) => {
    const labels = {
        numerator: 'the numerator',
        denominator: 'the denominator',
        base: 'the base',
        exponent: 'the exponent',
        sub: 'the subscript',
        radicand: 'the radicand',
        index: 'the index',
        inner: 'inside the brackets',
        left: 'the left side',
        right: 'the right side',
        integrand: 'the integrand',
        variable: 'the integration variable',
        lower: 'the lower limit',
        upper: 'the upper limit',
        expr: 'the expression',
        argument: 'the argument',
    };
    if (labels[key]) return labels[key];
    // term_0, factor_1, node_2, etc.
    const match = key.match(/^(term|factor|node)_(\d+)$/);
    if (match) {
        const typeMap = { term: 'term', factor: 'factor', node: 'part' };
        return `${typeMap[match[1]]} ${parseInt(match[2]) + 1}`;
    }
    return key;
};

/**
 * Navigate to a specific matrix cell.
 */
export const navigateToMatrixCell = (ast, path, row, col) => {
    const node = getNodeAtPath(ast, path);
    if (!node || node.type !== NodeType.MATRIX) return path;
    if (row < 0 || row >= node.rows || col < 0 || col >= node.cols) return path;
    // Matrix cells accessed as matrixCell_r_c
    return [...path, `cell_${row}_${col}`];
};
