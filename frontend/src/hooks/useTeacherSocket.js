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
            transports: ['polling'],  // Use polling only (WebSocket has issues on Render free tier)
            withCredentials: true,
            forceNew: true,           // Always create a fresh session — avoids stale sid 400 errors after redeploy
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: 10,
        });

        // Emit join AFTER the handshake is complete (not before)
        socketRef.current.on('connect', () => {
            setConnected(true);
            socketRef.current.emit('join_teacher');
        });

        socketRef.current.on('disconnect', () => setConnected(false));

        // Handle 400 bad-session errors: disconnect and let reconnection logic retry
        socketRef.current.on('connect_error', (err) => {
            console.warn('[SOCKET] connect_error:', err.message);
            // If server restarted, force a clean reconnect by disconnecting first
            if (err.message && (err.message.includes('400') || err.message.includes('session'))) {
                socketRef.current?.disconnect();
                setTimeout(() => socketRef.current?.connect(), 3000);
            }
        });

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
