import { describe, it, expect } from 'vitest';
import { mathSpeechToNotation } from '../mathSpeechToNotation.js';

describe('basic arithmetic', () => {
    it('x squared', () => expect(mathSpeechToNotation('x squared').latex).toBe('x^{2}'));
    it('x cubed', () => expect(mathSpeechToNotation('x cubed').latex).toBe('x^{3}'));
    it('one half', () => expect(mathSpeechToNotation('one half').latex).toBe('\\frac{1}{2}'));
    it('square root of x', () => expect(mathSpeechToNotation('square root of x').latex).toBe('\\sqrt{x}'));
    it('x squared + 3x - 5 = 0', () => {
        const { latex } = mathSpeechToNotation('x squared plus 3 x minus 5 equals 0');
        expect(latex).toContain('x^{2}');
        expect(latex).toContain('= 0');
    });
});

describe('negative exponent regression (BUG 5 fix)', () => {
    it('no space inserted in {-2}', () => {
        const { latex } = mathSpeechToNotation('x to the power negative 2');
        expect(latex).not.toMatch(/\{\s+-/);
    });
});

describe('calculus', () => {
    it('integral dx (no space)', () => {
        const { latex } = mathSpeechToNotation('integral of x squared dx');
        expect(latex).toContain('\\int');
        expect(latex).toContain('x^{2}');
        // Should also have correct d notation
    });
    it('integral d x (space)', () => {
        expect(mathSpeechToNotation('integral of x squared d x').latex).toContain('\\int');
    });
    it('definite integral', () => {
        expect(mathSpeechToNotation('integral from 0 to 1 of x squared dx').latex)
            .toContain('\\int_{0}^{1}');
    });
    it('d delimiter regex does not match word internals (Gap 4 test)', () => {
        expect(mathSpeechToNotation('derivative of distance').latex).not.toMatch(/\\,d/);
        expect(mathSpeechToNotation('integral of x dx').latex).toMatch(/\\,\s*d/);
        expect(mathSpeechToNotation('integral of x d x').latex).toMatch(/\\,\s*d/);
    });
});

describe('new expansion rules', () => {
    it('absolute value', () => {
        expect(mathSpeechToNotation('absolute value of x').latex).toContain('\\left| x \\right|');
    });
    it('absolute value of x plus 2', () => {
        // Gap 1 test
        expect(mathSpeechToNotation('absolute value of x plus 2').latex).toContain('\\left| x + 2 \\right|');
    });
    it('floor', () => {
        expect(mathSpeechToNotation('floor of x').latex).toContain('\\lfloor');
    });
    it('n choose k', () => {
        expect(mathSpeechToNotation('n choose k').latex).toContain('\\binom{n}{k}');
    });
    it('5 choose 2', () => {
        expect(mathSpeechToNotation('5 choose 2').latex).toBe('\\binom{5}{2}');
    });
    it('partial derivative', () => {
        expect(mathSpeechToNotation('partial f partial x').latex).toContain('\\partial');
    });
    it('e to the x', () => {
        expect(mathSpeechToNotation('e to the x').latex).toContain('e^{x}');
    });
    it('natural log', () => {
        expect(mathSpeechToNotation('natural log of x').latex).toContain('\\ln');
    });
});

describe('disambiguation regression — "by" must not become fraction', () => {
    it('"x by y" does NOT produce \\frac', () => {
        expect(mathSpeechToNotation('x by y').latex).not.toContain('\\frac');
    });
    it('"x over y" still produces \\frac', () => {
        expect(mathSpeechToNotation('x over y').latex).toContain('\\frac{x}{y}');
    });
});

describe('additional coverage for reported gaps', () => {
    test('square root of quantity x plus 1 end quantity', () => {
        const r = mathSpeechToNotation('square root of quantity x plus 1 end quantity');
        expect(r.hasLatex).toBe(true);
        expect(r.display).toContain('\\sqrt{');
        expect(r.display).not.toContain('of (');
    });

    test('strips leading "the" before limit', () => {
        const r = mathSpeechToNotation('the limit as x approaches infinity of 1 over x');
        expect(r.display).not.toContain('the \\lim');
        expect(r.display).toContain('\\lim');
    });

    test('fraction with numerator and denominator', () => {
        const r = mathSpeechToNotation('fraction with numerator x plus 1 and denominator x minus 1');
        expect(r.hasLatex).toBe(true);
        expect(r.display).toContain('\\frac');
    });

    test('derivative of x squared has correct scope', () => {
        const r = mathSpeechToNotation('derivative of x squared');
        expect(r.display).toContain('\\frac{d}{dx}');
        expect(r.display).not.toBe('$\\frac{d}{dx}[x]^{2}$');
    });

    test('sine of x plus cosine of x', () => {
        const r = mathSpeechToNotation('sine of x plus cosine of x');
        expect(r.hasLatex).toBe(true);
        expect(r.display).toContain('\\sin');
        expect(r.display).toContain('\\cos');
    });

    test('log base 2 of 8', () => {
        const r = mathSpeechToNotation('log base 2 of 8');
        expect(r.hasLatex).toBe(true);
        expect(r.display).toContain('\\log_{2}');
    });

    test('2 times x plus 3 equals 7', () => {
        const r = mathSpeechToNotation('2 times x plus 3 equals 7');
        expect(r.hasLatex).toBe(true);
        expect(r.display).toContain('=');
    });

    test('x to the power of 3', () => {
        const r = mathSpeechToNotation('x to the power of 3');
        expect(r.display).toContain('^{3}');
    });
});
