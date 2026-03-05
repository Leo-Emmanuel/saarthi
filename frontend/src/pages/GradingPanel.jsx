import { FILE_ORIGIN } from '../config/fileOrigin';
import MathRenderer from '../components/MathRenderer';

/**
 * GradingPanel — right side showing student answers and grading inputs.
 */
export default function GradingPanel({
    questions, answers, audioFiles, grades,
    onGradeChange, feedback, onFeedbackChange, totalScore, onSubmit,
}) {
    return (
        <div
            className="w-full md:w-1/2 p-6 overflow-y-auto"
            style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
            <h2
                className="mb-6 pb-2"
                style={{ fontSize: 20, fontWeight: 700, borderBottom: '3px solid var(--border)' }}
            >
                Student Submission
            </h2>
            <div className="space-y-8">
                {questions.map((q, index) => (
                    <div
                        key={q._id}
                        className="p-4"
                        style={{
                            borderRadius: 'var(--radius)',
                            border: '3px solid var(--border)',
                            background: 'var(--surface)',
                        }}
                    >
                        <p className="mb-3" style={{ fontWeight: 600 }}>
                            Q{index + 1}: {q.text}
                        </p>

                        <div className="mb-3">
                            <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Student Answer:</p>
                            {/* Render LaTeX math if present, plain text otherwise */}
                            {answers[q._id] ? (
                                answers[q._id].includes('$') ? (
                                    <div
                                        className="p-2 border rounded"
                                        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                                    >
                                        <MathRenderer
                                            text={answers[q._id]}
                                            style={{ fontSize: '1rem', color: 'var(--text)' }}
                                        />
                                    </div>
                                ) : (
                                    <p
                                        className="p-2 border rounded"
                                        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                                    >
                                        {answers[q._id]}
                                    </p>
                                )
                            ) : (
                                <p
                                    className="p-2 border rounded"
                                    style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                                >
                                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No text answer</span>
                                </p>
                            )}
                        </div>

                        {audioFiles[q._id] && (
                            <div className="mb-3">
                                <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Audio Answer:</p>
                                <audio src={`${FILE_ORIGIN}${audioFiles[q._id]}`} controls className="mt-1" />
                            </div>
                        )}

                        <div className="flex items-center gap-2 mt-4">
                            <label className="font-bold" style={{ color: 'var(--text)' }}>Marks:</label>
                            <input
                                type="number"
                                className="w-20 p-1 border rounded"
                                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                min="0"
                                max={q.marks}
                                step="0.5"
                                value={grades[q._id] ?? 0}
                                onChange={(e) => onGradeChange(q._id, e.target.value)}
                            />
                            <span style={{ color: 'var(--muted)' }}>/ {q.marks}</span>
                        </div>
                    </div>
                ))}

                <div className="mt-6">
                    <label className="block font-bold mb-2" style={{ color: 'var(--text)' }}>General Feedback:</label>
                    <textarea
                        className="w-full p-2 border rounded"
                        style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        rows="3"
                        value={feedback}
                        onChange={(e) => onFeedbackChange(e.target.value)}
                    />
                </div>

                <div
                    className="mt-6 p-4 rounded flex justify-between items-center"
                    style={{ background: 'var(--card)' }}
                >
                    <span className="font-bold text-lg">
                        Total Score:{' '}
                        <span style={{ color: 'var(--success)' }}>{totalScore}</span>
                    </span>
                    <button
                        onClick={onSubmit}
                        className="px-6 py-2 rounded font-bold"
                        style={{
                            background: 'var(--accent)',
                            color: 'var(--bg)',
                            border: 'none',
                            borderRadius: '50px',
                        }}
                    >
                        Submit Grades
                    </button>
                </div>
            </div>
        </div>
    );
}
