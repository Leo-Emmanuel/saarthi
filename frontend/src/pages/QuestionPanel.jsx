import { FILE_ORIGIN } from '../config/fileOrigin';
import '../styles/dashboard.css';

/**
 * QuestionPanel - left side showing exam questions and optional paper embed.
 */
export default function QuestionPanel({ exam, questions }) {
    const renderCorrectAnswer = (q) => {
        const raw = q?.correct_answer ?? q?.correctAnswer ?? q?.answer ?? q?.solution;
        const hasOptions = Array.isArray(q?.options) && q.options.length > 0;
        const isMcq = q?.type === 'mcq' || hasOptions;

        const rawText = raw === undefined || raw === null ? '' : String(raw).trim();
        const isMissing = raw === undefined || raw === null;

        if (!isMcq) {
            return rawText ? rawText : 'Open answer — no correct answer set';
        }

        if (!rawText) {
            return isMissing ? 'N/A' : 'Open answer — no correct answer set';
        }

        const match = rawText.match(/^\s*\(?([A-D])\)?[)\.:]?\s*/i);
        const letter = match ? match[1].toUpperCase() : null;
        if (!letter) {
            return rawText;
        }

        const letters = ['A', 'B', 'C', 'D'];
        const idx = letters.indexOf(letter);
        const optionText = hasOptions && idx >= 0 ? q.options[idx] : '';
        return optionText ? `${letter}: ${optionText}` : letter;
    };

    return (
        <div className="question-panel w-full md:w-1/2 p-5 overflow-y-auto">
            <h2 className="question-title">Exam: {exam.title}</h2>
            {exam.file_url && (
                <>
                    <div className="pdf-label">Question Paper</div>
                    <iframe
                        src={`${FILE_ORIGIN}${exam.file_url}`}
                        className="pdf-frame w-full h-[400px] mb-6"
                        title="Question Paper"
                    />
                </>
            )}
            <h3 className="questions-heading">Questions Reference</h3>
            <div className="question-list">
                {questions.map((q, i) => (
                    <div key={q._id} className="question-card">
                        <p className="question-text">
                            <span className="question-label">Q{i + 1}:</span> {q.text} ({q.marks} marks)
                        </p>
                        <p className="answer-correct">Correct Answer: {renderCorrectAnswer(q)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
