import { describe, it, expect } from 'vitest';
import ttsReducer, { setTTSSettings, updateTTSSettings, resetTTSSettings } from '../ttsSlice';

describe('ttsSlice', () => {
    it('Initial state has rate: 1.0, pitch: 1.0, voice: null, isLoaded: false', () => {
        const initialState = ttsReducer(undefined, { type: 'unknown' });
        expect(initialState).toEqual({
            rate: 1.0,
            pitch: 1.0,
            voice: null,
            isLoaded: false
        });
    });

    it('setTTSSettings updates all fields and sets isLoaded: true', () => {
        const action = setTTSSettings({ rate: 1.5, pitch: 0.8, voice: 'test-voice' });
        const state = ttsReducer(undefined, action);
        expect(state).toEqual({
            rate: 1.5,
            pitch: 0.8,
            voice: 'test-voice',
            isLoaded: true
        });
    });

    it('updateTTSSettings only updates provided fields, leaves others unchanged', () => {
        const initialState = {
            rate: 1.5,
            pitch: 0.8,
            voice: 'test-voice',
            isLoaded: true
        };
        const action = updateTTSSettings({ rate: 2.0 });
        const state = ttsReducer(initialState, action);
        expect(state).toEqual({
            rate: 2.0,
            pitch: 0.8,
            voice: 'test-voice',
            isLoaded: true
        });
    });

    it('resetTTSSettings resets everything back to defaults', () => {
        const initialState = {
            rate: 1.5,
            pitch: 0.8,
            voice: 'test-voice',
            isLoaded: true
        };
        const action = resetTTSSettings();
        const state = ttsReducer(initialState, action);
        expect(state).toEqual({
            rate: 1.0,
            pitch: 1.0,
            voice: null,
            isLoaded: false
        });
    });
});
