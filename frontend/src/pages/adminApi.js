/**
 * Admin API — data-fetching helpers for the admin dashboard.
 *
 * Separates HTTP / API orchestration from UI components.
 */
import api from '../config/axios';

/** Fetch the list of registered students. */
export async function fetchStudents() {
    const res = await api.get('/auth/students');
    return res.data;
}

/** Fetch all exams. */
export async function fetchExams() {
    const res = await api.get('/exam/');
    return res.data;
}

/**
 * Upload a question paper file.
 * @returns {string} the file_url returned by the server.
 */
export async function uploadQuestionPaper(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/exam/upload', formData);
    return res.data.file_url;
}

/** Create a new exam. */
export async function createExam({ title, description, duration, file_path }) {
    await api.post('/exam/create', {
        title,
        description,
        duration: parseInt(duration, 10),
        file_url: file_path, // backend expects snake_case 'file_url'
        questions: [],
    });
}

/** Delete an exam by ID. */
export async function deleteExam(examId) {
    await api.delete(`/exam/${examId}`);
}
