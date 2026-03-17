import { useState, useEffect } from 'react';

export default function BrowserGuard({ children }) {
  const [dismissed, setDismissed] = useState(false);

  const speakAfterGesture = (text) => {
    const speak = () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    };

    if (!window.speechSynthesis) return;

    // If the user has already interacted, speak immediately.
    if (navigator.userActivation?.hasBeenActive) {
      speak();
      return;
    }

    // Only speak once after the first interaction.
    document.addEventListener('click', speak, { once: true });
    document.addEventListener('keydown', speak, { once: true });
    document.addEventListener('touchstart', speak, { once: true });
  };

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

  useEffect(() => {
    if (!isSupported && !dismissed) {
      const warningText =
        'Browser not supported. Voice features require Chrome or Edge. Please switch browsers or press the button to continue in keyboard mode.';

      // Small delay to ensure audio context is ready.
      const t = setTimeout(() => speakAfterGesture(warningText), 600);
      return () => {
        clearTimeout(t);
        window.speechSynthesis?.cancel();
      };
    }
  }, [isSupported, dismissed]);

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
        id="browser-warning-desc"
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
        aria-describedby="browser-warning-desc"
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

