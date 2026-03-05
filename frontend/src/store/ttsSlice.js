// ttsSlice.js
import { createSlice } from '@reduxjs/toolkit';

const ttsSlice = createSlice({
  name: 'tts',
  initialState: { 
    rate: 1.0, 
    pitch: 1.0, 
    voice: null,
    isLoaded: false
  },
  reducers: {
    setTTSSettings: (state, action) => {
      const { rate, pitch, voice } = action.payload || {};
      state.rate = rate ?? state.rate;
      state.pitch = pitch ?? state.pitch;
      state.voice = voice ?? state.voice;
      state.isLoaded = true;
    },
    updateTTSSettings: (state, action) => {
      const { rate, pitch, voice } = action.payload || {};
      if (rate !== undefined) state.rate = rate;
      if (pitch !== undefined) state.pitch = pitch;
      if (voice !== undefined) state.voice = voice;
    },
    resetTTSSettings: (state) => {
      state.rate = 1.0;
      state.pitch = 1.0;
      state.voice = null;
      state.isLoaded = false;
    }
  }
});

export const { setTTSSettings, updateTTSSettings, resetTTSSettings } = ttsSlice.actions;
export default ttsSlice.reducer;
