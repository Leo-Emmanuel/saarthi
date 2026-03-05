import { FILE_ORIGIN } from '../config/fileOrigin';

/**
 * QuestionPanel — left side showing exam questions and optional paper embed.
 */
export default function QuestionPanel({ exam, questions }) {
    return (
        <div className="w-full md:w-1/2 p-4 bg-gray-200 border-r overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Exam: {exam.title}</h2>
            {exam.file_url && (
                <iframe
                    src={`${FILE_ORIGIN}${exam.file_url}`}
                    className="w-full h-[400px] border shadow-sm bg-white mb-6"
                    title="Question Paper"
                />
            )}
            <h3 className="font-bold mb-2">Questions Reference:</h3>
            <div className="space-y-4">
                {questions.map((q, i) => (
                    <div key={q._id} className="bg-white p-3 rounded shadow-sm">
                        <p><strong>Q{i + 1}:</strong> {q.text} ({q.marks} marks)</p>
                        <p className="text-sm text-green-700 mt-1">Correct Answer: {q.correct_answer || 'N/A'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
