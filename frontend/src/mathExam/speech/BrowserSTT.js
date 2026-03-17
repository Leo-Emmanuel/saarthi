/**
 * BrowserSTT.js
 * Web Speech API Speech-to-Text adapter.
 * Implements SpeechProvider interface.
 *
 * Session lifecycle guarantees enforced here:
 *   · At most ONE active SpeechRecognition instance at any time (_isStarting mutex).
 *   · stopListening is always respected — any pending restart checks _stopped before running.
 *   · onerror and onend never both trigger a restart (onend is a no-op after onerror restart).
 *   · The 12-second zombie timeout persists across results (not cleared on first result).
 */

import { SpeechProvider } from './SpeechProvider.js';

export class BrowserSTT extends SpeechProvider {
    constructor(options = {}) {
        super(options);
        this._recognition = null;
        this._isListening = false;
        this._retryCount = 0;
        this._maxRetries = options.maxRetries ?? 3;
        this._onResult = null;
        this._onError = null;
        this._stopTimeout = null;
        this._stitchTimer = null;
        this._partialBuffer = '';
        this._minConfidence = null;
        this._continuous = options.continuous ?? false;
        this._autoRestart = options.autoRestart ?? false;

        // ✅ Mutex: prevents re-entrant calls to _startRecognition from creating
        // multiple overlapping instances. Set true the moment we begin constructing
        // a new SR, cleared in onstart (success) or in the catch block (failure).
        this._isStarting = false;

        // ✅ Stop flag: set by stopListening(). All deferred restart callbacks check
        // this before calling _startRecognition, so a pending retry/restart that was
        // queued before stopListening() is called will silently no-op instead of
        // spawning a new session.
        this._stopped = false;
    }

    get isSupported() {
        return typeof window !== 'undefined' &&
            !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    startListening(onResult, onError) {
        if (!this.isSupported) {
            onError?.({ message: 'Speech Recognition not supported in this browser.' });
            return;
        }
        this._onResult = onResult;
        this._onError = onError;
        this._stopped = false;   // ✅ Clear stop flag on every fresh startListening call
        this._retryCount = 0;
        this._startRecognition();
    }

    stopListening() {
        if (this._stitchTimer) {
            clearTimeout(this._stitchTimer);
            this._stitchTimer = null;
        }
        this._partialBuffer = '';

        // ✅ Set the stop flag FIRST so any pending deferred restart callbacks
        // see it and exit immediately — even if they were queued milliseconds ago.
        this._stopped = true;
        this._autoRestart = false;
        this._retryCount = 0;

        this._clearStopTimeout();
        this._minConfidence = null;

        if (this._recognition) {
            try { this._recognition.abort(); } catch { /* ignore */ }
            this._recognition = null;
        }
        this._isListening = false;
        this._isStarting = false;
    }

    _startRecognition() {
        // ✅ Mutex: if we're already in the middle of starting a session, do nothing.
        // This prevents re-entrant calls (e.g. from both onerror and onend firing in
        // the same tick) from creating a second orphaned SpeechRecognition instance.
        if (this._isStarting) return;

        // ✅ Stop guard: if stopListening() was called before this deferred callback
        // ran, respect the intent and do not open a new session.
        if (this._stopped) return;

        this._isStarting = true;

        // Abort any existing session before creating the new one.
        // This is the only place a new SR instance is created, so aborting here
        // ensures there is never more than one live instance.
        if (this._recognition) {
            try { this._recognition.abort(); } catch { /* ignore */ }
            this._recognition = null;
        }

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SR();
        recognition.lang = this.lang;
        recognition.continuous = this._continuous ?? false;
        recognition.interimResults = this._continuous ? true : false;
        recognition.maxAlternatives = 3;
        this._recognition = recognition;

        // ✅ 90-second hard-stop zombie killer.
        // NOT cleared on onresult — only cleared when the session actually ends
        // (onend) or when stopListening is called. This ensures the timeout is
        // always active while a session is running, even after results come in.
        this._clearStopTimeout();
        this._stopTimeout = setTimeout(() => {
            try { this._recognition?.stop(); } catch { /* ignore */ }
        }, 90000);

        // ── Handlers ────────────────────────────────────────────────────────────

        recognition.onstart = () => {
            this._isListening = true;
            this._isStarting = false;  // ✅ Mutex released on confirmed start
        };

        recognition.onresult = (event) => {
            this._retryCount = 0;
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    const transcript = event.results[i][0].transcript;
                    const chunkConfidence = event.results[i][0].confidence;
                    
                    const isFirstChunk = !this._partialBuffer;
                    this._partialBuffer = (this._partialBuffer || '') + ' ' + transcript;
                    this._minConfidence = isFirstChunk ? chunkConfidence : Math.min(this._minConfidence || 1.0, chunkConfidence);

                    clearTimeout(this._stitchTimer);
                    this._stitchTimer = setTimeout(() => {
                        const full = this._partialBuffer.trim();
                        const finalConfidence = this._minConfidence || 0;
                        this._partialBuffer = '';
                        this._minConfidence = null;
                        if (full) {
                            this._onResult?.({ transcript: full, confidence: finalConfidence, raw: event });
                        }
                    }, 1500);
                }
            }
        };

        // ✅ onerror owns the retry decision. onend is prevented from also
        // triggering a restart (via _isStarting) so the two handlers never both
        // queue a _startRecognition call for the same session failure.
        recognition.onerror = (err) => {
            this._clearStopTimeout();
            this._isListening = false;

            if (this._stopped) return;   // stopListening won the race

            // ✅ 'aborted' fires when we intentionally call .abort() before
            // starting a new session (e.g. handleBegin + auto-restart racing).
            // This is expected — silently ignore it.
            if (err.error === 'aborted') {
                this._isStarting = false;
                return;
            }

            if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
                // Unrecoverable — microphone permission denied
                this._isStarting = false;
                this._retryCount = 0;
                this._onError?.({ message: err.error, code: err.error });
                return;
            }

            this._retryCount++;
            if (this._retryCount <= this._maxRetries) {
                // ✅ Set _isStarting before the setTimeout so any concurrent onend
                // that fires in the same tick sees the mutex and skips its own restart.
                this._isStarting = true;
                setTimeout(() => {
                    this._isStarting = false;   // release before re-entry
                    if (!this._stopped) this._startRecognition();
                }, 500);
            } else {
                this._isStarting = false;
                this._retryCount = 0;
                this._onError?.({ message: err.error, code: err.error });
            }
        };

        // ✅ onend ONLY restarts for autoRestart. It does NOT retry on error —
        // that is onerror's job. The _isStarting check prevents both handlers
        // from spawning restarts simultaneously.
        recognition.onend = () => {
            this._clearStopTimeout();
            this._isListening = false;
            this._isStarting = false;  // ✅ Release mutex unconditionally on end

            if (this._stopped) return;   // stopListening called — stay stopped
            if (!this._autoRestart) return;   // single-shot mode — done

            // Defer to let onerror (if it fired) set _isStarting first
            setTimeout(() => {
                if (!this._stopped) this._startRecognition();
            }, 300);
        };

        try {
            recognition.start();
        } catch (e) {
            this._isStarting = false;
            this._isListening = false;
            this._onError?.({ message: 'Failed to start recognition', detail: e });
        }
    }

    _clearStopTimeout() {
        if (this._stopTimeout) {
            clearTimeout(this._stopTimeout);
            this._stopTimeout = null;
        }
    }

    get isListening() { return this._isListening; }
}
