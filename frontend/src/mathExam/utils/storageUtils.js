/**
 * storageUtils.js
 * LocalStorage persistence for the math exam workspace.
 *
 * Separated from exportUtils.js to respect the single-responsibility principle:
 * exportUtils handles data formatting and file/window output;
 * storageUtils handles persistence exclusively.
 *
 * ✅ Writes are deferred with queueMicrotask so the serialisation and
 * localStorage.setItem call never block the main-thread paint/render cycle.
 */

export const AUTO_SAVE_KEY = 'saarthi_math_exam_autosave';

/**
 * Persist exam steps to localStorage without blocking the main thread.
 *
 * JSON.stringify on a large steps array is synchronous and can take several
 * milliseconds in the hot auto-save path. Wrapping it in queueMicrotask defers
 * the work until after the current task (e.g. the Redux dispatch that triggered
 * this call) has finished, keeping the UI responsive.
 *
 * @param {Array}    steps
 * @param {string}   [examId]
 * @param {string}   [savedAt]      - ISO timestamp; caller supplies for determinism
 * @param {Function} [onStorageWarning] - Called with a TTS-ready warning string
 *                                        when localStorage quota is exceeded.
 *                                        Wire to tts.speak() in the exam component.
 */
export const saveToLocal = (steps, examId = 'default', savedAt = new Date().toISOString(), onStorageWarning) => {
    queueMicrotask(() => {
        try {
            const data = { examId, steps, savedAt };
            localStorage.setItem(`${AUTO_SAVE_KEY}_${examId}`, JSON.stringify(data));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                // FIX 11: Storage full — notify via TTS so blind students know
                console.error('[storageUtils] localStorage quota exceeded — exam data NOT saved');
                onStorageWarning?.(
                    'Warning: local storage is full. Your answers are held in memory only. Please submit your exam soon to avoid losing your work.'
                );
            } else {
                // SecurityError in private browsing or other unexpected errors
                console.warn('[storageUtils] Failed to save to localStorage:', e);
            }
        }
    });
};

/**
 * Load a previously auto-saved exam from localStorage.
 *
 * @param {string} [examId]
 * @returns {{ examId: string, steps: Array, savedAt: string } | null}
 */
export const loadFromLocal = (examId = 'default') => {
    try {
        const raw = localStorage.getItem(`${AUTO_SAVE_KEY}_${examId}`);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

/**
 * Remove a saved exam draft from localStorage.
 *
 * @param {string} [examId]
 */
export const clearLocal = (examId = 'default') => {
    try {
        localStorage.removeItem(`${AUTO_SAVE_KEY}_${examId}`);
    } catch {
        // SecurityError in private browsing — silently ignore
    }
};
