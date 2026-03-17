import { describe, test, expect } from 'vitest';
import { navigateTo, navigateNextSibling, navigatePrevSibling, navigateOut, getNodeAtPath } from '../mathEngine/MathNavigator.js';

describe('MathNavigator', () => {
    const sampleAST = {
        type: 'Fraction',
        numerator: { type: 'Number', value: '1' },
        denominator: { type: 'Number', value: '2' },
    };

    test('getNodeAtPath with valid path returns node', () => {
        const result = getNodeAtPath(sampleAST, ['numerator']);
        expect(result).toBeDefined();
        expect(result.value).toBe('1');
    });

    test('navigateTo with null AST does not crash and returns same path', () => {
        const path = ['numerator'];
        expect(() => navigateTo(null, path, 'numerator')).not.toThrow();
        expect(navigateTo(null, path, 'numerator')).toEqual(path);
    });

    test('navigateTo with invalid deep path does not crash', () => {
        const path = ['nonexistent', 'deep', 'path'];
        expect(() => navigateTo(sampleAST, path, 'numerator')).not.toThrow();
        expect(navigateTo(sampleAST, path, 'numerator')).toEqual(path);
    });

    test('navigateNextSibling with bad AST input does not crash', () => {
        expect(() => navigateNextSibling(null, ['numerator'])).not.toThrow();
    });

    test('navigatePrevSibling with bad AST input does not crash', () => {
        expect(() => navigatePrevSibling(null, ['denominator'])).not.toThrow();
    });

    test('navigateOut with empty path does not crash and returns empty path', () => {
        expect(() => navigateOut([])).not.toThrow();
        expect(navigateOut([])).toEqual([]);
    });
});
