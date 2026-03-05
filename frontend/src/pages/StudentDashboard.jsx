import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import Navbar from '../components/Navbar';
import useExamVoiceGuidance from '../hooks/useExamVoiceGuidance';
import StudentDashboardHeader from '../components/StudentDashboardHeader';
import StudentExamCard from '../components/StudentExamCard';

// ✅ Derive file-server origin from the centralized axios config (no hardcoded localhost)
const FILE_ORIGIN = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

export default function StudentDashboard() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const fetchSeqRef = useRef(0);

    const fetchExams = useCallback(async () => {
        const fetchSeq = ++fetchSeqRef.current;
        setLoading(true);
        try {
            const res = await api.get('/exam/');
            if (fetchSeq !== fetchSeqRef.current) return;
            setExams(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            if (fetchSeq !== fetchSeqRef.current) return;
            console.error('Failed to fetch exams', error);
            setExams([]);
        } finally {
            if (fetchSeq === fetchSeqRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExams();
    }, [fetchExams]);

    const navigateToExam = useCallback((exam) => {
        const examId = exam?._id;
        if (!examId) return;
        // Route all exam modalities through the generic exam view.
        // ExamView derives MCQ vs written vs mixed based on questions.
        navigate(`/exam/${examId}`);
    }, [navigate]);

    const [isVoiceActive, setIsVoiceActive] = useState(false);

    const { startVoiceGuidance } = useExamVoiceGuidance({
        exams,
        onChooseExam: navigateToExam,
        autoStart: true,
        isLoading: loading,
        onVoiceStart: () => setIsVoiceActive(true),
        onVoiceEnd: () => setIsVoiceActive(false),
    });

    return (
        <div
            className="min-h-screen"
            style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
            <Navbar />
            <div className="max-w-4xl mx-auto p-6">
                <StudentDashboardHeader
                    onStartVoiceGuidance={() => {
                        startVoiceGuidance();
                        setIsVoiceActive(true);
                    }}
                    voiceActive={isVoiceActive}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {exams.map((exam, index) => (
                        <StudentExamCard
                            key={exam._id}
                            exam={exam}
                            index={index}
                            fileOrigin={FILE_ORIGIN}
                            onStart={() => navigateToExam(exam)}
                        />
                    ))}
                    {loading ? (
                        <p style={{ color: 'var(--muted)' }}>Loading exams...</p>
                    ) : exams.length === 0 ? (
                        <p style={{ color: 'var(--muted)' }}>No exams available at the moment.</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

