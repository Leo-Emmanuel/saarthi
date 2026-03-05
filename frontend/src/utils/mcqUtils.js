export const MCQ_LETTERS = ['A', 'B', 'C', 'D'];

export const normalizeQuestionType = (type) => (type === 'mcq' ? 'mcq' : 'text');

export const normalizeMcqLetter = (raw = '') => {
    const text = String(raw).trim().toLowerCase();

    // Exact / common homophones first
    if (['a', 'option a', 'answer a', 'hey', 'ay', 'eh'].includes(text)) return 'A';
    if (['b', 'option b', 'answer b', 'be', 'bee'].includes(text)) return 'B';
    if (['c', 'option c', 'answer c', 'see', 'sea'].includes(text)) return 'C';
    if (['d', 'option d', 'answer d', 'dee', 'the'].includes(text)) return 'D';

    // Natural phrases: "my answer is A", "I think B", "I'll go with C", "choose D"
    // Match "option/answer/choose/select/pick/go with/think/is/it's <letter>" patterns
    const naturalMatch = text.match(
        /\b(?:option|answer|choose|select|pick|go\s+with|think|is|it'?s|i\s+think|select|my\s+answer\s+is|i\s+choose|i\s+say|i\s+pick)\s+([abcd])\b/i
    );
    if (naturalMatch) {
        return naturalMatch[1].toUpperCase();
    }

    // Standalone letter anywhere in the transcript as a last resort
    // Only if a single letter is clearly spoken: "A", "B", "C", "D" as standalone word
    const standaloneMatch = text.match(/\b([abcd])\b/);
    if (standaloneMatch) {
        return standaloneMatch[1].toUpperCase();
    }

    return '';
};

export const resolveMcqSelection = (question, answer) => {
    const options = Array.isArray(question?.options) ? question.options.slice(0, 4) : [];
    const byLetter = normalizeMcqLetter(answer);
    if (byLetter) {
        const idx = MCQ_LETTERS.indexOf(byLetter);
        if (idx >= 0 && options[idx]) return { answered: true, letter: byLetter, option: options[idx], index: idx };
    }

    const normalized = String(answer || '').trim().toLowerCase();
    const idx = options.findIndex((opt) => String(opt || '').trim().toLowerCase() === normalized);
    return idx >= 0 ? { answered: true, letter: MCQ_LETTERS[idx], option: options[idx], index: idx } : { answered: false };
};

export const isQuestionAnswered = (question, answer) => {
    if (!question) return false;
    if (normalizeQuestionType(question.type) === 'mcq') return resolveMcqSelection(question, answer).answered;
    return String(answer || '').trim().length > 5;
};

export const countAnsweredByType = (questions = [], answers = {}) => {
    const total = questions.length;
    const totalMcq = questions.filter(q => normalizeQuestionType(q.type) === 'mcq').length;
    const totalWritten = total - totalMcq;
    const answered = questions.filter(q => isQuestionAnswered(q, answers[q?._id])).length;
    const mcqAnswered = questions
        .filter(q => normalizeQuestionType(q.type) === 'mcq')
        .filter(q => String(answers[q?._id] || '').length > 0)
        .length;
    const writtenAnswered = questions
        .filter(q => normalizeQuestionType(q.type) !== 'mcq')
        .filter(q => String(answers[q?._id] || '').trim().length > 5)
        .length;

    return { total, totalMcq, totalWritten, answered, mcqAnswered, writtenAnswered };
};
