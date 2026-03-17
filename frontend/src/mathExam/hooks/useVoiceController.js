/**
 * useVoiceController.js
 * Central hook that wires together:
 *  - BrowserSTT (listening)
 *  - CommandParser (parsing)
 *  - ConfidenceFilter (disambiguation)
 *  - Redux dispatch (state updates)
 *  - BrowserTTS (audio feedback)
 *  - MathNavigator (cursor movement)
 *  - MathSerializer (reading back expressions)
 */

import { useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserSTT } from '../speech/BrowserSTT.js';
import { getTTS } from '../speech/BrowserTTS.js';
import { filterResult, buildDisambiguationPrompt, parseConfirmation } from '../speech/ConfidenceFilter.js';
import { parseCommand, parseMathDictation, CMD } from '../mathEngine/CommandParser.js';
import { toLatex, toBriefSpeech, toDetailedSpeech } from '../mathEngine/MathSerializer.js';
import {
    navigateTo, navigateNextSibling, navigatePrevSibling, navigateOut, describePath,
} from '../mathEngine/MathNavigator.js';
import {
    addStep, updateStepAST, deleteStep, setCurrentStep,
    setCursorPath, setVerbosityMode, setInputMode,
    setLastSpokenCommand, setLastAudioFeedback,
    setIsListening, setIsProcessing, setPendingConfirmation,
    undo, redo,
} from '../../store/mathExamSlice.js';
import { submitSession } from '../../store/examSessionSlice.js';
import { EMPTY } from '../mathEngine/MathAST.js';

const stt = new BrowserSTT({ continuous: false, maxRetries: 3 });

