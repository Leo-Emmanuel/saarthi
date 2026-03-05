import { useState } from 'react';

export default function MCQOptionCard({
    id,
    name,
    letter,
    text,
    checked = false,
    onChange,
    disabled = false,
}) {
    const [hovered, setHovered] = useState(false);
    const active = checked || hovered;
    return (
        <label
            htmlFor={id}
            className="exam-focus"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 20px',
                border: `1.5px solid ${checked ? 'var(--yellow)' : hovered ? 'var(--yellow-dim)' : 'var(--border)'}`,
                borderRadius: 10,
                background: checked ? 'var(--yellow-bg2)' : 'var(--surface)',
                transform: active ? 'translateX(4px)' : 'translateX(0px)',
                transition: 'transform 0.15s, border-color 0.15s, background 0.15s',
                cursor: disabled ? 'default' : 'pointer',
                position: 'relative',
                opacity: disabled ? 0.8 : 1,
                minHeight: 56,
            }}
        >
            {/* hover/select overlay */}
            <span
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 10,
                    background: 'var(--yellow-bg)',
                    opacity: active ? 1 : 0,
                    transition: 'opacity 0.15s',
                    pointerEvents: 'none',
                }}
            />

            <input
                id={id}
                type="radio"
                name={name}
                value={letter}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                aria-label={`Option ${letter}: ${text}`}
                style={{
                    width: 18,
                    height: 18,
                    accentColor: 'var(--yellow)',
                    cursor: disabled ? 'default' : 'pointer',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                }}
            />

            {/* Letter badge */}
            <span
                aria-hidden="true"
                style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: `1.5px solid ${checked ? 'var(--yellow)' : 'var(--border)'}`,
                    background: checked ? 'var(--yellow)' : 'var(--surface)',
                    color: checked ? 'var(--black)' : 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {letter}
            </span>

            <span
                style={{
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {text}
            </span>

            {/* Check */}
            <span
                aria-hidden="true"
                style={{
                    marginLeft: 'auto',
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: 'var(--yellow)',
                    color: 'var(--black)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    opacity: checked ? 1 : 0,
                    transition: 'opacity 0.15s',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                ✓
            </span>
        </label>
    );
}

