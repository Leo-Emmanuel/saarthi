/**
 * MathRenderer.jsx
 * Renders a LaTeX string visually using KaTeX (react-katex).
 * aria-hidden: visual-only, audio is primary.
 */

import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export const MathRenderer = ({ latex, block = true, className = '', label = '' }) => {
    if (!latex) return (
        <span
            aria-hidden="true"
            className={`inline-block min-w-[2rem] min-h-[2rem] border-2 border-dashed rounded px-2 ${className}`}
            style={{ borderColor: 'var(--accent)' }}
        >
            <span className="text-sm select-none" style={{ color: 'var(--accent)' }}>□</span>
        </span>
    );

    const Wrapper = block ? 'div' : 'span';
    return (
        <Wrapper
            aria-hidden="true"
            className={`math-renderer select-none ${className}`}
        >
            {block
                ? <BlockMath math={latex} errorColor="#ef4444" />
                : <InlineMath math={latex} errorColor="#ef4444" />
            }
        </Wrapper>
    );
};

export default MathRenderer;
