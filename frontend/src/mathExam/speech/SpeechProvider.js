/**
 * SpeechProvider.js
 * Abstract speech interface — swap in offline models without changing consumer code.
 */

export class SpeechProvider {
    /**
     * @param {object} options
     * @param {string} options.lang - BCP-47 language tag (e.g. 'en-US')
     */
    constructor(options = {}) {
        this.lang = options.lang || 'en-US';
    }

    /** Start listening. Calls onResult({ transcript, confidence }) or onError(err). */
    startListening(onResult, onError) { throw new Error('Not implemented'); }

    /** Stop listening. */
    stopListening() { throw new Error('Not implemented'); }

    /** Speak text asynchronously. Returns a Promise that resolves when done. */
    speak(text, options = {}) { throw new Error('Not implemented'); }

    /** Cancel current speech. */
    cancel() { throw new Error('Not implemented'); }
}
