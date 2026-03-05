export function getExamIntroMessage(examType, counts) {
    if (examType === 'mcq-only') {
        return `This is a multiple choice exam with ${counts.total} questions. For each question say A, B, C, or D to select your answer.`;
    }
    if (examType === 'writing-only') {
        return `This is a written answer exam with ${counts.total} questions. Speak your answer freely or type in the answer box for each question.`;
    }
    if (examType === 'mixed') {
        return `This exam has ${counts.total} questions: ${counts.mcq} multiple choice and ${counts.writing} written answer questions. For MCQ questions say A B C or D. For written questions speak your answer freely.`;
    }
    return 'Exam is ready. Press space to begin.';
}

export function getQuestionInstruction(question, number, total) {
    if (!question) return `Question ${number} of ${total}.`;
    const prefix = `Question ${number} of ${total}.`;

    if (question.type === 'mcq') {
        const opts = (question.options || [])
            .map((o, i) => `${String.fromCharCode(65 + i)}: ${o}`)
            .join('. ');
        return `${prefix} Multiple choice. ${question.text}. Options are: ${opts}. Say A, B, C, or D.`;
    }

    if (question.type === 'text' || question.type === 'voice') {
        return `${prefix} Written answer. ${question.text}. Speak your answer or type below. Say command next when finished.`;
    }

    return `${prefix} ${question.text}`;
}
