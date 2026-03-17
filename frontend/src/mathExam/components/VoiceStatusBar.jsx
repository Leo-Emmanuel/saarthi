/**
 * VoiceStatusBar.jsx
 * Persistent bottom toolbar showing mic state, mode, verbosity, last command.
 */

import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';

const MicIcon = ({ isListening, isProcessing }) => (
    <div className="relative flex items-center justify-center w-10 h-10">
        {isListening && (
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: 'rgba(255,229,0,0.3)' }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            />
        )}
        <div
            className="w-10 h-10 rounded-full flex items-center justify-center z-10 text-lg transition-colors duration-200"
            style={{
                background: isListening ? 'var(--accent)' : isProcessing ? 'var(--warn)' : 'var(--border)',
                boxShadow: isListening ? '0 0 0 4px rgba(255,229,0,0.3)' : 'none',
            }}
        >
            {isProcessing ? '⚙️' : isListening ? '🎙️' : '🎤'}
        </div>
    </div>
);

const VerbosityChip = ({ mode }) => (
    <span
        className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
        style={{
            background: mode === 'brief' ? 'var(--accent)' : 'var(--accent2)',
            color: 'var(--bg)',
        }}
    >
        {mode} reading
    </span>
);

const VoiceStatusBar = () => {
    const {
        isListening,
        isProcessing,
        verbosityMode,
        lastSpokenCommand,
        lastAudioFeedback,
        pendingConfirmation,
    } = useSelector(s => s.mathExam);

    return (
        <div
            role="status"
            aria-live="assertive"
            aria-label="Voice system status"
            className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3"
            style={{
                background: 'var(--surface)',
                borderTop: '3px solid var(--border)',
            }}
        >
            <div className="max-w-6xl mx-auto flex items-center gap-4 flex-wrap">
                <MicIcon isListening={isListening} isProcessing={isProcessing} />

                <div className="flex flex-col min-w-0 flex-1">
                    {/* Status text */}
                    <p className="text-sm font-medium leading-tight truncate" style={{ color: isListening ? 'var(--accent)' : 'var(--text)' }}>
                        {isProcessing
                            ? '⚙️ Processing your input…'
                            : isListening
                                ? '🎙️ Listening…'
                                : '🔇 Standby — say a command or expression'
                        }
                    </p>

                    {/* Last command feedback */}
                    <AnimatePresence>
                        {lastAudioFeedback && (
                            <motion.p
                                key={lastAudioFeedback}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-xs truncate mt-0.5"
                                style={{ color: 'var(--muted)' }}
                                aria-live="assertive"
                            >
                                💬 {lastAudioFeedback}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    {/* Confirmation prompt */}
                    {pendingConfirmation && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs font-semibold mt-1"
                            style={{ color: 'var(--warn)' }}
                            role="alert"
                            aria-live="assertive"
                        >
                            ❓ {pendingConfirmation.prompt}
                        </motion.p>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <VerbosityChip mode={verbosityMode} />
                </div>

                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Say "command [action]" or use core commands directly
                </span>

                {/* Key shortcut hint */}
                <div className="hidden md:flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                    <kbd style={{ background: 'var(--card)', padding: '2px 6px', borderRadius: 4, border: '2px solid var(--border)' }}>Space</kbd>
                    <span>= listen</span>
                    <kbd style={{ background: 'var(--card)', padding: '2px 6px', borderRadius: 4, border: '2px solid var(--border)', marginLeft: 8 }}>Esc</kbd>
                    <span>= stop</span>
                </div>
            </div>
        </div>
    );
};

export default VoiceStatusBar;
