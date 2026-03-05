/**
 * BrowserTTS.js
 * Web Speech API Text-to-Speech adapter.
 * Supports verbosity modes: 'brief' | 'detailed'
 */

import { SpeechProvider } from './SpeechProvider.js';

export class BrowserTTS extends SpeechProvider {
    constructor(options = {}) {
        super(options);
        this._verbosity = options.verbosity || 'detailed';
        this._utteranceRef = null;
        this._queue = [];
        this._isSpeaking = false;
        this._rate = options.rate ?? 0.95;
        this._pitch = options.pitch ?? 1.0;
        this._volume = options.volume ?? 1.0;
    }

    get isSupported() {
        return typeof window !== 'undefined' && 'speechSynthesis' in window;
    }

    get verbosity() { return this._verbosity; }
    set verbosity(v) { this._verbosity = v; }

    /** Speak text; high-priority = cancel current and speak immediately */
    speak(text, options = {}) {
        if (!this.isSupported || !text) return Promise.resolve();
        const priority = options.priority ?? false;

        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.lang;
            utterance.rate = options.rate ?? this._rate;
            utterance.pitch = options.pitch ?? this._pitch;
            utterance.volume = options.volume ?? this._volume;

            const finish = () => {
                this._utteranceRef = null;
                this._isSpeaking = false;
                resolve();
                this._flush();
            };

            utterance.onend = finish;
            utterance.onerror = (e) => {
                console.warn('[TTS] Error:', e.error);
                finish();
            };

            this._utteranceRef = utterance;

            if (priority) {
                this.cancel();
                this._queue = [];
                this._isSpeaking = true;
                window.speechSynthesis.speak(utterance);
            } else if (this._isSpeaking) {
                this._queue.push({ utterance, resolve });
            } else {
                this._isSpeaking = true;
                window.speechSynthesis.speak(utterance);
            }
        });
    }

    /** Speak with high priority (interrupts current speech) */
    speakNow(text, options = {}) {
        return this.speak(text, { ...options, priority: true });
    }

    cancel() {
        if (this.isSupported) {
            window.speechSynthesis.cancel();
            this._isSpeaking = false;
            this._utteranceRef = null;
        }
    }

    _flush() {
        if (this._queue.length > 0) {
            const { utterance, resolve } = this._queue.shift();
            this._isSpeaking = true;
            this._utteranceRef = utterance;

            const origEnd = utterance.onend;
            const origErr = utterance.onerror;

            utterance.onend = () => {
                origEnd?.();
                resolve?.();
            };
            utterance.onerror = (e) => {
                origErr?.(e);
                resolve?.();
            };

            window.speechSynthesis.speak(utterance);
        }
    }

    get isSpeaking() { return this._isSpeaking; }

    // Dummy stubs for SpeechProvider interface
    startListening() { }
    stopListening() { }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
let _ttsInstance = null;

export const getTTS = (options = {}) => {
    if (!_ttsInstance) {
        _ttsInstance = new BrowserTTS(options);
    }
    return _ttsInstance;
};