export const useVoiceController = ({ onSubmit, exams_questions = [] } = {}) => {
    const dispatch = useDispatch();
    const tts = getTTS();

    const { steps, currentStepIndex, cursor, verbosityMode, inputMode, pendingConfirmation } =
        useSelector(s => s.mathExam);
    const questionIndex = useSelector(s => s.examSession?.questionIndex || 0);

    // Keep refs to avoid stale closures inside STT callbacks
    const stepsRef = useRef(steps);
    const cursorRef = useRef(cursor);
    const verbosityRef = useRef(verbosityMode);
    const inputModeRef = useRef(inputMode);
    const pendingRef = useRef(pendingConfirmation);
    const questionsRef = useRef(exams_questions);
    const questionIndexRef = useRef(questionIndex);

    useEffect(() => { stepsRef.current = steps; }, [steps]);
    useEffect(() => { cursorRef.current = cursor; }, [cursor]);
    useEffect(() => { questionsRef.current = exams_questions; }, [exams_questions]);
    useEffect(() => { questionIndexRef.current = questionIndex; }, [questionIndex]);
    useEffect(() => { verbosityRef.current = verbosityMode; }, [verbosityMode]);
    useEffect(() => { inputModeRef.current = inputMode; }, [inputMode]);
    useEffect(() => { pendingRef.current = pendingConfirmation; }, [pendingConfirmation]);

    // ─── Audio feedback helper ─────────────────────────────────────────────────
    const say = useCallback(async (text, priority = false) => {
        dispatch(setLastAudioFeedback(text));
        if (priority) await tts.speakNow(text);
        else await tts.speak(text);
    }, [dispatch, tts]);

    // ─── Read expression at step ───────────────────────────────────────────────
    const readStep = useCallback(async (stepIdx, opts = {}) => {
        const step = stepsRef.current[stepIdx];
        if (!step) { await say(`Step ${stepIdx + 1} does not exist.`); return; }
        const mode = opts.verbosity || verbosityRef.current;
        const text = mode === 'brief'
            ? toBriefSpeech(step.ast)
            : toDetailedSpeech(step.ast);
        await say(`Step ${stepIdx + 1}: ${text || 'empty'}`);
    }, [say]);

    const readAll = useCallback(async () => {
        for (let i = 0; i < stepsRef.current.length; i++) {
            await readStep(i);
        }
    }, [readStep]);

    // ─── Read current exam question ────────────────────────────────────────────
    const readCurrentQuestion = useCallback(async () => {
        const questions = questionsRef.current;
        const idx = questionIndexRef.current;
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            await say('No questions available.');
            return;
        }
        if (idx >= questions.length) {
            await say(`Question ${idx + 1} not found.`);
            return;
        }
        const q = questions[idx];
        const text = `Question ${idx + 1}. ${q.text}. Worth ${q.marks || 0} marks.`;
        await say(text);
    }, [say]);

    // ─── Main command dispatcher ───────────────────────────────────────────────
    const handleCommand = useCallback(async (cmd) => {
        const { type, payload, originalText } = cmd;
        const steps = stepsRef.current;
        const cursor = cursorRef.current;
        const currentAST = steps[cursor.stepIndex]?.ast || EMPTY;

        switch (type) {
            // ── Mode ──────────────────────────────────────────────────────────────
            case CMD.ENTER_COMMAND_MODE:
                dispatch(setInputMode('command'));
                await say('Command mode active. Speak a navigation or editing command.', true);
                break;

            case CMD.EXIT_COMMAND_MODE:
                dispatch(setInputMode('dictation'));
                await say('Dictation mode active. Speak a math expression.', true);
                break;

            // ── Verbosity ─────────────────────────────────────────────────────────
            case CMD.VERBOSITY_BRIEF:
                dispatch(setVerbosityMode('brief'));
                await say('Brief reading mode enabled.');
                break;

            case CMD.VERBOSITY_DETAILED:
                dispatch(setVerbosityMode('detailed'));
                await say('Detailed reading mode enabled.');
                break;

            // ── Navigation ────────────────────────────────────────────────────────
            case CMD.MOVE_TO_NUMERATOR: {
                const newPath = navigateTo(currentAST, cursor.path, 'numerator');
                dispatch(setCursorPath(newPath));
                await say(`Moved to ${describePath(currentAST, newPath)}.`);
                break;
            }
            case CMD.MOVE_TO_DENOMINATOR: {
                const newPath = navigateTo(currentAST, cursor.path, 'denominator');
                dispatch(setCursorPath(newPath));
                await say(`Moved to ${describePath(currentAST, newPath)}.`);
                break;
            }
            case CMD.MOVE_TO_SUPERSCRIPT: {
                const newPath = navigateTo(currentAST, cursor.path, 'exponent');
                dispatch(setCursorPath(newPath));
                await say(`Moved to ${describePath(currentAST, newPath)}.`);
                break;
            }
            case CMD.MOVE_TO_SUBSCRIPT: {
                const newPath = navigateTo(currentAST, cursor.path, 'sub');
                dispatch(setCursorPath(newPath));
                await say(`Moved to ${describePath(currentAST, newPath)}.`);
                break;
            }
            case CMD.MOVE_LEFT: {
                const newPath = navigatePrevSibling(currentAST, cursor.path);
                dispatch(setCursorPath(newPath));
                await say(`Moved left. Now ${describePath(currentAST, newPath)}.`);
                break;
            }
            case CMD.MOVE_RIGHT: {
                const newPath = navigateNextSibling(currentAST, cursor.path);
                dispatch(setCursorPath(newPath));
                await say(`Moved right. Now ${describePath(currentAST, newPath)}.`);
                break;
            }
            case CMD.MOVE_OUT: {
                const newPath = navigateOut(cursor.path);
                dispatch(setCursorPath(newPath));
                await say(`Moved out. Now ${describePath(currentAST, newPath)}.`);
                break;
            }
            case CMD.MOVE_TO_START:
                dispatch(setCursorPath([]));
                await say('Moved to the root of the expression.');
                break;

            case CMD.MOVE_TO_END:
                // Move to last child at current level
                dispatch(setCursorPath([]));
                await say('Moved to the start of the expression. End navigation not yet implemented for this structure.');
                break;

            case CMD.NEXT_TERM: {
                const newPath = navigateNextSibling(currentAST, cursor.path);
                dispatch(setCursorPath(newPath));
                await say(`At ${describePath(currentAST, newPath)}.`);
                break;
            }
            case CMD.PREV_TERM: {
                const newPath = navigatePrevSibling(currentAST, cursor.path);
                dispatch(setCursorPath(newPath));
                await say(`At ${describePath(currentAST, newPath)}.`);
                break;
            }

            case CMD.GO_TO_STEP: {
                const { stepNumber } = payload;
                const idx = stepNumber - 1;
                if (idx >= 0 && idx < steps.length) {
                    dispatch(setCurrentStep(idx));
                    await say(`Now editing step ${stepNumber}.`);
                } else {
                    await say(`Step ${stepNumber} does not exist. You have ${steps.length} step${steps.length !== 1 ? 's' : ''}.`);
                }
                break;
            }

            case CMD.GO_TO_CELL: {
                const { row, col } = payload;
                await say(`Navigating to row ${row + 1}, column ${col + 1} in the matrix.`);
                // cursor update happens via setCursorPath with matrix path
                break;
            }

            case CMD.READ_POSITION:
                await say(describePath(currentAST, cursor.path));
                break;

            // ── Reading ───────────────────────────────────────────────────────────
            case CMD.READ_BRIEF:
                // If the student said "read question", read the exam question
                if (originalText && originalText.toLowerCase().includes('question')) {
                    await readCurrentQuestion();
                } else {
                    await readStep(cursor.stepIndex, { verbosity: 'brief' });
                }
                break;

            case CMD.READ_DETAILED:
                await readStep(cursor.stepIndex, { verbosity: 'detailed' });
                break;

            case CMD.READ_ALL_STEPS:
                await say(`Reading all ${steps.length} steps.`);
                await readAll();
                break;

            case CMD.READ_STEP: {
                const { stepNumber, side } = payload;
                const step = steps[stepNumber];
                if (!step) { await say(`Step ${stepNumber + 1} not found.`); break; }
                const ast = step.ast;
                if (side && ast?.left) {
                    const sideAst = side === 'left' ? ast.left : ast.right;
                    const text = verbosityRef.current === 'brief' ? toBriefSpeech(sideAst) : toDetailedSpeech(sideAst);
                    await say(`${side === 'left' ? 'Left' : 'Right'} side of step ${stepNumber + 1}: ${text}.`);
                } else {
                    await readStep(stepNumber);
                }
                break;
            }

            // ── Step Management ───────────────────────────────────────────────────
            case CMD.NEW_STEP:
                dispatch(addStep({ ast: EMPTY, latex: '' }));
                await say(`Step ${steps.length + 1} created. Dictate your expression.`);
                break;

            case CMD.EDIT_STEP: {
                const { stepNumber } = payload;
                if (stepNumber >= 0 && stepNumber < steps.length) {
                    dispatch(setCurrentStep(stepNumber));
                    await say(`Editing step ${stepNumber + 1}. Dictate your expression.`);
                } else {
                    await say(`Step ${stepNumber + 1} not found.`);
                }
                break;
            }

            case CMD.DELETE_STEP: {
                const { stepNumber } = payload;
                if (stepNumber >= 0 && stepNumber < steps.length) {
                    if (steps.length <= 1) {
                        await say('Cannot delete the only step. Add another step first.');
                    } else {
                        dispatch(deleteStep({ stepIndex: stepNumber }));
                        await say(`Step ${stepNumber + 1} deleted.`);
                    }
                } else {
                    await say(`Step ${stepNumber + 1} not found.`);
                }
                break;
            }

            // ── Correction ────────────────────────────────────────────────────────
            case CMD.REPLACE_SLOT: {
                const { slot, withText } = payload;
                const newNode = parseMathDictation(withText);
                // Build a shallow replacement: set the slot in current AST
                const stepIdx = cursor.stepIndex;
                const step = steps[stepIdx];
                if (!step) break;
                const updatedAST = { ...step.ast, [slot]: newNode };
                const latex = toLatex(updatedAST);
                dispatch(updateStepAST({ stepIndex: stepIdx, ast: updatedAST, latex }));
                const speech = verbosityRef.current === 'brief' ? toBriefSpeech(updatedAST) : toDetailedSpeech(updatedAST);
                await say(`Replaced ${slot}. Expression is now: ${speech}.`);
                break;
            }

            case CMD.REMOVE_SLOT: {
                const { slot } = payload;
                const stepIdx = cursor.stepIndex;
                const step = steps[stepIdx];
                if (!step) break;
                const updatedAST = { ...step.ast, [slot]: EMPTY };
                const latex = toLatex(updatedAST);
                dispatch(updateStepAST({ stepIndex: stepIdx, ast: updatedAST, latex }));
                await say(`Removed ${slot}. The slot is now empty.`);
                break;
            }

            // ── Undo/Redo ─────────────────────────────────────────────────────────
            case CMD.UNDO:
                dispatch(undo());
                await say('Undone.');
                break;

            case CMD.REDO:
                dispatch(redo());
                await say('Redone.');
                break;

            // ── Exam controls ─────────────────────────────────────────────────────
            case CMD.REVIEW_ANSWERS:
                await say(`Reviewing all ${steps.length} answers.`);
                await readAll();
                break;

            case CMD.SUBMIT_PAPER:
                await say('Submitting your paper now. Please confirm — say yes to submit or no to cancel.');
                dispatch(setPendingConfirmation({ prompt: 'Say yes to submit or no to cancel.', type: 'SUBMIT' }));
                break;

            // ── Math Dictation ────────────────────────────────────────────────────
            case CMD.MATH_INPUT: {
                const { text } = payload;
                const ast = parseMathDictation(text);
                const latex = toLatex(ast);
                const stepIdx = cursor.stepIndex;
                dispatch(updateStepAST({ stepIndex: stepIdx, ast, latex }));
                const speech = toBriefSpeech(ast);
                await say(`Recorded: ${speech}. Say "read expression in detail" to hear it fully, or "next term" to navigate.`);
                break;
            }

            case CMD.UNKNOWN:
            default:
                await say(`Command not recognized: "${cmd.originalText}". Say "enter command mode" for navigation commands.`);
                break;
        }
    }, [dispatch, say, readStep, readAll]);

    // ─── Handle confirmation responses ────────────────────────────────────────
    const handleConfirmation = useCallback(async (transcript) => {
        const answer = parseConfirmation(transcript);
        const pending = pendingRef.current;

        if (answer === 'yes') {
            if (pending?.type === 'SUBMIT') {
                dispatch(submitSession());
                dispatch(setPendingConfirmation(null));
                onSubmit?.();
                await say('Paper submitted. Thank you.', true);
            }
        } else if (answer === 'no') {
            dispatch(setPendingConfirmation(null));
            await say('Submission cancelled. Continue answering.', true);
        } else {
            await say('Please say "yes" to confirm or "no" to cancel.');
        }
    }, [dispatch, say, onSubmit]);

    // ─── STT result handler ────────────────────────────────────────────────────
    const handleResult = useCallback(async ({ transcript, confidence }) => {
        dispatch(setIsProcessing(true));
        dispatch(setLastSpokenCommand(transcript));

        try {
            // If waiting for confirmation, handle that first
            if (pendingRef.current) {
                await handleConfirmation(transcript);
                return;
            }

            const filter = filterResult(transcript, confidence);

            if (filter === 'reject') {
                await say("I couldn't understand that. Please speak clearly and try again.");
                return;
            }

            if (filter === 'disambiguate') {
                const prompt = buildDisambiguationPrompt(transcript);
                await say(prompt, true);
                dispatch(setPendingConfirmation({ prompt, type: 'DISAMBIGUATE', transcript }));
                return;
            }

            // Parse command first
            const cmd = parseCommand(transcript, confidence);

            // If it's a recognized command (not MATH_INPUT), execute it regardless of mode
            // This allows students to use commands like "read all steps" anytime
            if (cmd.type !== CMD.MATH_INPUT) {
                await handleCommand(cmd);
            } else if (inputModeRef.current === 'command') {
                // In command mode, handle MATH_INPUT as a potential command too
                await handleCommand(cmd);
            } else {
                // In dictation mode with unrecognized input: treat as math dictation
                await handleCommand({ type: CMD.MATH_INPUT, payload: { text: transcript }, originalText: transcript });
            }
        } finally {
            dispatch(setIsProcessing(false));
        }
    }, [dispatch, say, handleCommand, handleConfirmation]);

    // ─── Public API ────────────────────────────────────────────────────────────
    const startListening = useCallback(() => {
        dispatch(setIsListening(true));
        stt.startListening(
            handleResult,
            async (err) => {
                dispatch(setIsListening(false));
                dispatch(setIsProcessing(false));
                await say(`Microphone error: ${err.message}. Please try again.`, true);
            }
        );
    }, [dispatch, handleResult, say]);

    const stopListening = useCallback(() => {
        stt.stopListening();
        dispatch(setIsListening(false));
    }, [dispatch]);

    // Keyboard shortcut: Space = listen, Escape = stop
    useEffect(() => {
        const onKey = (e) => {
            if (e.code === 'Space' && !e.repeat && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                startListening();
            }
            if (e.code === 'Escape') {
                stopListening();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [startListening, stopListening]);

    return {
        startListening,
        stopListening,
        say,
        readStep,
        readAll,
        readCurrentQuestion,
        handleCommand,
        isSupported: stt.isSupported,
    };
};
