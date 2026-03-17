export function normalizeSubmission(sub) {
    return {
        ...sub,
        student_name: sub.student_name || sub.studentName || sub.student || '',
        student_id: sub.student_id || sub.studentId || '',
        student_email: sub.student_email || sub.studentEmail || sub.studentId || '',
        exam_title: sub.exam_title || sub.examTitle || sub.exam?.title || sub.exam_name || sub.exam_id || '',
        submitted_at: sub.submitted_at || sub.submittedAt || sub.last_updated,
        is_graded: Boolean(sub.is_graded) || sub.status === 'graded',
        total_marks: sub.total_marks ?? sub.score ?? 0,
    };
}

export function exportToCSV(items) {
    const headers = ['Student Name', 'Student ID', 'Exam Title', 'Submitted At', 'Total Score', 'Status'];
    const rows = items.map(s => [
        s.student_name || '',
        s.student_id || '',
        s.exam_title || s.exam_id || '',
        s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '',
        s.total_marks ?? '',
        s.is_graded ? 'Graded' : 'Pending',
    ]);
    const csv = [headers, ...rows]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saarthi-grades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
