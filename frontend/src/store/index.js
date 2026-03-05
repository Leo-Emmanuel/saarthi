/**
 * store/index.js
 * Redux store configuration.
 */

import { configureStore } from '@reduxjs/toolkit';
import mathExamReducer from './mathExamSlice.js';
import examSessionReducer from './examSessionSlice.js';

export const store = configureStore({
    reducer: {
        mathExam: mathExamReducer,
        examSession: examSessionReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // AST nodes may contain symbol values; we trust our own structure
                ignoredActionPaths: ['payload.ast', 'payload.cells'],
                ignoredPaths: ['mathExam.steps', 'mathExam.history'],
            },
        }),
});

export default store;
