export function accessibleAlert(message, speakFn) {
    if (speakFn && typeof speakFn === 'function') {
        try { speakFn(message); } catch (e) { console.error(e); }
    } else if (window.speechSynthesis) {
        try {
            const u = new SpeechSynthesisUtterance(message);
            window.speechSynthesis.speak(u);
        } catch (e) { console.error(e); }
    }

    window.dispatchEvent(new CustomEvent('accessible-alert', { detail: { message } }));
}
