import { describe, test, expect } from 'vitest';
import { parseCommand, parseMathDictation, CMD } from '../mathEngine/CommandParser.js';

describe('CommandParser', () => {
    describe('parseCommand - navigation/style commands', () => {
        test('move left returns MOVE_LEFT type', () => {
            expect(parseCommand('move left').type).toBe(CMD.MOVE_LEFT);
        });

        test('move right returns MOVE_RIGHT type', () => {
            expect(parseCommand('move right').type).toBe(CMD.MOVE_RIGHT);
        });

        test('go to step 3 returns GO_TO_STEP with parsed payload', () => {
            const result = parseCommand('go to step 3');
            expect(result.type).toBe(CMD.GO_TO_STEP);
            expect(result.payload.stepNumber).toBe(3);
        });

        test('go to row 2 column 4 falls back to MATH_INPUT', () => {
            const result = parseCommand('go to row 2 column 4');
            expect(result.type).toBe(CMD.MATH_INPUT);
            expect(result.payload).toEqual({ text: 'go to row 2 column 4' });
        });
    });

    describe('parseCommand - exam/actions', () => {
        test('submit paper returns SUBMIT_PAPER type', () => {
            expect(parseCommand('submit paper').type).toBe(CMD.SUBMIT_PAPER);
        });

        test('review all answers returns REVIEW_ANSWERS type', () => {
            expect(parseCommand('review all answers').type).toBe(CMD.REVIEW_ANSWERS);
        });

        test('undo returns UNDO type', () => {
            expect(parseCommand('undo').type).toBe(CMD.UNDO);
        });
    });

    describe('parseCommand - help command', () => {
        test('help returns HELP type', () => {
            expect(parseCommand('help').type).toBe(CMD.HELP);
        });

        test('show help returns HELP type', () => {
            expect(parseCommand('show help').type).toBe(CMD.HELP);
        });
    });

    describe('parseCommand - fallback behavior', () => {
        test('unknown input returns MATH_INPUT with raw payload text', () => {
            const result = parseCommand('xyzzy nonsense');
            expect(result.type).toBe(CMD.MATH_INPUT);
            expect(result.payload.text).toBe('xyzzy nonsense');
        });
    });

    describe('parseMathDictation', () => {
        test('x squared returns POWER AST', () => {
            const result = parseMathDictation('x squared');
            expect(result.type).toBe('Power');
        });

        test('x over y returns FRACTION AST', () => {
            const result = parseMathDictation('x over y');
            expect(result.type).toBe('Fraction');
        });
    });
});
