import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { FILE_ORIGIN } from '../config/fileOrigin';

export function useTeacherSocket(onNewSubmission, onSubmissionGraded) {
    const socketRef = useRef(null);
    const onNewSubmissionRef = useRef(onNewSubmission);
    const onSubmissionGradedRef = useRef(onSubmissionGraded);
    const [connected, setConnected] = useState(false);
    const socketUrl = import.meta.env.VITE_SOCKET_URL || FILE_ORIGIN;

    useEffect(() => {
        onNewSubmissionRef.current = onNewSubmission;
        onSubmissionGradedRef.current = onSubmissionGraded;
    }, [onNewSubmission, onSubmissionGraded]);

    useEffect(() => {
        socketRef.current = io(socketUrl, {
            transports: ['polling', 'websocket'],
            withCredentials: true,
        });
        socketRef.current.emit('join_teacher');
        socketRef.current.on('connect', () => setConnected(true));
        socketRef.current.on('disconnect', () => setConnected(false));
        socketRef.current.on('new_submission', (submission) => {
            if (onNewSubmissionRef.current) onNewSubmissionRef.current(submission);
        });
        socketRef.current.on('submission_graded', (submission) => {
            if (onSubmissionGradedRef.current) onSubmissionGradedRef.current(submission);
        });
        return () => {
            socketRef.current?.emit('leave_teacher');
            socketRef.current?.disconnect();
        };
    }, [socketUrl]);

    return { connected };
}
