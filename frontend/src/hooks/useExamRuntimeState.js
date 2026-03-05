import { useState, useRef } from 'react';

export default function useExamRuntimeState() {
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [answers, setAnswers] = useState({});
    const [audioFiles] = useState({});
    const [saveStatus, setSaveStatus] = useState('saved');
    const [voiceMode, setVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showReview, setShowReview] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [showTransitionCard, setShowTransitionCard] = useState(false);
    const [transitionType, setTransitionType] = useState(null);
    const [gradingStatus, setGradingStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const answersRef = useRef({});
    const audioFilesRef = useRef({});
    const draftSaveTimerRef = useRef(null);
    const speechTokenRef = useRef(0);
    const mountedRef = useRef(true);
    const lastTypeRef = useRef(null);
    const autoAdvanceRef = useRef(null);
    const mcqAdvanceTokenRef = useRef(0);
    const mcqSelectionLockedRef = useRef(false);
    const mcqSelectionOpRef = useRef(0);
    const introTimerRef = useRef(null);
    const questionTimerRef = useRef(null);
    const draftDirtyRef = useRef(false);
    const draftSaveInFlightRef = useRef(false);
    const queuedDraftRef = useRef(null);
    const activeRecognitionRef = useRef(null);
    const startRecognitionTimerRef = useRef(null);

    return {
        exam, setExam,
        loading, setLoading,
        error, setError,
        answers, setAnswers,
        audioFiles,
        saveStatus, setSaveStatus,
        voiceMode, setVoiceMode,
        isListening, setIsListening,
        currentIndex, setCurrentIndex,
        showReview, setShowReview,
        showWarning, setShowWarning,
        showTransitionCard, setShowTransitionCard,
        transitionType, setTransitionType,
        gradingStatus, setGradingStatus,
        isSubmitting, setIsSubmitting,
        answersRef,
        audioFilesRef,
        draftSaveTimerRef,
        speechTokenRef,
        mountedRef,
        lastTypeRef,
        autoAdvanceRef,
        mcqAdvanceTokenRef,
        mcqSelectionLockedRef,
        mcqSelectionOpRef,
        introTimerRef,
        questionTimerRef,
        draftDirtyRef,
        draftSaveInFlightRef,
        queuedDraftRef,
        activeRecognitionRef,
        startRecognitionTimerRef,
    };
}
