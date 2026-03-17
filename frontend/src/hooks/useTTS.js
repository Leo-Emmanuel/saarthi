// useTTS.js
import { useCallback, useRef, useEffect } from "react";

// Dictionary to map superscripts to spoken phrases
const SUPERSCRIPTS = {
  '\u2070': 'to the power of 0',
  '\u00B9': 'to the power of 1',
  '\u00B2': 'squared',
  '\u00B3': 'cubed',
  '\u2074': 'to the power of 4',
  '\u2075': 'to the power of 5',
  '\u2076': 'to the power of 6',
  '\u2077': 'to the power of 7',
  '\u2078': 'to the power of 8',
  '\u2079': 'to the power of 9'
};

// Dictionary to map subscripts
const SUBSCRIPTS = {
  '\u2080': 'subscript 0',
  '\u2081': 'subscript 1',
  '\u2082': 'subscript 2',
  '\u2083': 'subscript 3',
  '\u2084': 'subscript 4',
  '\u2085': 'subscript 5',
  '\u2086': 'subscript 6',
  '\u2087': 'subscript 7',
  '\u2088': 'subscript 8',
  '\u2089': 'subscript 9'
};

function sanitizeForTTS(text) {
  if (!text) return text;
  let sanitized = String(text);

  // Replace superscripts
  for (const [char, word] of Object.entries(SUPERSCRIPTS)) {
    sanitized = sanitized.split(char).join(` ${word} `);
  }

  // Replace subscripts
  for (const [char, word] of Object.entries(SUBSCRIPTS)) {
    sanitized = sanitized.split(char).join(` ${word} `);
  }

  // Handle common math symbols often mispronounced
  sanitized = sanitized
    .replace(/\+/g, ' plus ')
    .replace(/=/g, ' equals ')
    .replace(/<([^a-zA-Z])/g, ' is less than $1')
    .replace(/>([^a-zA-Z])/g, ' is greater than $1');

  return sanitized.replace(/\s+/g, ' ').trim();
}

export function useTTS(ttsSettings = { rate: 1.0, pitch: 1.0, voice: null }) {
  const synthRef = useRef(window.speechSynthesis);
  const voicesLoadedRef = useRef(false);

  // Ensure voices are loaded
  useEffect(() => {
    const loadVoices = () => {
      if (synthRef.current.getVoices().length > 0) {
        voicesLoadedRef.current = true;
      }
    };

    if (synthRef.current.getVoices().length > 0) {
      voicesLoadedRef.current = true;
    } else {
      synthRef.current.onvoiceschanged = loadVoices;
    }

    return () => {
      synthRef.current.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text, options = {}) => {
    if (!voicesLoadedRef.current) {
      console.warn('TTS voices not loaded yet');
      options.onEnd?.();
      return;
    }

    synthRef.current.cancel();

    // Sanitize mathematics and superscripts/subscripts so it speaks correctly
    const spokenText = sanitizeForTTS(text);
    const utterance = new SpeechSynthesisUtterance(spokenText);

    utterance.rate = options.rate ?? ttsSettings.rate ?? 1.0;
    utterance.pitch = options.pitch ?? ttsSettings.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    // Apply voice if specified
    if (ttsSettings.voice) {
      const voices = synthRef.current.getVoices();
      const match = voices.find(v => v.name === ttsSettings.voice);
      if (match) utterance.voice = match;
    }

    if (options.onEnd) utterance.onend = options.onEnd;
    if (options.onStart) utterance.onstart = options.onStart;
    if (options.onError) utterance.onerror = options.onError;

    // Add interruption handling
    utterance.oninterrupt = (e) => {
      console.log('TTS interrupted:', e);
      if (options.onInterrupt) options.onInterrupt(e);
    };

    synthRef.current.speak(utterance);
  }, [ttsSettings.rate, ttsSettings.pitch, ttsSettings.voice]);

  const cancel = useCallback(() => {
    synthRef.current.cancel();
  }, []);

  const pause = useCallback(() => {
    synthRef.current.pause();
  }, []);

  const resume = useCallback(() => {
    synthRef.current.resume();
  }, []);

  const getVoices = useCallback(() => {
    return synthRef.current.getVoices();
  }, []);

  // Browser policy requires a user interaction (click/touch) before TTS can auto-play.
  // Call this function from the first user click anywhere in the app (like a Login button)
  // to silently unlock the speech synthesis engine for the entire session.
  const initUnlock = useCallback(() => {
    if (synthRef.current.speaking || synthRef.current.pending) return;
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    utterance.rate = 1;
    utterance.pitch = 1;
    synthRef.current.speak(utterance);
  }, []);

  return { speak, cancel, pause, resume, getVoices, initUnlock };
}

export default useTTS;
