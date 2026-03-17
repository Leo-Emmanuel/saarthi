import { useEffect, useState } from 'react';

export default function GlobalAlert() {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const handleAlert = (e) => {
            const id = Date.now() + Math.random();
            const message = e.detail.message;
            setAlerts(prev => [...prev, { id, message }]);
            setTimeout(() => {
                setAlerts(prev => prev.filter(a => a.id !== id));
            }, 5000);
        };
        window.addEventListener('accessible-alert', handleAlert);
        return () => window.removeEventListener('accessible-alert', handleAlert);
    }, []);

    if (alerts.length === 0) return null;

    return (
        <div 
            role="status" 
            aria-live="polite"
            style={{
                position: 'fixed',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: '99999',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                pointerEvents: 'none',
            }}
        >
            {alerts.map(a => (
                <div
                    key={a.id}
                    style={{
                        background: 'var(--surface2, #222)',
                        color: 'var(--yellow, #fadb5f)',
                        padding: '14px 24px',
                        borderRadius: '8px',
                        border: '2px solid var(--yellow, #fadb5f)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.6)',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        textAlign: 'center',
                    }}
                >
                    {a.message}
                </div>
            ))}
        </div>
    );
}
