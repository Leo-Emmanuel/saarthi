import { useEffect } from 'react';

export default function usePageTitle(title) {
    useEffect(() => {
        const prev = document.title;
        document.title = title ? `${title} — Saarthi` : 'Saarthi — Accessible Exam System';
        return () => { document.title = prev; };
    }, [title]);
}
