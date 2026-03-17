import re

with open('src/pages/ExamView.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix undoCurrent
undo_old = '''    const undoCurrent = useCallback(() => {
        const qId = currentQuestion?._id != null ? String(currentQuestion._id) : null;
        if (!qId) return;

        let nextAnswers = null;
        setAnswerHistory(prevHist => {
            const entry = prevHist[qId];
            if (!entry || entry.past.length === 0) return prevHist;
            const previousValue = entry.past[entry.past.length - 1];
            const newPast = entry.past.slice(0, -1);
            const currentValue = answersRef.current[qId] ?? '';
            const newFuture = [currentValue, ...(entry.future || [])];
            nextAnswers = { ...answersRef.current, [qId]: previousValue };
            return {
                ...prevHist,
                [qId]: { past: newPast, future: newFuture },
            };
        });

        if (nextAnswers) {
            answersRef.current = nextAnswers;
            setAnswers(nextAnswers);
            draftDirtyRef.current = true;
            clearTimeout(draftTimerRef.current);
            const delay = examType === 'writing-only' ? DRAFT_SAVE_DELAY_WRITTEN : DRAFT_SAVE_DELAY_MCQ;
            draftTimerRef.current = setTimeout(() => saveDraft(nextAnswers), delay);
        }
    }, [currentQuestion, examType, saveDraft]);'''

undo_new = '''    const undoCurrent = useCallback(() => {
        const qId = currentQuestion?._id != null ? String(currentQuestion._id) : null;
        if (!qId) return;

        setAnswerHistory(prevHist => {
            const entry = prevHist[qId];
            if (!entry || entry.past.length === 0) return prevHist;
            const previousValue = entry.past[entry.past.length - 1];
            const newPast = entry.past.slice(0, -1);
            const currentValue = answersRef.current[qId] ?? '';
            const newFuture = [currentValue, ...(entry.future || [])];
            const nextAnswers = { ...answersRef.current, [qId]: previousValue };
            
            setTimeout(() => {
                answersRef.current = nextAnswers;
                setAnswers(nextAnswers);
                draftDirtyRef.current = true;
                clearTimeout(draftTimerRef.current);
                const delay = examType === 'writing-only' ? DRAFT_SAVE_DELAY_WRITTEN : DRAFT_SAVE_DELAY_MCQ;
                draftTimerRef.current = setTimeout(() => saveDraft(nextAnswers), delay);
            }, 0);

            return {
                ...prevHist,
                [qId]: { past: newPast, future: newFuture },
            };
        });
    }, [currentQuestion, examType, saveDraft]);'''

# Fix redoCurrent  
redo_old = '''    const redoCurrent = useCallback(() => {
        const qId = currentQuestion?._id != null ? String(currentQuestion._id) : null;
        if (!qId) return;

        let nextAnswers = null;
        setAnswerHistory(prevHist => {
            const entry = prevHist[qId];
            if (!entry || !entry.future || entry.future.length === 0) return prevHist;
            const nextValue = entry.future[0];
            const newFuture = entry.future.slice(1);
            const currentValue = answersRef.current[qId] ?? '';
            const newPast = [...(entry.past || []), currentValue];
            nextAnswers = { ...answersRef.current, [qId]: nextValue };
            return {
                ...prevHist,
                [qId]: { past: newPast, future: newFuture },
            };
        });

        if (nextAnswers) {
            answersRef.current = nextAnswers;
            setAnswers(nextAnswers);
            draftDirtyRef.current = true;
            clearTimeout(draftTimerRef.current);
            const delay = examType === 'writing-only' ? DRAFT_SAVE_DELAY_WRITTEN : DRAFT_SAVE_DELAY_MCQ;
            draftTimerRef.current = setTimeout(() => saveDraft(nextAnswers), delay);
        }
    }, [currentQuestion, examType, saveDraft]);'''

redo_new = '''    const redoCurrent = useCallback(() => {
        const qId = currentQuestion?._id != null ? String(currentQuestion._id) : null;
        if (!qId) return;

        setAnswerHistory(prevHist => {
            const entry = prevHist[qId];
            if (!entry || !entry.future || entry.future.length === 0) return prevHist;
            const nextValue = entry.future[0];
            const newFuture = entry.future.slice(1);
            const currentValue = answersRef.current[qId] ?? '';
            const newPast = [...(entry.past || []), currentValue];
            const nextAnswers = { ...answersRef.current, [qId]: nextValue };
            
            setTimeout(() => {
                answersRef.current = nextAnswers;
                setAnswers(nextAnswers);
                draftDirtyRef.current = true;
                clearTimeout(draftTimerRef.current);
                const delay = examType === 'writing-only' ? DRAFT_SAVE_DELAY_WRITTEN : DRAFT_SAVE_DELAY_MCQ;
                draftTimerRef.current = setTimeout(() => saveDraft(nextAnswers), delay);
            }, 0);

            return {
                ...prevHist,
                [qId]: { past: newPast, future: newFuture },
            };
        });
    }, [currentQuestion, examType, saveDraft]);'''

content = content.replace(undo_old, undo_new)
content = content.replace(redo_old, redo_new)
content = content.replace(undo_old.replace('\\n', '\\r\\n'), undo_new.replace('\\n', '\\r\\n'))
content = content.replace(redo_old.replace('\\n', '\\r\\n'), redo_new.replace('\\n', '\\r\\n'))

with open('src/pages/ExamView.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced!")
