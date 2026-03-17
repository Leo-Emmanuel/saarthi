/**
 * mathRules.js — Configuration file for all math speech-to-LaTeX rules.
 *
 * Each exported array contains rule objects of the form:
 *   { pattern: RegExp, replace: string | function }
 *
 * Rules are applied in PIPELINE ORDER (imported in mathSpeechToNotation.js):
 *   STRUCTURAL → GREEK → CALCULUS → LIMIT → POWER_ROOT → FUNCTION
 *   → INEQUALITY → SET_LOGIC → STATS → VECTOR → OPERATOR → BRACKET
 *
 * To add new rules: add entries to the correct domain array.
 * Longer/more-specific patterns must appear BEFORE shorter ones in each array.
 */

// ── STRUCTURAL (shortcut named formulas & grouping keywords) ─────────────────
export const STRUCTURAL_RULES = [
    {
        pattern: /\bfraction with numerator (.+?) and denominator (.+)$/gi,
        replace: (_, num, den) => `\\frac{${num.trim()}}{${den.trim()}}`
    },
    {
        pattern: /\bfrac(?:tion)? (.+?) over (.+)$/gi,
        replace: (_, num, den) => `\\frac{${num.trim()}}{${den.trim()}}`
    },
    {
        pattern: /\bsquare root of quantity\s+(.+?)\s+end quantity\b/gi,
        replace: (_, expr) => `\\sqrt{${expr.trim()}}`
    },
    { pattern: /\bquadratic formula\b/gi, replace: 'x = \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}' },
    { pattern: /\beuler(?:'?s)? identity\b/gi, replace: 'e^{i\\pi} + 1 = 0' },
    { pattern: /\bpythagorean identity\b/gi, replace: '\\sin^{2}x + \\cos^{2}x = 1' },
    { pattern: /\bheat equation\b/gi, replace: '\\frac{\\partial u}{\\partial t} = k\\frac{\\partial^{2}u}{\\partial x^{2}}' },
    { pattern: /\blaplace transform of\b/gi, replace: '\\mathcal{L}\\{' },
    // Grouping trigger words
    // Keep 'end quantity' before 'quantity' so the latter doesn't corrupt the phrase.
    { pattern: /\bend quantity\b/gi, replace: ')' },
    { pattern: /\bquantity\b/gi, replace: '(' },
    // Matrices
    {
        pattern: /\b2 by 2 matrix ([\w\s]+)\b/gi, replace: (_, els) => {
            const [a, b, c, d] = els.trim().split(/\s+/);
            return `\\begin{pmatrix} ${a ?? 'a'} & ${b ?? 'b'} \\\\ ${c ?? 'c'} & ${d ?? 'd'} \\end{pmatrix}`;
        }
    },
    {
        pattern: /\bmatrix with elements? ([\w\s]+)\b/gi, replace: (_, els) => {
            const [a, b, c, d] = els.trim().split(/\s+/);
            return `\\begin{pmatrix} ${a ?? 'a'} & ${b ?? 'b'} \\\\ ${c ?? 'c'} & ${d ?? 'd'} \\end{pmatrix}`;
        }
    },
    { pattern: /\bdeterminant of ([a-zA-Z])\b/gi, replace: (_, m) => `\\det(${m})` },
    { pattern: /\b([a-zA-Z]) transpose\b/gi, replace: (_, m) => `${m}^{T}` },
    { pattern: /\btranspose of ([a-zA-Z])\b/gi, replace: (_, m) => `${m}^{T}` },
    { pattern: /\b([a-zA-Z]) inverse\b/gi, replace: (_, m) => `${m}^{-1}` },
    { pattern: /\binverse of ([a-zA-Z])\b/gi, replace: (_, m) => `${m}^{-1}` },
];

// ── GREEK LETTERS ─────────────────────────────────────────────────────────────
export const GREEK_RULES = [
    // Capitals first (must precede lowercase to avoid partial match)
    { pattern: /\bcapital delta\b/gi, replace: '\\Delta' },
    { pattern: /\bcapital sigma\b/gi, replace: '\\Sigma' },
    { pattern: /\bcapital gamma\b/gi, replace: '\\Gamma' },
    { pattern: /\bcapital lambda\b/gi, replace: '\\Lambda' },
    { pattern: /\bcapital pi\b/gi, replace: '\\Pi' },
    { pattern: /\bcapital omega\b/gi, replace: '\\Omega' },
    // Lowercase
    { pattern: /\balpha\b/gi, replace: '\\alpha' },
    { pattern: /\bbeta\b/gi, replace: '\\beta' },
    { pattern: /\bgamma\b/gi, replace: '\\gamma' },
    { pattern: /\bdelta\b/gi, replace: '\\delta' },
    { pattern: /\bepsilon\b/gi, replace: '\\epsilon' },
    { pattern: /\bzeta\b/gi, replace: '\\zeta' },
    { pattern: /\beta\b/gi, replace: '\\eta' },
    { pattern: /\btheta\b/gi, replace: '\\theta' },
    { pattern: /\biota\b/gi, replace: '\\iota' },
    { pattern: /\bkappa\b/gi, replace: '\\kappa' },
    { pattern: /\blambda\b/gi, replace: '\\lambda' },
    { pattern: /\bmu\b/gi, replace: '\\mu' },
    { pattern: /\bnu\b/gi, replace: '\\nu' },
    { pattern: /\bxi\b/gi, replace: '\\xi' },
    { pattern: /\brho\b/gi, replace: '\\rho' },
    { pattern: /\bsigma\b/gi, replace: '\\sigma' },
    { pattern: /\btau\b/gi, replace: '\\tau' },
    { pattern: /\bupsilon\b/gi, replace: '\\upsilon' },
    { pattern: /\bchi\b/gi, replace: '\\chi' },
    { pattern: /\bpsi\b/gi, replace: '\\psi' },
    { pattern: /\bomega\b/gi, replace: '\\omega' },
    { pattern: /\bphi\b/gi, replace: '\\phi' },
    // pi — handle "pi by/over N" before plain "pi"
    { pattern: /\bpi by (\w+)\b/gi, replace: (_, d) => `\\frac{\\pi}{${d}}` },
    { pattern: /\bpi over (\w+)\b/gi, replace: (_, d) => `\\frac{\\pi}{${d}}` },
    { pattern: /\bhalf pi\b/gi, replace: '\\frac{\\pi}{2}' },
    { pattern: /\bpi\b/gi, replace: '\\pi' },
];

// ── CALCULUS: Derivatives & Integrals ─────────────────────────────────────────
export const CALCULUS_RULES = [
    // Partial derivatives (specific before general)
    {
        pattern: /\bsecond partial derivative of (\w+) w(?:ith )?r(?:espect )?t(?:o)? (\w+)\b/gi,
        replace: (_, f, x) => `\\frac{\\partial^{2}${f}}{\\partial ${x}^{2}}`
    },
    {
        pattern: /\bpartial derivative of (\w+) w(?:ith )?r(?:espect )?t(?:o)? (\w+)\b/gi,
        replace: (_, f, x) => `\\frac{\\partial ${f}}{\\partial ${x}}`
    },
    {
        pattern: /\bpartial (?:d )?(\w+) (?:by |partial )?(?:d )?(\w+)\b/gi,
        replace: (_, f, x) => `\\frac{\\partial ${f}}{\\partial ${x}}`
    },
    { pattern: /\bnabla (\w+)\b/gi, replace: (_, f) => `\\nabla ${f}` },
    { pattern: /\b(?:del|gradient of) (\w+)\b/gi, replace: (_, f) => `\\nabla ${f}` },
    // Ordinary derivatives
    {
        pattern: /\bd squared (\w+) by d (\w+) squared\b/gi,
        replace: (_, y, x) => `\\frac{d^{2}${y}}{d${x}^{2}}`
    },
    {
        pattern: /\bderivative of (.+?) with respect to (\w+)\b/gi,
        replace: (_, expr, x) => `\\frac{d}{d${x}}[${expr.trim()}]`
    },
    {
        pattern: /\bd (\w+) by d (\w+)\b/gi,
        replace: (_, y, x) => `\\frac{d${y}}{d${x}}`
    },
    {
        pattern: /\bd by d (\w+) of\b/gi,
        replace: (_, x) => `\\frac{d}{d${x}}`
    },
    { pattern: /\bsecond derivative of (\w+)\b/gi, replace: (_, f) => `${f}''` },
    {
        pattern: /\bderivative of (.+?)(?=\s*$)/gi,
        replace: (_, expr) => `\\frac{d}{dx}[${expr.trim()}]`
    },
    { pattern: /\b(\w+) double prime\b/gi, replace: (_, f) => `${f}''` },
    { pattern: /\b(\w+) prime\b/gi, replace: (_, f) => `${f}'` },
    { pattern: /\b(\w+) dot\b/gi, replace: (_, v) => `\\dot{${v}}` },
    // Integrals (triple/double before single)
    { pattern: /\bcontour integral of\b/gi, replace: '\\oint' },
    {
        pattern: /\btriple integral from ([\w\\]+) to ([\w\\]+) of\b/gi,
        replace: (_, a, b) => `\\iiint_{${a}}^{${b}}`
    },
    { pattern: /\btriple integral of\b/gi, replace: '\\iiint' },
    {
        pattern: /\bdouble integral from ([\w\\]+) to ([\w\\]+) of\b/gi,
        replace: (_, a, b) => `\\iint_{${a}}^{${b}}`
    },
    { pattern: /\bdouble integral of\b/gi, replace: '\\iint' },
    {
        pattern: /\bintegral from ([\w\\]+) to ([\w\\]+) of\b/gi,
        replace: (_, a, b) => `\\int_{${a}}^{${b}}`
    },
    {
        pattern: /\bdefinite integral ([\w\\]+) to ([\w\\]+) of\b/gi,
        replace: (_, a, b) => `\\int_{${a}}^{${b}}`
    },
    { pattern: /\bintegral of\b/gi, replace: '\\int' },
    { pattern: /\bintegral\b/gi, replace: '\\int' },
    // Differentials
    { pattern: /(?:\s+d\s*|\s+d|^d\s*|^d)([a-zA-Z])\b/g, replace: (_, v) => `\\,d${v}` },
    // Partial derivatives
    {
        pattern: /\bpartial\s+([a-zA-Z])\s+(?:partial|over\s+partial|with\s+respect\s+to)\s+([a-zA-Z])\b/gi,
        replace: (_, f, x) => `\\frac{\\partial ${f}}{\\partial ${x}}`
    },
    {
        pattern: /\bpartial\s+(?:derivative\s+of\s+)?([a-zA-Z])\s+with\s+respect\s+to\s+([a-zA-Z])\b/gi,
        replace: (_, f, x) => `\\frac{\\partial ${f}}{\\partial ${x}}`
    },
    {
        pattern: /\bsecond\s+partial\s+(?:of\s+)?([a-zA-Z])\s+with\s+respect\s+to\s+([a-zA-Z])\b/gi,
        replace: (_, f, x) => `\\frac{\\partial^{2} ${f}}{\\partial ${x}^{2}}`
    },
    // Vector calculus
    { pattern: /\bgradient\s+(?:of\s+)?([a-zA-Z])\b/gi, replace: (_, f) => `\\nabla ${f}` },
    { pattern: /\bdivergence\s+(?:of\s+)?([a-zA-Z])\b/gi, replace: (_, f) => `\\nabla \\cdot ${f}` },
    { pattern: /\bcurl\s+(?:of\s+)?([a-zA-Z])\b/gi, replace: (_, f) => `\\nabla \\times ${f}` },
    { pattern: /\blaplacian\s+(?:of\s+)?([a-zA-Z])\b/gi, replace: (_, f) => `\\nabla^{2} ${f}` },
];

// ── LIMITS ────────────────────────────────────────────────────────────────────
export const LIMIT_RULES = [
    {
        pattern: /\blimit (\w+) tends? to (\w+) from (?:the )?right\b/gi,
        replace: (_, v, a) => `\\lim_{${v} \\to ${a}^{+}}`
    },
    {
        pattern: /\blimit (\w+) tends? to (\w+) from (?:the )?left\b/gi,
        replace: (_, v, a) => `\\lim_{${v} \\to ${a}^{-}}`
    },
    {
        pattern: /\bright hand limit at (\w+)\b/gi,
        replace: (_, a) => `\\lim_{x \\to ${a}^{+}}`
    },
    {
        pattern: /\bleft hand limit at (\w+)\b/gi,
        replace: (_, a) => `\\lim_{x \\to ${a}^{-}}`
    },
    {
        pattern: /\blimit (\w+) (?:tends?|approaches) to (\S+) of\b/gi,
        replace: (_, v, a) => `\\lim_{${v} \\to ${a}}`
    },
    {
        pattern: /\blimit as (\w+) (?:tends?|approaches) (?:to )?(\S+) of\b/gi,
        replace: (_, v, a) => `\\lim_{${v} \\to ${a}}`
    },
    {
        pattern: /\blimit (\w+) to (\S+) of\b/gi,
        replace: (_, v, a) => `\\lim_{${v} \\to ${a}}`
    },
    { pattern: /\btends? to infinity\b/gi, replace: '\\to \\infty' },
    { pattern: /\btends? to zero\b/gi, replace: '\\to 0' },
    { pattern: /\btends? to (\w+)\b/gi, replace: (_, a) => `\\to ${a}` },
    { pattern: /\bapproaches? infinity\b/gi, replace: '\\to \\infty' },
    { pattern: /\bapproaches? (\w+)\b/gi, replace: (_, a) => `\\to ${a}` },
];

// ── POWERS & ROOTS ────────────────────────────────────────────────────────────
export const POWER_ROOT_RULES = [
    // Roots: most specific first
    { pattern: /\bnth root of\b/gi, replace: '\\sqrt[n]{' },
    { pattern: /\bcube root of (\w+)\b/gi, replace: (_, x) => `\\sqrt[3]{${x}}` },
    { pattern: /\bcube root of\b/gi, replace: '\\sqrt[3]{' },
    { pattern: /\bsquare root of (\w+)\b/gi, replace: (_, x) => `\\sqrt{${x}}` },
    { pattern: /\bsquare root\b/gi, replace: '\\sqrt{' },
    { pattern: /\broot of\b/gi, replace: '\\sqrt{' },
    { pattern: /\bunder root\b/gi, replace: '\\sqrt{' },
    { pattern: /\broot (\w+)\b/gi, replace: (_, x) => `\\sqrt{${x}}` },
    // Powers
    { pattern: /\be\s+to\s+the\s+(\w+)\b/gi, replace: (_, exp) => `e^{${exp}}` },
    { pattern: /\be to the power of\b/gi, replace: 'e^{' },
    { pattern: /\be to the i (\S+)\b/gi, replace: (_, x) => `e^{i${x}}` },
    { pattern: /\be to the\b/gi, replace: 'e^{' },
    { pattern: /\b(\w+) to the power of (?:minus|negative)\s*([\w-]+)\b/gi, replace: (_, b, e) => `${b}^{-${String(e).replace(/^-/, '')}}` },
    { pattern: /\b(\w+) to the power (?:minus|negative)\s*([\w-]+)\b/gi, replace: (_, b, e) => `${b}^{-${String(e).replace(/^-/, '')}}` },
    { pattern: /\b(\w+) to the power of ([\w]+)\b/gi, replace: (_, b, e) => `${b}^{${e}}` },
    { pattern: /\b(\w+) to the power ([\w]+)\b/gi, replace: (_, b, e) => `${b}^{${e}}` },
    { pattern: /\b(\w+) raised to (?:the )?power (?:of )?([\w]+)\b/gi, replace: (_, b, e) => `${b}^{${e}}` },
    { pattern: /\b(\w+) raised to ([\w]+)\b/gi, replace: (_, b, e) => `${b}^{${e}}` },
    { pattern: /\b(\w+) power ([\w]+)\b/gi, replace: (_, b, e) => `${b}^{${e}}` },
    { pattern: /\b10 to the ([\w]+)\b/gi, replace: (_, n) => `10^{${n}}` },
    { pattern: /\b(\d+)\s+to\s+the\s+(\w+)\b/gi, replace: (_, base, exp) => `${base}^{${exp}}` },
    { pattern: /\be square(?:d)?\b/gi, replace: 'e^{2}' },
    { pattern: /\b(\w+) plus (\w+) whole square(?:d)?\b/gi, replace: (_, a, b) => `(${a}+${b})^{2}` },
    { pattern: /\b(\w+) minus (\w+) whole square(?:d)?\b/gi, replace: (_, a, b) => `(${a}-${b})^{2}` },
    { pattern: /\b(\w+) square(?:d)?\b/gi, replace: (_, v) => `${v}^{2}` },
    { pattern: /\b(\w+) cube(?:d)?\b/gi, replace: (_, v) => `${v}^{3}` },
    { pattern: /\bsquare(?:d)?\b/gi, replace: '^{2}' },
    { pattern: /\bcube(?:d)?\b/gi, replace: '^{3}' },
    // Subscripts
    { pattern: /\b([a-zA-Z]) subscript (\w+)\b/gi, replace: (_, v, n) => `${v}_{${n}}` },
    { pattern: /\b([a-zA-Z]) sub (\w+)\b/gi, replace: (_, v, n) => `${v}_{${n}}` },
    // Factorial
    { pattern: /\bmagnitude of ([\w]+)\b/gi, replace: (_, x) => `|\\vec{${x}}|` },
    { pattern: /\b(\w+) factorial\b/gi, replace: (_, n) => `${n}!` },
    { pattern: /\bfactorial of (\w+)\b/gi, replace: (_, n) => `${n}!` },
];

// ── TRIG, LOG, EXPONENTIAL ────────────────────────────────────────────────────
export const FUNCTION_RULES = [
    // Log — specific before generic
    { pattern: /\bcommon log(?:arithm)?\s+(?:of\s+)?/gi, replace: '\\log_{10} ' },
    { pattern: /\bbinary log(?:arithm)?\s+(?:of\s+)?/gi, replace: '\\log_{2} ' },
    { pattern: /\bnatural log(?:arithm)?\s+(?:of\s+)?/gi, replace: '\\ln ' },
    { pattern: /\blog\s+base\s+2\s+(?:of\s+)?/gi, replace: '\\log_{2} ' },
    { pattern: /\blog\s+base\s+10\s+(?:of\s+)?/gi, replace: '\\log_{10} ' },
    { pattern: /\bnatural log(?:arithm)? of (\w+)\b/gi, replace: (_, x) => `\\ln(${x})` },
    { pattern: /\bnatural log(?:arithm)?\b/gi, replace: '\\ln' },
    { pattern: /\bln of\b/gi, replace: '\\ln(' },
    { pattern: /\bln\b/gi, replace: '\\ln' },
    { pattern: /\blog base (\w+) of\b/gi, replace: (_, b) => `\\log_{${b}}` },
    { pattern: /\blogarithmic base (\w+) of\b/gi, replace: (_, b) => `\\log_{${b}}` },
    { pattern: /\blog(?:arithm)? of\b/gi, replace: '\\log' },
    { pattern: /\blog\b/gi, replace: '\\log' },
    // Absolute value / modulus (moved from OPERATOR_RULES to prevent corruption)
    { pattern: /\babs(?:olute)?\s+(?:value\s+of\s+)?(.+)/gi, replace: (_, v) => `\\left| ${v} \\right|` },
    { pattern: /\bmodulus\s+of\s+(\w+)\b/gi, replace: (_, v) => `\\left|${v}\\right|` },
    { pattern: /\bvertical\s+bar\s+(.+?)\s+vertical\s+bar\b/gi, replace: (_, v) => `\\left|${v}\\right|` },
    // Inverse trig — specific before generic
    { pattern: /\b(?:arc\s*|inverse\s+)sine?\s+(?:of\s+)?/gi, replace: '\\arcsin ' },
    { pattern: /\b(?:arc\s*|inverse\s+)cos(?:ine)?\s+(?:of\s+)?/gi, replace: '\\arccos ' },
    { pattern: /\b(?:arc\s*|inverse\s+)tan(?:gent)?\s+(?:of\s+)?/gi, replace: '\\arctan ' },
    { pattern: /\barc sine\b/gi, replace: '\\arcsin' },
    { pattern: /\barc cosine\b/gi, replace: '\\arccos' },
    { pattern: /\barc tangent\b/gi, replace: '\\arctan' },
    { pattern: /\bsin(?:e)? inverse of\b/gi, replace: '\\sin^{-1}(' },
    { pattern: /\bcos(?:ine)? inverse of\b/gi, replace: '\\cos^{-1}(' },
    { pattern: /\btan(?:gent)? inverse of\b/gi, replace: '\\tan^{-1}(' },
    { pattern: /\binverse sine(?: of)?\b/gi, replace: '\\sin^{-1}(' },
    { pattern: /\binverse cosine(?: of)?\b/gi, replace: '\\cos^{-1}(' },
    { pattern: /\binverse tangent(?: of)?\b/gi, replace: '\\tan^{-1}(' },
    // Hyperbolic trig
    { pattern: /\bsinh\s+(?:of\s+)?/gi, replace: '\\sinh ' },
    { pattern: /\bcosh\s+(?:of\s+)?/gi, replace: '\\cosh ' },
    { pattern: /\btanh\s+(?:of\s+)?/gi, replace: '\\tanh ' },
    // Standard trig
    { pattern: /\bsine squared\b/gi, replace: '\\sin^{2}' },
    { pattern: /\bcosine squared\b/gi, replace: '\\cos^{2}' },
    { pattern: /\bsine(?: of)?\b/gi, replace: '\\sin' },
    { pattern: /\bcosine(?: of)?\b/gi, replace: '\\cos' },
    { pattern: /\btangent(?: of)?\b/gi, replace: '\\tan' },
    { pattern: /\bcosecant(?: of)?\b/gi, replace: '\\csc' },
    { pattern: /\bsecant(?: of)?\b/gi, replace: '\\sec' },
    { pattern: /\bcotangent(?: of)?\b/gi, replace: '\\cot' },
    { pattern: /(?<!\\)\bsin\b/gi, replace: '\\sin' },
    { pattern: /(?<!\\)\bcos\b/gi, replace: '\\cos' },
    { pattern: /(?<!\\)\btan\b/gi, replace: '\\tan' },
    // Degrees
    { pattern: /\b(\d+) degrees?\b/gi, replace: (_, n) => `${n}°` },
];

// ── INEQUALITIES & RELATIONS ──────────────────────────────────────────────────
export const INEQUALITY_RULES = [
    { pattern: /\bgreater than or equal to\b/gi, replace: '\\geq' },
    { pattern: /\bless than or equal to\b/gi, replace: '\\leq' },
    { pattern: /\bat least\b/gi, replace: '\\geq' },
    { pattern: /\bat most\b/gi, replace: '\\leq' },
    { pattern: /\bnot equal to\b/gi, replace: '\\neq' },
    { pattern: /\bis not equal to\b/gi, replace: '\\neq' },
    { pattern: /\bapproximately equal to\b/gi, replace: '\\approx' },
    { pattern: /\bis approximately\b/gi, replace: '\\approx' },
    { pattern: /\bapproximately\b/gi, replace: '\\approx' },
    { pattern: /\bproportional to\b/gi, replace: '\\propto' },
    { pattern: /\bis proportional to\b/gi, replace: '\\propto' },
    { pattern: /\bcongruent to\b/gi, replace: '\\equiv' },
    { pattern: /\bidentically equal to\b/gi, replace: '\\equiv' },
    { pattern: /\bgreater than\b/gi, replace: '>' },
    { pattern: /\bless than\b/gi, replace: '<' },
    { pattern: /\bmore than\b/gi, replace: '>' },
    { pattern: /\bsmaller than\b/gi, replace: '<' },
    { pattern: /\bequal to\b/gi, replace: '=' },
    { pattern: /\bequals\b/gi, replace: '=' },
    { pattern: /\bequal\b/gi, replace: '=' },
    { pattern: /\bimplies\b/gi, replace: '\\Rightarrow' },
    { pattern: /\bif and only if\b/gi, replace: '\\Leftrightarrow' },
    { pattern: /\biff\b/gi, replace: '\\Leftrightarrow' },
];

// ── SET THEORY & LOGIC ────────────────────────────────────────────────────────
export const SET_LOGIC_RULES = [
    { pattern: /\bdoes not belong to\b/gi, replace: '\\notin' },
    { pattern: /\bis not (?:an element|a member) of\b/gi, replace: '\\notin' },
    { pattern: /\bnot in\b/gi, replace: '\\notin' },
    { pattern: /\bis an? element of\b/gi, replace: '\\in' },
    { pattern: /\bbelongs? to\b/gi, replace: '\\in' },
    { pattern: /\bsubset or equal(?: to)?\b/gi, replace: '\\subseteq' },
    { pattern: /\bsubset of\b/gi, replace: '\\subset' },
    { pattern: /\bsubset\b/gi, replace: '\\subset' },
    { pattern: /\bunion\b/gi, replace: '\\cup' },
    { pattern: /\bintersection\b/gi, replace: '\\cap' },
    { pattern: /\bempty set\b/gi, replace: '\\emptyset' },
    { pattern: /\bnull set\b/gi, replace: '\\emptyset' },
    { pattern: /\bcomplement of ([a-zA-Z])\b/gi, replace: (_, s) => `${s}^{c}` },
    { pattern: /\b([a-zA-Z]) complement\b/gi, replace: (_, s) => `${s}^{c}` },
    { pattern: /\bfor all\b/gi, replace: '\\forall' },
    { pattern: /\bfor every\b/gi, replace: '\\forall' },
    { pattern: /\bforall\b/gi, replace: '\\forall' },
    { pattern: /\bthere exists\b/gi, replace: '\\exists' },
    { pattern: /\bnegation of\b/gi, replace: '\\neg' },
    { pattern: /\bnatural numbers\b/gi, replace: '\\mathbb{N}' },
    { pattern: /\bintegers\b/gi, replace: '\\mathbb{Z}' },
    { pattern: /\brational numbers\b/gi, replace: '\\mathbb{Q}' },
    { pattern: /\breal numbers\b/gi, replace: '\\mathbb{R}' },
    { pattern: /\bcomplex numbers\b/gi, replace: '\\mathbb{C}' },
    { pattern: /\bimaginary unit\b/gi, replace: 'i = \\sqrt{-1}' },
    { pattern: /\btherefore\b/gi, replace: '\\therefore' },
    { pattern: /\bbecause\b/gi, replace: '\\because' },
    { pattern: /\bsuch that\b/gi, replace: '\\mid' },
];

// ── STATISTICS & PROBABILITY ──────────────────────────────────────────────────
export const STATS_RULES = [
    { pattern: /\b([a-zA-Z]) bar\b/gi, replace: (_, v) => `\\bar{${v}}` },
    { pattern: /\b([a-zA-Z]) tilde\b/gi, replace: (_, v) => `\\tilde{${v}}` },
    { pattern: /\bvariance of (\w+)\b/gi, replace: (_, v) => `\\text{Var}(${v})` },
    { pattern: /\bexpected value of (\w+)\b/gi, replace: (_, v) => `E(${v})` },
    { pattern: /\be of (\w+)\b/gi, replace: (_, v) => `E(${v})` },
    {
        pattern: /\bsum from (\w+) (?:equals?|=) (\w+) to (\w+) of\b/gi,
        replace: (_, v, lo, hi) => `\\sum_{${v}=${lo}}^{${hi}}`
    },
    {
        pattern: /\bsum from (\w+) to (\w+) of\b/gi,
        replace: (_, lo, hi) => `\\sum_{${lo}}^{${hi}}`
    },
    { pattern: /\bsummation of\b/gi, replace: '\\sum' },
    { pattern: /\bsummation\b/gi, replace: '\\sum' },
    {
        pattern: /\bproduct from (\w+) (?:equals?|=) (\w+) to (\w+) of\b/gi,
        replace: (_, v, lo, hi) => `\\prod_{${v}=${lo}}^{${hi}}`
    },
    // Binomial coefficient
    { pattern: /\b(\w+)\s+choose\s+(\w+)\b/gi, replace: (_, n, k) => `\\binom{${n}}{${k}}` },
    {
        pattern: /\bcombination\s+(\w+)\s+(?:taken\s+)?(\w+)\s+at\s+a\s+time\b/gi,
        replace: (_, n, k) => `\\binom{${n}}{${k}}`
    },
    // Expected value / variance
    { pattern: /\bE\s+of\s+([a-zA-Z])\b/gi, replace: (_, v) => `E(${v})` },
    { pattern: /\bVar\s+of\s+([a-zA-Z])\b/gi, replace: (_, v) => `\\text{Var}(${v})` },
    { pattern: /\bstandard\s+deviation\s+of\s+([a-zA-Z])\b/gi, replace: (_, v) => `\\sigma_{${v}}` },

    { pattern: /\b(\w+) choose (\w+)\b/gi, replace: (_, n, r) => `\\binom{${n}}{${r}}` },
    { pattern: /\bcombination (\w+) (\w+)\b/gi, replace: (_, n, r) => `\\binom{${n}}{${r}}` },
    { pattern: /\bn c r\b/gi, replace: '\\binom{n}{r}' },
    { pattern: /\bn p r\b/gi, replace: '^{n}P_{r}' },
    { pattern: /\bn permutation r\b/gi, replace: '^{n}P_{r}' },
    { pattern: /\bp of (\w+) given (\w+)\b/gi, replace: (_, a, b) => `P(${a}|${b})` },
    { pattern: /\bp of (\w+) (?:intersection|and) (\w+)\b/gi, replace: (_, a, b) => `P(${a} \\cap ${b})` },
    { pattern: /\bp of (\w+) (?:union|or) (\w+)\b/gi, replace: (_, a, b) => `P(${a} \\cup ${b})` },
    { pattern: /\bp of (\w+)\b/gi, replace: (_, a) => `P(${a})` },
    { pattern: /\bfollows normal distribution\b/gi, replace: '\\sim \\mathcal{N}' },
];

// ── NUMBER WORDS ─────────────────────────────────────────────────────────
//
// These run AFTER OPERATOR_RULES so compound fraction words ('one half',
// 'two thirds') and limit phrases ('tends to zero') are already converted,
// and will not be seen here. Word-boundary anchors (\b) prevent partial
// matches inside other words (e.g. 'none' or 'stone').
//
// Disambiguation rule of thumb:
//   • Compound form matched by an earlier stage → already a LaTeX token, skipped.
//   • Standalone number word at this stage → definitely means a digit.
//
export const NUMBER_WORD_RULES = [
    // ── Teens first (must precede the single-digit rules they contain) ──────────
    { pattern: /\beleven\b/gi, replace: '11' },
    { pattern: /\btwelve\b/gi, replace: '12' },
    { pattern: /\bthirteen\b/gi, replace: '13' },
    { pattern: /\bfourteen\b/gi, replace: '14' },
    { pattern: /\bfifteen\b/gi, replace: '15' },
    { pattern: /\bsixteen\b/gi, replace: '16' },
    { pattern: /\bseventeen\b/gi, replace: '17' },
    { pattern: /\beighteen\b/gi, replace: '18' },
    { pattern: /\bnineteen\b/gi, replace: '19' },
    // ── Tens ──────────────────────────────────────────────────────────────
    { pattern: /\btwenty\b/gi, replace: '20' },
    { pattern: /\bthirty\b/gi, replace: '30' },
    { pattern: /\bforty\b/gi, replace: '40' },
    { pattern: /\bfifty\b/gi, replace: '50' },
    { pattern: /\bsixty\b/gi, replace: '60' },
    { pattern: /\bseventy\b/gi, replace: '70' },
    { pattern: /\beighty\b/gi, replace: '80' },
    { pattern: /\bninety\b/gi, replace: '90' },
    // ── Large units ─────────────────────────────────────────────────────────
    { pattern: /\bhundred\b/gi, replace: '100' },
    { pattern: /\bthousand\b/gi, replace: '1000' },
    { pattern: /\bmillion\b/gi, replace: '1000000' },
    // ── Single digits (zero–ten) ─────────────────────────────────────────────
    { pattern: /\bzero\b/gi, replace: '0' },
    { pattern: /\bone\b/gi, replace: '1' },
    { pattern: /\btwo\b/gi, replace: '2' },
    { pattern: /\bthree\b/gi, replace: '3' },
    { pattern: /\bfour\b/gi, replace: '4' },
    { pattern: /\bfive\b/gi, replace: '5' },
    { pattern: /\bsix\b/gi, replace: '6' },
    { pattern: /\bseven\b/gi, replace: '7' },
    { pattern: /\beight\b/gi, replace: '8' },
    { pattern: /\bnine\b/gi, replace: '9' },
    { pattern: /\bten\b/gi, replace: '10' },
];

// ── VECTORS & MATRICES ────────────────────────────────────────────────────────
export const VECTOR_RULES = [
    { pattern: /\bvector (\w+)\b/gi, replace: (_, v) => `\\vec{${v}}` },
    { pattern: /\b(\w+) hat\b/gi, replace: (_, v) => `\\hat{${v}}` },
    { pattern: /\bdot product of (\w+) and (\w+)\b/gi, replace: (_, a, b) => `\\vec{${a}} \\cdot \\vec{${b}}` },
    { pattern: /\b(\w+) dot (\w+)\b/gi, replace: (_, a, b) => `\\vec{${a}} \\cdot \\vec{${b}}` },
    { pattern: /\bcross product of (\w+) and (\w+)\b/gi, replace: (_, a, b) => `\\vec{${a}} \\times \\vec{${b}}` },
    { pattern: /\b(\w+) cross (\w+)\b/gi, replace: (_, a, b) => `\\vec{${a}} \\times \\vec{${b}}` },
    { pattern: /\bmagnitude of (\w+)\b/gi, replace: (_, x) => `|\\vec{${x}}|` },
    { pattern: /\brank (?:of )?([a-zA-Z])\b/gi, replace: (_, m) => `\\text{rank}(${m})` },
    { pattern: /\btrace (?:of )?([a-zA-Z])\b/gi, replace: (_, m) => `\\text{tr}(${m})` },
];

// ── OPERATORS & ARITHMETIC ────────────────────────────────────────────────────
export const OPERATOR_RULES = [
    // Named fractions (most specific first)
    { pattern: /\bone half\b/gi, replace: '\\frac{1}{2}' },
    { pattern: /\bone third\b/gi, replace: '\\frac{1}{3}' },
    { pattern: /\btwo thirds?\b/gi, replace: '\\frac{2}{3}' },
    { pattern: /\bthree (?:quarters?|fourths?)\b/gi, replace: '\\frac{3}{4}' },
    { pattern: /\bone quarter\b/gi, replace: '\\frac{1}{4}' },
    { pattern: /\b(\d+) and a half\b/gi, replace: (_, n) => `${n}\\frac{1}{2}` },
    // Generic fraction forms
    { pattern: /\b(\w+) upon (\w+)\b/gi, replace: (_, a, b) => `\\frac{${a}}{${b}}` },
    { pattern: /\b(\w+) over (\w+)\b/gi, replace: (_, a, b) => `\\frac{${a}}{${b}}` },
    // Floor and ceiling
    { pattern: /\bfloor\s+(?:of\s+)?(\w+)\b/gi, replace: (_, v) => `\\lfloor ${v} \\rfloor` },
    { pattern: /\bceiling\s+(?:of\s+)?(\w+)\b/gi, replace: (_, v) => `\\lceil ${v} \\rceil` },
    // Modulo
    { pattern: /\b(\w+)\s+mod(?:ulo)?\s+(\w+)\b/gi, replace: (_, a, b) => `${a} \\bmod ${b}` },
    // Operators
    { pattern: /\bplus or minus\b/gi, replace: '\\pm' },
    { pattern: /\bminus or plus\b/gi, replace: '\\mp' },
    { pattern: /\bplus\b/gi, replace: '+' },
    { pattern: /\bminus\b/gi, replace: '-' },
    { pattern: /\btimes\b/gi, replace: '\\times' },
    { pattern: /\bmultiplied by\b/gi, replace: '\\times' },
    { pattern: /\binto\b/gi, replace: '\\times' },
    { pattern: /\bdivided by\b/gi, replace: '\\div' },
    { pattern: /\bnegative infinity\b/gi, replace: '-\\infty' },
    { pattern: /\bminus infinity\b/gi, replace: '-\\infty' },
    { pattern: /\binfinity\b/gi, replace: '\\infty' },
    // Complex number parts
    { pattern: /\breal part of (\w+)\b/gi, replace: (_, z) => `\\text{Re}(${z})` },
    { pattern: /\bimaginary part of (\w+)\b/gi, replace: (_, z) => `\\text{Im}(${z})` },
    { pattern: /\bargument of (\w+)\b/gi, replace: (_, z) => `\\arg(${z})` },
    { pattern: /\bconjugate of (\w+)\b/gi, replace: (_, z) => `\\bar{${z}}` },
    { pattern: /\b(\w+) conjugate\b/gi, replace: (_, z) => `\\bar{${z}}` },
    // Geometry
    { pattern: /\bangle ([a-zA-Z]+)\b/gi, replace: (_, v) => `\\angle ${v}` },
    { pattern: /\btriangle ([a-zA-Z]+)\b/gi, replace: (_, v) => `\\triangle ${v}` },
    { pattern: /\bparallel to\b/gi, replace: '\\parallel' },
    { pattern: /\bperpendicular to\b/gi, replace: '\\perp' },
    { pattern: /\bpercent(?:age)?\b/gi, replace: '\\%' },
];

// ── BRACKETS & SEPARATORS ────────────────────────────────────────────────────
export const BRACKET_RULES = [
    { pattern: /\bopen square bracket\b/gi, replace: '[' },
    { pattern: /\bclose square bracket\b/gi, replace: ']' },
    { pattern: /\bopen curly (?:bracket|brace)\b/gi, replace: '\\{' },
    { pattern: /\bclose curly (?:bracket|brace)\b/gi, replace: '\\}' },
    { pattern: /\bopen (?:bracket|parenthesis)\b/gi, replace: '(' },
    { pattern: /\bclose (?:bracket|parenthesis)\b/gi, replace: ')' },
    { pattern: /\bopening bracket\b/gi, replace: '(' },
    { pattern: /\bclosing bracket\b/gi, replace: ')' },
    { pattern: /\bleft (?:bracket|parenthesis)\b/gi, replace: '(' },
    { pattern: /\bright (?:bracket|parenthesis)\b/gi, replace: ')' },
    // ── Comma: context-aware forms first, then standalone ────────────────────
    // Coordinate / list form: "a comma b" → "a, b"
    { pattern: /(\S+) comma (\S+)/gi, replace: (_, a, b) => `${a}, ${b}` },
    // Standalone word "comma" → ","
    { pattern: /\bcomma\b/gi, replace: ',' },
    // Literal STT comma already present — normalise spacing: "a , b" → "a, b"
    { pattern: /\s*,\s*/g, replace: ', ' },
    // Semicolon & colon (spoken form — the characters were stripped in normalise)
    { pattern: /\bsemicolon\b/gi, replace: ';' },
    { pattern: /\bcolon\b/gi, replace: ':' },
];

// ── POST-CLEANUP ───────────────────────────────────────────────────────────────
export const POST_CLEANUP_RULES = [
    { pattern: /\s{2,}/g, replace: ' ' },
    // Space BEFORE operators — only when preceded by alphanumeric or closing brace,
    // but NOT when preceded by { (would break x^{-2} → x^{ - 2}).
    // Lookbehind: char before must be [a-zA-Z0-9}] but NOT {.
    { pattern: /([a-zA-Z0-9}])(?<!\{.)([ ]*)([+\-=<>])/g, replace: '$1 $3' },
    // Space AFTER operators — only when followed by alphanumeric, backslash, or open grouping,
    // but NOT when the operator is directly followed by } (would break \frac{-1}{2}).
    { pattern: /([+\-=<>])(?!\s*\})(?!\s*[_^]\{)([a-zA-Z0-9(\\])/g, replace: '$1 $2' },
    // Remove accidental space before sub/superscript braces
    { pattern: /\s+([_^])\{/g, replace: '$1{' },
    // Trim
    { pattern: /^\s+|\s+$/g, replace: '' },
];
