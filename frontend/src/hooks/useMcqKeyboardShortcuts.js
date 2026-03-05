import { useEffect } from 'react';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function useMcqKeyboardShortcuts({
    enabled,
    currentQuestion,
    onSelect,
    onNext,
    onPrev,
    canAdvance = false,
}) {
    useEffect(() => {
        if (!enabled) return undefined;
        const handler = (e) => {
            const tag = e.target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            const key = String(e.key || '').toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(key) && currentQuestion?.type === 'mcq') {
                if (!Array.isArray(currentQuestion.options) || currentQuestion.options.length === 0) return;
                const idx = LETTERS.indexOf(key);
                const option = currentQuestion.options?.[idx];
                if (option) onSelect(option);
            }
            if (e.key === 'ArrowRight') onNext();
            if (e.key === 'ArrowLeft') onPrev();
            if (e.key === 'Enter' && currentQuestion?.type === 'mcq' && canAdvance) onNext();
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [enabled, currentQuestion, onSelect, onNext, onPrev, canAdvance]);
}
