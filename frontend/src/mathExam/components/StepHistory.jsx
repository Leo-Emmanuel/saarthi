/**
 * StepHistory.jsx
 * Displays the multi-step aligned equation workspace.
 * Each step shows its KaTeX rendering with Framer Motion animation.
 */

import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteStep, setCurrentStep } from '../../store/mathExamSlice.js';
import MathRenderer from './MathRenderer.jsx';

const StepHistory = ({ onEditStep, onReadStep }) => {
    const dispatch = useDispatch();
    const { steps = [], currentStepIndex = 0, inputMode } = useSelector(s => s.mathExam?.present ?? s.mathExam ?? {});
    const isExamMode = useSelector(s => s.examSession?.isExamMode ?? false);

    const handleEdit = (idx) => {
        dispatch(setCurrentStep(idx));
        onEditStep?.(idx);
    };

    const handleDelete = (idx) => {
        if (steps.length <= 1) return;
        dispatch(deleteStep({ stepIndex: idx }));
    };

    const handleRead = (idx) => {
        onReadStep?.(idx);
    };

    return (
        <section
            aria-label="Step-by-step equation workspace"
            className="flex flex-col gap-3 w-full"
            role="list"
        >
            <AnimatePresence initial={false}>
                {steps.map((step, idx) => (
                    <motion.div
                        key={step.id}
                        role="listitem"
                        aria-label={`Step ${idx + 1}${idx === currentStepIndex ? ', currently editing' : ''}`}
                        aria-current={idx === currentStepIndex ? 'step' : undefined}
                        layout
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="relative rounded-2xl border-2 p-4 transition-colors"
                        style={{
                            border: '3px solid var(--border)',
                            background: idx === currentStepIndex ? 'var(--active-bg)' : 'var(--card)',
                            borderColor: idx === currentStepIndex ? 'var(--accent)' : 'var(--border)',
                            boxShadow: idx === currentStepIndex ? '0 0 16px rgba(255,229,0,0.15)' : 'none',
                        }}
                    >
                        {/* Step label */}
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: idx === currentStepIndex ? 'var(--accent)' : 'var(--muted)' }}>
                                Step {idx + 1}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleRead(idx)}
                                    className="text-xs px-2 py-1 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                                    style={{ color: 'var(--accent)' }}
                                    aria-label={`Read step ${idx + 1} aloud`}
                                    title={`Voice: "read step ${idx + 1}"`}
                                >
                                    🔊 Read
                                </button>
                                {!isExamMode && (
                                    <button
                                        onClick={() => handleEdit(idx)}
                                        className="text-xs px-2 py-1 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[var(--warn)]"
                                        style={{ color: 'var(--warn)' }}
                                        aria-label={`Edit step ${idx + 1}`}
                                        title={`Voice: "edit step ${idx + 1}"`}
                                    >
                                        ✏️ Edit
                                    </button>
                                )}
                                {!isExamMode && steps.length > 1 && (
                                    <button
                                        onClick={() => handleDelete(idx)}
                                        className="text-xs px-2 py-1 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-[var(--danger)]"
                                        style={{ color: 'var(--danger)' }}
                                        aria-label={`Delete step ${idx + 1}`}
                                        title={`Voice: "delete step ${idx + 1}"`}
                                    >
                                        🗑 Delete
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* KaTeX rendered math */}
                        <div className="overflow-x-auto py-2" style={{ color: 'var(--text)' }}>
                            {step.latex
                                ? <MathRenderer latex={step.latex} block={true} />
                                : (
                                    <span className="italic text-sm" style={{ color: 'var(--muted)' }}>
                                        Empty — say a math expression to fill this step
                                    </span>
                                )
                            }
                        </div>

                        {/* Timestamp */}
                        <div className="text-right mt-1">
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>
                                {new Date(step.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {steps.length === 0 && (
                <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
                    <p className="text-lg">No steps yet.</p>
                    <p className="text-sm mt-1">Say <em>"create new step"</em> or dictate a math expression.</p>
                </div>
            )}
        </section>
    );
};

export default StepHistory;
