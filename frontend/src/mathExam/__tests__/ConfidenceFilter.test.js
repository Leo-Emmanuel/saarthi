import { describe, test, expect } from 'vitest';
import { filterResult, parseConfirmation } from '../speech/ConfidenceFilter.js';

describe('ConfidenceFilter', () => {
    describe('filterResult', () => {
        test('high confidence result is accepted', () => {
            const result = filterResult('next', 0.95);
            expect(result).toBe('accept');
        });

        test('medium confidence result asks for disambiguation', () => {
            const result = filterResult('next', 0.6);
            expect(result).toBe('disambiguate');
        });

        test('low confidence result is rejected', () => {
            const result = filterResult('next', 0.1);
            expect(result).toBe('reject');
        });

        test('null transcript does not crash when confidence provided', () => {
            expect(() => filterResult(null, 0.1)).not.toThrow();
        });
    });

    describe('parseConfirmation', () => {
        test('yes returns yes', () => {
            expect(parseConfirmation('yes')).toBe('yes');
        });

        test('no returns no', () => {
            expect(parseConfirmation('no')).toBe('no');
        });

        test('confirm returns yes', () => {
            expect(parseConfirmation('confirm')).toBe('yes');
        });

        test('cancel returns no', () => {
            expect(parseConfirmation('cancel')).toBe('no');
        });

        test('unrecognized input returns unclear', () => {
            expect(parseConfirmation('maybe')).toBe('unclear');
        });
    });
});
