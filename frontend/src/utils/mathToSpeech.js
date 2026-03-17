/**
 * mathToSpeech.js
 * Converts math notation in question text to natural spoken English.
 */
export function mathToSpeech(text) {
    if (!text) return '';
    let s = String(text);

    // LaTeX fractions
    s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, num, den) => `${num} over ${den}`);

    // LaTeX square roots
    s = s.replace(/\\sqrt\{([^}]+)\}/g, (_, expr) => `square root of ${expr}`);

    // Caret powers with braces: x^{2}
    s = s.replace(/([a-zA-Z])\^\{(\d+)\}/g, (_, base, exp) => {
        if (exp === '2') return `${base} squared`;
        if (exp === '3') return `${base} cubed`;
        return `${base} to the power ${exp}`;
    });

    // Caret powers without braces: x^2
    s = s.replace(/([a-zA-Z])\^(\d+)/g, (_, base, exp) => {
        if (exp === '2') return `${base} squared`;
        if (exp === '3') return `${base} cubed`;
        return `${base} to the power ${exp}`;
    });

    // Plain letter+digit (no caret): x2 → x squared (DB format)
    // Must come BEFORE implicit multiplication
    s = s.replace(/([a-zA-Z])(\d)/g, (_, base, exp) => {
        if (exp === '2') return `${base} squared`;
        if (exp === '3') return `${base} cubed`;
        return `${base} to the power ${exp}`;
    });

    // Implicit multiplication: 2x → 2 times x
    // Must come AFTER power rules
    s = s.replace(/(\d)([a-zA-Z])/g, '$1 times $2');

    // Minus signs (unicode and plain hyphen)
    s = s.replace(/\u2212/g, ' minus ');  // unicode minus −
    s = s.replace(/\u2013/g, ' minus ');  // en dash –
    s = s.replace(/\s*-\s*/g, ' minus '); // plain hyphen

    // Operators
    s = s.replace(/\+/g, ' plus ');
    s = s.replace(/\u00d7/g, ' times ');  // ×
    s = s.replace(/\*/g, ' times ');
    s = s.replace(/\u00f7/g, ' divided by '); // ÷
    s = s.replace(/=/g, ' equals ');
    s = s.replace(/\u2260/g, ' not equal to ');    // ≠
    s = s.replace(/\u2264/g, ' less than or equal to ');  // ≤
    s = s.replace(/\u2265/g, ' greater than or equal to '); // ≥
    s = s.replace(/\u00b1/g, ' plus or minus ');   // ±

    // Greek letters (unicode escapes)
    s = s.replace(/\u03b1/g, 'alpha');
    s = s.replace(/\u03b2/g, 'beta');
    s = s.replace(/\u03b3/g, 'gamma');
    s = s.replace(/\u03b4/g, 'delta');
    s = s.replace(/\u03c0/g, 'pi');
    s = s.replace(/\u03b8/g, 'theta');
    s = s.replace(/\u03bb/g, 'lambda');
    s = s.replace(/\u03c3/g, 'sigma');
    s = s.replace(/\u221e/g, 'infinity');  // ∞

    // Unicode superscripts
    s = s.replace(/\u00b2/g, ' squared'); // ²
    s = s.replace(/\u00b3/g, ' cubed');   // ³

    // Remove leftover LaTeX commands
    s = s.replace(/\\[a-zA-Z]+/g, ' ');
    s = s.replace(/[{}]/g, ' ');

    // Clean up extra spaces
    s = s.replace(/\s{2,}/g, ' ').trim();

    return s;
}
