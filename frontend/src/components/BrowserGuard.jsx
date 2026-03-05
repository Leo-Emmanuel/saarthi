import { useState, useEffect } from 'react';

export default function BrowserGuard({ children }) {
  const [dismissed, setDismissed] = useState(false);

  // Globally unlock Web Speech API on the very first user interaction
  useEffect(() => {
    const unlockSpeech = () => {
      if (window.speechSynthesis) {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return;
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
      }
      // Remove listeners once audio context is unlocked
      document.removeEventListener('click', unlockSpeech);
      document.removeEventListener('keydown', unlockSpeech);
    };

    document.addEventListener('click', unlockSpeech, { once: true, capture: true });
    document.addEventListener('keydown', unlockSpeech, { once: true, capture: true });

    return () => {
      document.removeEventListener('click', unlockSpeech);
      document.removeEventListener('keydown', unlockSpeech);
    };
  }, []);

  const isSupported =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  if (isSupported || dismissed) {
    return children;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        textAlign: 'center',
        gap: '24px'
      }}
    >
      <div style={{ fontSize: '64px' }}>⚠️</div>
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#FFE500',
          fontFamily: 'Lexend, sans-serif'
        }}
      >
        Browser Not Supported
      </h1>
      <p
        style={{
          fontSize: '20px',
          color: '#FFFFFF',
          maxWidth: '500px',
          lineHeight: 1.6,
          fontFamily: 'Lexend, sans-serif'
        }}
      >
        Voice features require Chrome or Edge browser.
        Please switch browsers to use Saarthi.
      </p>
      <button
        onClick={() => setDismissed(true)}
        style={{
          padding: '14px 32px',
          background: '#FFE500',
          color: '#000000',
          border: 'none',
          borderRadius: '50px',
          fontSize: '16px',
          fontWeight: 800,
          fontFamily: 'Lexend, sans-serif',
          cursor: 'pointer'
        }}
      >
        Continue in Keyboard Mode
      </button>
    </div>
  );
}

