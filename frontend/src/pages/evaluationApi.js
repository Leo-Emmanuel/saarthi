/**
 * Evaluation API — data-fetching and submission helpers for grading.
 */
import api from '../config/axios';

/** Fetch a submission and its associated exam data. */
export async function fetchEvaluationData(submissionId) {
    const subRes = await api.get(`/evaluation/submissions/${submissionId}`);
    const subData = subRes.data;

    // Coerce grade values to numbers (supports decimals for partial marks)
    const grades = Object.fromEntries(
        Object.entries(subData.grades || {}).map(([k, v]) => [k, Number(v) || 0]),
    );

    const examRes = await api.get(`/exam/${subData.exam_id}`);

    return {
        submission: subData,
        exam: examRes.data,
        grades,
        feedback: subData.feedback || '',
    };
}

/** Submit grades and feedback for a submission. */
export async function submitGrades(submissionId, grades, feedback) {
    await api.post(`/evaluation/submissions/${submissionId}/grade`, { grades, feedback });
}

/**
 * Calculate total score from only the questions in the current exam.
 * Ignores stale grade keys that don't match any current question.
 */
export function computeTotalScore(grades, questionIds) {
    return questionIds.reduce((sum, qId) => sum + (grades[qId] || 0), 0);
}
