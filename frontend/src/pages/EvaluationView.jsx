import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

import { fetchEvaluationData, submitGrades, computeTotalScore } from './evaluationApi';
import QuestionPanel from './QuestionPanel';
import GradingPanel from './GradingPanel';

// ── Data-fetching hook ───────────────────────────────────────────────────────

function useEvaluationData(id, isReady) {
    const [submission, setSubmission] = useState(null);
    const [exam, setExam] = useState(null);
    const [grades, setGrades] = useState({});
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isReady) return;

        let cancelled = false;
        (async () => {
            try {
                const data = await fetchEvaluationData(id);
                if (cancelled) return;
                setSubmission(data.submission);
                setExam(data.exam);
                setGrades(data.grades);
                setFeedback(data.feedback);
            } catch (err) {
                if (!cancelled) setError(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id, isReady]);

    // parseFloat preserves decimal values for partial marks
    const updateGrade = useCallback((qId, mark) => {
        setGrades(prev => ({ ...prev, [qId]: parseFloat(mark) || 0 }));
    }, []);

    return { submission, exam, grades, feedback, setFeedback, updateGrade, loading, error };
}

// ── Main component (coordinator only) ────────────────────────────────────────

export default function EvaluationView() {
    const { user, initializing } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    const isAuthorized = Boolean(user && (user.role === 'teacher' || user.role === 'admin'));

    const {
        submission, exam, grades, feedback, setFeedback, updateGrade, loading, error,
    } = useEvaluationData(id, !initializing && isAuthorized);

    const handleSubmit = useCallback(async () => {
        try {
            await submitGrades(id, grades, feedback);
            alert('Grading saved successfully!');
            navigate('/teacher');
        } catch {
            alert('Failed to save grades.');
        }
    }, [id, grades, feedback, navigate]);

    // ── Render guards ────────────────────────────────────────────────────

    if (initializing) return <div className="p-8" style={{ background: 'var(--bg)', color: 'var(--text)' }}>Loading...</div>;

    if (!isAuthorized) {
        return (
            <div className="p-8 font-semibold" style={{ background: 'var(--bg)', color: 'var(--danger)' }}>
                ⚠ Access denied. This page is only available to teachers and administrators.
            </div>
        );
    }

    if (loading) return <div className="p-8" style={{ background: 'var(--bg)', color: 'var(--text)' }}>Loading evaluation…</div>;
    if (error || !submission || !exam) return <div className="p-8" style={{ background: 'var(--bg)', color: 'var(--text)' }}>Error loading evaluation data.</div>;

    // Filter questions without _id — they can't be used for answer/grade lookups
    const questions = (exam.questions || []).filter(q => q._id);
    const questionIds = questions.map(q => q._id);
    const rawAnswers = submission.answers || {};
    const answers = Array.isArray(rawAnswers)
        ? rawAnswers.reduce((acc, curr) => {
            acc[curr.question_id || curr.questionId] = curr.text || curr.answer || curr.content || '';
            return acc;
        }, {})
        : rawAnswers;
    const audioFiles = submission.audio_files || {};
    // Only sum grades for current exam questions — ignores stale keys
    const totalScore = computeTotalScore(grades, questionIds);

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
            <Navbar />
            <div className="flex-1 flex flex-col md:flex-row" style={{ height: 'calc(100vh - 64px)' }}>
                <QuestionPanel exam={exam} questions={questions} />
                <GradingPanel
                    questions={questions}
                    answers={answers}
                    audioFiles={audioFiles}
                    grades={grades}
                    onGradeChange={updateGrade}
                    feedback={feedback}
                    onFeedbackChange={setFeedback}
                    totalScore={totalScore}
                    onSubmit={handleSubmit}
                />
            </div>
        </div>
    );
}
