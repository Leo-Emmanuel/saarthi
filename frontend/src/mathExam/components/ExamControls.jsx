/**
 * ExamControls.jsx
 * Card-based panel with exam actions — all voice-triggerable.
 */

import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';

const ControlCard = ({ icon, label, description, onClick, danger = false, disabled = false, voiceHint }) => (
    <motion.button
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        onClick={onClick}
        disabled={disabled}
        aria-label={`${label}. Voice command: "${voiceHint}"`}
        title={`Voice: "${voiceHint}"`}
        className="w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        style={{
            border: '3px solid var(--border)',
            background: danger ? 'rgba(255,68,68,0.15)' : 'var(--card)',
            borderColor: danger ? 'var(--danger)' : 'var(--border)',
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
        }}
    >
        <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: danger ? 'var(--danger)' : 'var(--text)' }}>
                {label}
            </p>
            <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--muted)' }}>{description}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Say: <em>"{voiceHint}"</em>
            </p>
        </div>
    </motion.button>
);

const ExamControls = ({
    onReview,
    onSubmit,
    onUndo,
    onRedo,
    onNewStep,
}) => {
    const { isSubmitted } = useSelector(s => (s.examSession || {}));
    const { history: rawHistory = {}, steps = [] } = useSelector(s => s.mathExam || {});
    const history = {
        past: Array.isArray(rawHistory.past) ? rawHistory.past : [],
        future: Array.isArray(rawHistory.future) ? rawHistory.future : [],
    };

    const canUndo = !isSubmitted && history.past.length > 0;
    const canRedo = !isSubmitted && history.future.length > 0;

    return (
        <aside
            aria-label="Exam controls and actions"
            className="h-full flex flex-col overflow-y-auto"
            style={{ background: 'var(--surface)' }}
        >
            <div className="px-3 py-3 flex-shrink-0" style={{ borderBottom: '3px solid var(--border)' }}>
                <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 2 }} className="uppercase tracking-widest">CONTROLS</h2>
            </div>

            <div className="flex-1 px-3 py-3 space-y-2 overflow-y-auto">

                {/* Step */}
                <ControlCard
                    icon="➕"
                    label="New Step"
                    description="Add an aligned equation step"
                    voiceHint="create next aligned step"
                    onClick={onNewStep}
                    disabled={isSubmitted}
                />

                {/* Undo/Redo */}
                <div className="flex gap-2">
                    <motion.button
                        whileTap={{ scale: canUndo ? 0.95 : 1 }}
                        onClick={onUndo}
                        disabled={!canUndo || isSubmitted}
                        aria-label="Undo last change. Voice: undo"
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        style={{
                            border: '3px solid var(--border)',
                            background: 'var(--card)',
                            color: 'var(--text)',
                            opacity: !canUndo || isSubmitted ? 0.3 : 1,
                            cursor: !canUndo || isSubmitted ? 'not-allowed' : 'pointer',
                        }}
                    >
                        ↩ Undo
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: canRedo ? 0.95 : 1 }}
                        onClick={onRedo}
                        disabled={!canRedo || isSubmitted}
                        aria-label="Redo last undone change. Voice: redo"
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        style={{
                            border: '3px solid var(--border)',
                            background: 'var(--card)',
                            color: 'var(--text)',
                            opacity: !canRedo || isSubmitted ? 0.3 : 1,
                            cursor: !canRedo || isSubmitted ? 'not-allowed' : 'pointer',
                        }}
                    >
                        ↪ Redo
                    </motion.button>
                </div>

                <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }} />

                {/* Review */}
                <ControlCard
                    icon="📋"
                    label="Review All"
                    description="Hear all steps read aloud"
                    voiceHint="review all answers"
                    onClick={onReview}
                />


                {/* Submit */}
                <ControlCard
                    icon="✅"
                    label="Submit Paper"
                    description={isSubmitted ? 'Already submitted' : 'Submit your exam answers'}
                    voiceHint="submit paper"
                    onClick={onSubmit}
                    danger={true}
                    disabled={isSubmitted}
                />
            </div>

            {/* Step count info */}
            <div className="flex-shrink-0 px-3 py-2" style={{ borderTop: '3px solid var(--border)' }}>
                <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
                    {steps.length} step{steps.length !== 1 ? 's' : ''} · {canUndo ? `${history.past.length} undo` : 'No undo'} available
                </p>
            </div>
        </aside>
    );
};

export default ExamControls;
