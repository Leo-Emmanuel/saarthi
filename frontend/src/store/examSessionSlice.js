/**
 * examSessionSlice.js
 * Redux Toolkit slice for exam session management.
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    examId: null,
    questionText: '',
    questions: [],
    questionIndex: 0,
    totalQuestions: 0,
    isExamMode: false,      // Locks non-essential navigation
    isSubmitted: false,
    sessionStartTime: null,
    autoSaveTimestamp: null,
    duration: 0,            // minutes
    title: '',
};

export const examSessionSlice = createSlice({
    name: 'examSession',
    initialState,

    reducers: {
        startSession: (state, action) => {
            // ✅ Null-safe destructure — crashes if payload is undefined without the fallback
            const {
                examId,
                title,
                duration,
                totalQuestions,
                questions,
                questionIndex,
                // ✅ Caller supplies the timestamp so the reducer stays pure/deterministic.
                // Dispatch as: dispatch(startSession({ …, startedAt: new Date().toISOString() }))
                startedAt,
            } = action.payload ?? {};
            state.examId = examId ?? null;
            state.title = title ?? '';
            state.duration = duration ?? 0;
            state.totalQuestions = totalQuestions ?? 0;
            state.questions = questions || [];
            state.questionIndex = questionIndex ?? 0;
            state.isExamMode = true;
            state.isSubmitted = false;
            state.sessionStartTime = startedAt ?? null;
        },

        setQuestion: (state, action) => {
            // ✅ Null-safe destructure — guards against a missing or malformed payload
            const { index, text } = action.payload ?? {};
            state.questionIndex = index ?? state.questionIndex;
            state.questionText = text ?? state.questionText;
        },

        recordAutoSave: (state, action) => {
            // ✅ Caller supplies the timestamp — keeps this reducer pure.
            // Dispatch as: dispatch(recordAutoSave({ savedAt: new Date().toISOString() }))
            state.autoSaveTimestamp = action.payload?.savedAt ?? null;
        },

        submitSession: (state) => {
            state.isSubmitted = true;
            state.isExamMode = false;
        },

        endSession: (state) => {
            Object.assign(state, initialState);
        },

        setExamMode: (state, action) => {
            state.isExamMode = action.payload;
        },
    },
});

export const {
    startSession, setQuestion, recordAutoSave,
    submitSession, endSession, setExamMode,
} = examSessionSlice.actions;

export default examSessionSlice.reducer;
