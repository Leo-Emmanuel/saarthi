import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_ANNOUNCEMENTS = {
  '/login': 'You are on the login page.',
  '/voice-login': 'You are on the voice login page. Say your student ID to begin.',
  '/student': 'You are on the student dashboard. Your available exams are listed here.',
  '/teacher': 'You are on the teacher dashboard.',
  '/admin': 'You are on the admin dashboard.',
};

function getAnnouncement(pathname) {
  if (PAGE_ANNOUNCEMENTS[pathname]) return PAGE_ANNOUNCEMENTS[pathname];
  if (pathname.startsWith('/exam/')) return ('Your exam paper is ready. ' + 'Tap the screen or press the Space bar to start. ' + 'Questions will be read aloud automatically.');
  if (pathname.startsWith('/evaluation/')) return 'You are on the evaluation page.';
  return null;
}

export default function usePageVoice() {
  const location = useLocation();
  const prevPathRef = useRef(null);

  useEffect(() => {
    const path = location.pathname;

    // Do not announce on first load, only on navigation changes.
    if (prevPathRef.current === null) {
      prevPathRef.current = path;
      return;
    }

    if (prevPathRef.current === path) return;
    prevPathRef.current = path;

    const text = getAnnouncement(path);
    if (!text) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 600);
    } catch (e) {
      console.error('[PageVoice] TTS error:', e);
    }
  }, [location.pathname]);
}
