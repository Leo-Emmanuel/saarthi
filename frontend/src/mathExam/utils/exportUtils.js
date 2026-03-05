/**
 * exportUtils.js
 * Exports math workspace as LaTeX, MathJSON, or print-ready HTML.
 *
 * Responsibilities (intentionally narrow):
 *   · Build export strings/blobs from steps data.
 *   · Trigger browser file downloads.
 *   · Open a print-preview window (the only necessary browser UI interaction).
 *
 * Persistence lives in storageUtils.js.
 */

import { toLatex } from '../mathEngine/MathSerializer.js';

// ── Security helper ───────────────────────────────────────────────────────────

/**
 * Escape HTML special characters to prevent XSS when interpolating
 * user-supplied strings (title, questionText, latex) into an HTML template.
 *
 * @param {unknown} value
 * @returns {string}
 */
const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

// ── Shared file download helper ───────────────────────────────────────────────

const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // ✅ Defer revocation so the browser has time to start the download.
    // Immediate revocation after .click() races the browser's navigation to the
    // blob URL; on some browsers the URL is already gone before download begins.
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

// ── LaTeX Export ──────────────────────────────────────────────────────────────

export const exportAsLatex = (steps, meta = {}) => {
    const { title = 'Math Exam Answer', author = 'Student' } = meta;

    const alignedContent = steps.map((step, i) => {
        const latex = step.latex || toLatex(step.ast);
        return `  % Step ${i + 1}\n  ${latex}`;
    }).join(' \\\\\n');

    const doc = `\\documentclass[12pt]{article}
\\usepackage{amsmath, amssymb}
\\usepackage[margin=1in]{geometry}
\\title{${title}}
\\author{${author}}
\\date{\\today}
\\begin{document}
\\maketitle

\\begin{align*}
${alignedContent}
\\end{align*}

\\end{document}
`;

    downloadFile(doc, 'math_answer.tex', 'text/plain');
};

// ── MathJSON Export ───────────────────────────────────────────────────────────

export const exportAsMathJson = (steps) => {
    const payload = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        steps: steps.map((step, i) => ({
            stepNumber: i + 1,
            id: step.id,
            ast: step.ast,
            latex: step.latex || toLatex(step.ast),
            timestamp: step.timestamp,
        })),
    };
    downloadFile(JSON.stringify(payload, null, 2), 'math_answer.json', 'application/json');
};

// ── Print HTML template ───────────────────────────────────────────────────────

/**
 * ✅ SRP: HTML/CSS presentation layer extracted to this pure module-level
 * function, completely decoupled from the window/Blob orchestration in
 * exportAsPrint. Accepts only plain strings — no DOM or side-effects.
 *
 * ✅ XSS: every user-supplied value (title, questionText, each latex string)
 * is run through escapeHtml() before interpolation.
 *
 * ✅ CVE-2024-28245: KaTeX bumped to 0.16.11 (patched). `trust: false` is
 * passed explicitly to renderMathInElement so the \href command is disabled
 * even if an older cached version is served.
 *
 * @param {string} title
 * @param {string} questionText
 * @param {string} stepsHtml   - Already-escaped HTML for each step row
 * @param {string} exportedAt  - Display timestamp string
 * @returns {string} Complete UTF-8 HTML document
 */
const buildPrintHtml = (title, questionText, stepsHtml, exportedAt) => {
    const safeTitle = escapeHtml(title);
    const safeQuestion = escapeHtml(questionText);
    const safeDate = escapeHtml(exportedAt);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <!-- ✅ KaTeX 0.16.11 — patches CVE-2024-28245 (\\href XSS) -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"><\/script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"
    onload="renderMathInElement(document.body, {
      trust: false,
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\\\(', right: '\\\\)', display: false }
      ]
    })"><\/script>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 2cm auto; font-size: 14pt; color: #000; }
    h1   { text-align: center; font-size: 18pt; }
    .question { background: #f5f5f5; border-left: 4px solid #333; padding: 12px 16px; margin-bottom: 24px; }
    .step { margin: 16px 0; padding: 8px 0; border-bottom: 1px dashed #ccc; }
    .step-label { font-weight: bold; color: #555; font-size: 11pt; }
    .math-display { margin: 8px 0 0 16px; }
    @media print { body { margin: 1.5cm; } }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  ${safeQuestion ? `<div class="question"><strong>Question:</strong> ${safeQuestion}</div>` : ''}
  <div class="steps">
    ${stepsHtml}
  </div>
  <p style="margin-top:40px;font-size:10pt;color:#999;">Exported: ${safeDate}</p>
</body>
</html>`;
};

// ── Print-Ready HTML Export ───────────────────────────────────────────────────

/**
 * Build and open a print-ready HTML page in a new tab.
 *
 * @param {Array}  steps
 * @param {object} [meta]
 * @param {string} [meta.title]
 * @param {string} [meta.questionText]
 * @param {string} [meta.exportedAt]  - Display string; caller supplies for testability
 */
export const exportAsPrint = (steps, meta = {}) => {
    const {
        title = 'Math Exam — Answer Sheet',
        questionText = '',
        exportedAt = new Date().toLocaleString(),
    } = meta;

    // Build step rows — each LaTeX is wrapped in $$ ... $$ for KaTeX auto-render,
    // then escaped so that any < > & in the LaTeX source can't break the HTML.
    // Note: KaTeX processes the $$ content as math, not HTML, so escaping the
    // LaTeX string first prevents the HTML parser from misinterpreting it.
    const stepsHtml = steps.map((step, i) => {
        const latex = step.latex || toLatex(step.ast);
        return `
    <div class="step">
      <span class="step-label">Step ${i + 1}</span>
      <div class="math-display">$$${escapeHtml(latex)}$$</div>
    </div>`;
    }).join('\n');

    const html = buildPrintHtml(title, questionText, stepsHtml, exportedAt);
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    const win = window.open(blobUrl, '_blank');

    if (win) {
        // ✅ Do NOT use win.addEventListener('load', ...) for blob: URLs.
        // blob: documents in the same process load synchronously; in many browsers
        // the load event fires before addEventListener returns, so the callback is
        // never called. A flat setTimeout is the correct pattern here — 1 200 ms
        // gives KaTeX's deferred auto-render script time to execute.
        setTimeout(() => {
            try { win.print(); } catch { /* popup may have been closed */ }
            URL.revokeObjectURL(blobUrl);
        }, 1200);
    } else {
        // Popup blocked — clean up immediately
        URL.revokeObjectURL(blobUrl);
    }
};
