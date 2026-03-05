/**
 * mathExamSlice.js
 * Redux Toolkit slice for the math exam workspace.
 * Source of truth: MathJSON AST for each step.
 *
 * Responsibilities are grouped into two clearly separated sections:
 *   Section A — Domain data   (steps, cursor, history, undo/redo)
 *   Section B — Speech/UI     (verbosity, listening, confirmation)
 *
 * They intentionally share one slice because both sections participate
 * in the same resetWorkspace action. If either section grows significantly,
 * split into mathExamDomainSlice + mathExamSpeechSlice and combine reducers.
 */

import { createSlice, current } from '@reduxjs/toolkit';
import { cloneAST, EMPTY } from '../mathExam/mathEngine/MathAST.js';

const MAX_HISTORY = 50;

// ── Section A: Domain data ────────────────────────────────────────────────────
const domainInitialState = {
    // Steps: array of { id, ast, latex, timestamp }
    steps: [],
    currentStepIndex: 0,

    // AST cursor for structural navigation
    cursor: {
        stepIndex: 0,
        path: [], // named child slot path within the step's AST
    },

    // Undo/Redo stacks — each entry is a steps[] snapshot
    history: {
        past: [],
        future: [],
    },
};

// ── Section B: Speech / UI state ──────────────────────────────────────────────
const speechInitialState = {
    verbosityMode: 'detailed',     // 'brief' | 'detailed'
    inputMode: 'dictation',        // 'dictation' | 'command'
    lastSpokenCommand: '',
    lastAudioFeedback: '',
    isProcessing: false,           // true while STT is processing
    isListening: false,
    pendingConfirmation: null,     // { transcript, type } when awaiting confirm
};

const initialState = { ...domainInitialState, ...speechInitialState };

// ── History helper ────────────────────────────────────────────────────────────
// ✅ Use Immer's current() to snapshot the Immer draft as a plain object.
// This avoids the JSON.stringify/parse round-trip (expensive in the hot path,
// and breaks for any non-JSON-serialisable values inside AST nodes).
const pushHistory = (state) => {
    state.history.past.push(current(state.steps));
    if (state.history.past.length > MAX_HISTORY) {
        state.history.past.shift();
    }
    state.history.future = [];
};

// ── Slice ─────────────────────────────────────────────────────────────────────
export const mathExamSlice = createSlice({
    name: 'mathExam',
    initialState,

    reducers: {
        // ── Section A: Domain reducers ────────────────────────────────────────

        addStep: (state, action) => {
            pushHistory(state);
            const { ast = EMPTY, latex = '', id, timestamp } = action.payload ?? {};
            const newStep = {
                // ✅ Caller supplies id and timestamp — keeps reducer pure/deterministic.
                // Dispatch: dispatch(addStep({ ast, latex, id: crypto.randomUUID(), timestamp: new Date().toISOString() }))
                id: id ?? `step_${state.steps.length}`,
                ast: cloneAST(ast) ?? EMPTY,
                latex: latex ?? '',
                timestamp: timestamp ?? null,
            };
            state.steps.push(newStep);
            state.currentStepIndex = state.steps.length - 1;
            state.cursor = { stepIndex: state.currentStepIndex, path: [] };
        },

        updateStepAST: (state, action) => {
            // ✅ Null-safe: guard the same way addStep does, and clone the AST
            // to prevent the same reference being stored in two steps (immutability).
            const { stepIndex, ast, latex, timestamp } = action.payload ?? {};
            if (stepIndex == null || !state.steps[stepIndex]) return;
            pushHistory(state);
            state.steps[stepIndex].ast = cloneAST(ast) ?? state.steps[stepIndex].ast;
            state.steps[stepIndex].latex = latex ?? state.steps[stepIndex].latex;
            // ✅ Caller supplies timestamp rather than new Date() in the reducer
            state.steps[stepIndex].timestamp = timestamp ?? null;
        },

        deleteStep: (state, action) => {
            const { stepIndex } = action.payload ?? {};
            if (stepIndex == null) return;
            if (state.steps.length <= 1) return; // Keep at least one
            pushHistory(state);
            state.steps.splice(stepIndex, 1);
            state.currentStepIndex = Math.min(state.currentStepIndex, state.steps.length - 1);
            state.cursor = { stepIndex: state.currentStepIndex, path: [] };
        },

        setCurrentStep: (state, action) => {
            const idx = action.payload;
            if (idx >= 0 && idx < state.steps.length) {
                state.currentStepIndex = idx;
                state.cursor = { stepIndex: idx, path: [] };
            }
        },

        // ── Cursor Navigation ─────────────────────────────────────────────────

        setCursor: (state, action) => {
            state.cursor = action.payload;
        },

        setCursorPath: (state, action) => {
            state.cursor.path = action.payload;
        },

        // ── Undo / Redo ───────────────────────────────────────────────────────

        undo: (state) => {
            if (state.history.past.length === 0) return;
            const prev = state.history.past.pop();
            // ✅ Use current() snapshot (not JSON round-trip) for the future stack
            state.history.future.push(current(state.steps));
            state.steps = prev;
            // ✅ Fix stuck-at-(-1) bug: Math.min alone returns -1 when steps is empty.
            // Clamp to [0, length-1] only when the restored array is non-empty.
            state.currentStepIndex = state.steps.length > 0
                ? Math.min(Math.max(0, state.currentStepIndex), state.steps.length - 1)
                : 0;
            state.cursor = { stepIndex: state.currentStepIndex, path: [] };
        },

        redo: (state) => {
            if (state.history.future.length === 0) return;
            const next = state.history.future.pop();
            // ✅ Use current() snapshot (not JSON round-trip)
            state.history.past.push(current(state.steps));
            state.steps = next;
            // ✅ Same clamp fix as undo
            state.currentStepIndex = state.steps.length > 0
                ? Math.min(Math.max(0, state.currentStepIndex), state.steps.length - 1)
                : 0;
            state.cursor = { stepIndex: state.currentStepIndex, path: [] };
        },

        resetWorkspace: (state) => {
            // Preserve verbosity preference across resets (intentional UX decision)
            Object.assign(state, { ...initialState, verbosityMode: state.verbosityMode });
        },

        loadSteps: (state, action) => {
            state.steps = action.payload ?? [];
            state.currentStepIndex = 0;
            state.cursor = { stepIndex: 0, path: [] };
            state.history = { past: [], future: [] };
        },

        // ── Section B: Speech / UI reducers ───────────────────────────────────

        setVerbosityMode: (state, action) => {
            state.verbosityMode = action.payload; // 'brief' | 'detailed'
        },

        setInputMode: (state, action) => {
            state.inputMode = action.payload; // 'dictation' | 'command'
        },

        setLastSpokenCommand: (state, action) => {
            state.lastSpokenCommand = action.payload;
        },

        setLastAudioFeedback: (state, action) => {
            state.lastAudioFeedback = action.payload;
        },

        setIsListening: (state, action) => {
            state.isListening = action.payload;
        },

        setIsProcessing: (state, action) => {
            state.isProcessing = action.payload;
        },

        setPendingConfirmation: (state, action) => {
            state.pendingConfirmation = action.payload;
        },
    },
});

export const {
    addStep, updateStepAST, deleteStep, setCurrentStep,
    setCursor, setCursorPath,
    setVerbosityMode, setInputMode,
    setLastSpokenCommand, setLastAudioFeedback,
    setIsListening, setIsProcessing, setPendingConfirmation,
    undo, redo, resetWorkspace, loadSteps,
} = mathExamSlice.actions;

export default mathExamSlice.reducer;
