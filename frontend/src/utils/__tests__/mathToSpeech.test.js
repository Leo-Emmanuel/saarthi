import { describe, test, expect } from 'vitest';
import { mathToSpeech } from '../mathToSpeech';

describe('mathToSpeech', () => {
    test('converts x squared notation', () => {
        expect(mathToSpeech('x²')).toContain('x squared');
    });

    test('converts x cubed notation', () => {
        expect(mathToSpeech('x³')).toContain('x cubed');
    });

    test('converts x^2 caret notation to squared', () => {
        expect(mathToSpeech('x^2')).toContain('x squared');
    });

    test('converts x^3 caret notation to cubed', () => {
        expect(mathToSpeech('x^3')).toContain('x cubed');
    });

    test('converts x^{2} LaTeX caret to squared', () => {
        expect(mathToSpeech('x^{2}')).toContain('x squared');
    });

    test('implicit multiplication adds times for coefficient-variable', () => {
        expect(mathToSpeech('2x')).toBe('2 times x');
    });

    test('standalone x in text is not affected', () => {
        const result = mathToSpeech('Solve for x: 2x^2 - 5x - 3 = 0');
        expect(result).not.toContain('for times x');
        expect(result).toContain('2 times x squared');
    });

    test('converts unicode minus to word', () => {
        expect(mathToSpeech('a − b')).toContain('minus');
    });

    test('plain hyphen minus converted to word', () => {
        expect(mathToSpeech('5x - 3')).toContain('minus');
    });

    test('converts equals sign to word', () => {
        expect(mathToSpeech('x = 5')).toContain('equals');
    });

    test('converts pi symbol', () => {
        expect(mathToSpeech('2π')).toContain('pi');
    });

    test('converts infinity symbol', () => {
        expect(mathToSpeech('x → ∞')).toContain('infinity');
    });

    test('converts full quadratic equation correctly', () => {
        const result = mathToSpeech('2x² − 5x − 3 = 0');
        expect(result).toBe('2 times x squared minus 5 times x minus 3 equals 0');
    });

    test('full quadratic spoken clearly', () => {
        const result = mathToSpeech('2x^2 - 5x - 3 = 0');
        expect(result).toBe('2 times x squared minus 5 times x minus 3 equals 0');
    });

    test('null input returns empty string', () => {
        expect(mathToSpeech(null)).toBe('');
    });

    test('plain text passes through unchanged', () => {
        expect(mathToSpeech('What is the capital of France')).toBe('What is the capital of France');
    });
});
