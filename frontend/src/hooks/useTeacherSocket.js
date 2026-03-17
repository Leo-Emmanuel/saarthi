import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useTeacherSocket(onNewSubmission) {
    const socketRef = useRef(null);
    const onNewSubmissionRef = useRef(onNewSubmission);
    const [connected, setConnected] = useState(false);
    const socketUrl = import.meta.env.VITE_SOCKET_URL
        || `${window.location.protocol}//${window.location.hostname}:5000`;

    useEffect(() => {
        onNewSubmissionRef.current = onNewSubmission;
    }, [onNewSubmission]);

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
        return () => {
            socketRef.current?.emit('leave_teacher');
            socketRef.current?.disconnect();
        };
    }, [socketUrl]);

    return { connected };
}
