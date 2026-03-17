import { describe, test, expect } from 'vitest';
import { toLatex, toBriefSpeech, toDetailedSpeech } from '../mathEngine/MathSerializer.js';

describe('MathSerializer', () => {
    describe('toLatex', () => {
        test('empty node returns square placeholder', () => {
            expect(toLatex({ type: 'Empty' })).toBe('\\square');
        });

        test('number node returns value', () => {
            expect(toLatex({ type: 'Number', value: '42' })).toBe('42');
        });

        test('null input returns empty string', () => {
            expect(toLatex(null)).toBe('');
        });
    });

    describe('toBriefSpeech', () => {
        test('null input returns empty string', () => {
            expect(toBriefSpeech(null)).toBe('');
        });

        test('empty node returns spoken placeholder text', () => {
            const result = toBriefSpeech({ type: 'Empty' });
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('toDetailedSpeech', () => {
        test('null input returns empty string', () => {
            expect(toDetailedSpeech(null)).toBe('');
        });

        test('returns string for valid node', () => {
            const result = toDetailedSpeech({ type: 'Number', value: '5' });
            expect(typeof result).toBe('string');
            expect(result).toContain('5');
        });
    });

    describe('TRIG exponent speech fix', () => {
        test('trig node with power 2 says squared', () => {
            const node = {
                type: 'Trig',
                fn: 'sin',
                argument: { type: 'Number', value: 'x' },
                power: { type: 'Number', value: '2' },
            };
            const speech = toBriefSpeech(node);
            expect(speech).toContain('squared');
        });

        test('trig node with power 3 says to the power 3 and not squared', () => {
            const node = {
                type: 'Trig',
                fn: 'sin',
                argument: { type: 'Number', value: 'x' },
                power: { type: 'Number', value: '3' },
            };
            const speech = toBriefSpeech(node);
            expect(speech).not.toContain('squared');
            expect(speech).toContain('3');
        });
    });
});
