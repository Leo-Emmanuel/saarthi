/**
 * MathRenderer.jsx
 *
 * Renders a string that may contain $...$ LaTeX inline blocks.
 * Uses KaTeX for rendering. Falls back to plain text on parse errors.
 *
 * Usage:
 *   <MathRenderer text="$x^{2} + 3x - 5 = 0$" />
 *   <MathRenderer text="The answer is $\\frac{\\pi}{2}$ radians" />
 */
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Parse a string and split it into LaTeX and plain-text segments.
 * Supports $...$ delimiters (inline).
 *
 * @param {string} text
 * @returns {Array<{ type: 'text'|'latex', value: string }>}
 */
function parseSegments(text) {
    if (!text) return [{ type: 'text', value: '' }];
    const segments = [];
    // Match $...$ but not $$...$$
    const regex = /\$([^\$]+)\$/g;
    let last = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > last) {
            segments.push({ type: 'text', value: text.slice(last, match.index) });
        }
        segments.push({ type: 'latex', value: match[1] });
        last = match.index + match[0].length;
    }
    if (last < text.length) {
        segments.push({ type: 'text', value: text.slice(last) });
    }
    return segments.length > 0 ? segments : [{ type: 'text', value: text }];
}

/**
 * Render a single LaTeX segment via KaTeX.
 * Returns an HTML string or falls back to '⚠ [math error]'.
 */
function renderLatex(latex) {
    try {
        return katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
            output: 'html',
            strict: false,
        });
    } catch {
        return `<span style="color:var(--red,#f44)">[math error: ${latex}]</span>`;
    }
}

export default function MathRenderer({ text, style = {}, className = '' }) {
    const segments = useMemo(() => parseSegments(text), [text]);

    const html = useMemo(() => {
        return segments.map((seg) => {
            if (seg.type === 'latex') return renderLatex(seg.value);
            // Plain text — escape HTML
            return seg.value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }).join('');
    }, [segments]);

    return (
        <span
            className={className}
            style={{ lineHeight: 1.7, ...style }}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
