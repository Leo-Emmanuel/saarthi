const styles = {
    card: {
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        border: '3px solid var(--border)',
        padding: 24,
        boxShadow: '0 0 0 rgba(0,0,0,0)',
    },
    indexBadge: {
        background: 'var(--surface)',
        color: 'var(--muted)',
        borderRadius: '999px',
        width: 32,
        height: 32,
        border: '2px solid var(--border)',
    },
    title: {
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: 6,
    },
    description: {
        fontSize: 14,
        color: 'var(--muted)',
        marginBottom: 12,
    },
    metaRow: {
        fontSize: 13,
        color: 'var(--muted)',
    },
    durationPill: {
        borderRadius: 999,
        border: '2px solid var(--warn)',
        padding: '2px 10px',
        color: 'var(--warn)',
    },
    paperLink: {
        color: 'var(--accent)',
        textDecoration: 'underline',
    },
    createdAt: {
        fontSize: 12,
        color: 'var(--muted)',
    },
    startButton: {
        background: 'var(--accent)',
        color: 'var(--bg)',
        fontWeight: 800,
        borderRadius: 50,
        padding: '12px 24px',
        fontSize: 15,
        border: 'none',
        transform: 'translateY(0)',
    },
};

export default function StudentExamCard({ exam, index, fileOrigin, onStart }) {
    const examIndex = index + 1;

    return (
        <div
            className="relative transition"
            style={styles.card}
            role="article"
            aria-label={`Exam ${examIndex}: ${exam.title}`}
        >
            <div
                className="absolute top-2 right-2 flex items-center justify-center font-bold"
                style={styles.indexBadge}
            >
                {examIndex}
            </div>
            <h2 style={styles.title}>{exam.title}</h2>
            <p style={styles.description}>{exam.description}</p>
            <div className="flex justify-between items-center mb-3" style={styles.metaRow}>
                <span>
                    Duration:{' '}
                    <span style={styles.durationPill}>{exam.duration} mins</span>
                </span>
                {exam.file_url && (
                    <a
                        href={`${fileOrigin}${exam.file_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.paperLink}
                        aria-label={`View question paper for ${exam.title}`}
                    >
                        View Question Paper
                    </a>
                )}
            </div>
            <div className="mb-4" style={styles.createdAt}>
                Created: {new Date(exam.created_at).toLocaleDateString()}
            </div>
            <button
                type="button"
                onClick={onStart}
                className="block w-full text-center"
                style={styles.startButton}
                aria-label={`Start exam ${exam.title}`}
            >
                ▶️ Start Exam
            </button>
        </div>
    );
}

