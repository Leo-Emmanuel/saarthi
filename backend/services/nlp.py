"""
NLP service for the Saarthi voice-accessible exam platform.

Provides four capabilities via dedicated delegate classes:
1. _SimilarityScorer  → Answer similarity scoring
2. _IntentDetector    → Voice command intent detection
3. _Summarizer        → Question text summarization
4. _KeywordExtractor  → Math-relevant keyword extraction

NLPService is a thin facade that routes calls to the right delegate.

Dependencies: nltk (already installed), difflib (stdlib).
"""

import logging
import re
from difflib import SequenceMatcher
from collections import Counter

import nltk

_log = logging.getLogger(__name__)

# ── NLTK data packages needed by this module ──────────────────────────────────
_NLTK_PACKAGES = [
    ("tokenizers/punkt_tab", "punkt_tab"),
    ("taggers/averaged_perceptron_tagger_eng", "averaged_perceptron_tagger_eng"),
    ("corpora/stopwords", "stopwords"),
]
_nltk_ready = False


def _ensure_nltk_data():
    """Download NLTK data lazily on first use, not at import time."""
    global _nltk_ready
    if _nltk_ready:
        return
    for resource, name in _NLTK_PACKAGES:
        try:
            nltk.data.find(resource)
        except LookupError:
            nltk.download(name, quiet=True)
    _nltk_ready = True


# ── Word-to-number map (for voice answer equivalence) ─────────────────────────
_WORD_NUMBERS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19,
}
_TENS = {
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}
_MAGNITUDES = {"hundred": 100, "thousand": 1000}


def _words_to_number(text):
    """Convert compound English number words to an integer.

    Handles forms like:
        'five'          → 5
        'twenty one'    → 21
        'three hundred forty five' → 345
        'one thousand'  → 1000

    Returns the integer, or None if the text isn't a recognisable number.
    """
    words = text.strip().lower().split()
    if not words:
        return None

    total = 0
    current = 0
    found_any = False

    for w in words:
        if w in _WORD_NUMBERS:
            current += _WORD_NUMBERS[w]
            found_any = True
        elif w in _TENS:
            current += _TENS[w]
            found_any = True
        elif w == "hundred":
            current = (current if current else 1) * 100
            found_any = True
        elif w == "thousand":
            current = (current if current else 1) * 1000
            total += current
            current = 0
            found_any = True
        else:
            return None  # non-number word found — not a pure number phrase

    if not found_any:
        return None

    return total + current


# ── Math synonym maps ─────────────────────────────────────────────────────────
# Multi-word phrases: replaced via string substitution BEFORE tokenisation.
_MULTIWORD_SYNONYMS = [
    ("take away", "-"),
    ("square root", "sqrt"),
    ("divided by", "/"),
    ("raised to the power of", "**"),
    ("multiplied by", "*"),
]

# Single-word synonyms: replaced during word-by-word normalisation.
_MATH_SYNONYMS = {
    "plus": "+", "add": "+", "added": "+", "sum": "+",
    "minus": "-", "subtract": "-", "subtracted": "-",
    "times": "*", "multiply": "*", "multiplied": "*", "into": "*",
    "divided": "/", "over": "/",
    "squared": "**2", "cubed": "**3",
    "root": "sqrt",
    "equals": "=", "equal": "=", "is": "=",
    "pi": "π", "pie": "π",
    "x": "x", "y": "y",
}

# ── Intent detection: command patterns ────────────────────────────────────────
_COMMAND_PATTERNS = {
    "next": ["next", "next question", "go next", "move on", "forward", "skip"],
    "prev": ["previous", "prev", "go back", "back", "before", "last question"],
    "repeat": ["repeat", "say again", "again", "what was that", "come again"],
    "submit": ["submit", "done", "finish", "complete", "end exam", "i am done"],
    "help": ["help", "what can i say", "commands", "options", "instructions"],
    "read": ["read", "read question", "read it", "what is the question"],
    "stop": ["stop", "pause", "wait", "hold on", "cancel"],
    "start": ["start", "begin", "start exam", "let's go", "ready"],
}

_STOPWORDS = set()


def _get_stopwords():
    """Return stopwords set, loading lazily."""
    global _STOPWORDS
    if not _STOPWORDS:
        _ensure_nltk_data()
        try:
            _STOPWORDS = set(nltk.corpus.stopwords.words("english"))
        except Exception:
            pass
    return _STOPWORDS


# ══════════════════════════════════════════════════════════════════════════════
# Shared helper functions (used by multiple delegates)
# ══════════════════════════════════════════════════════════════════════════════


def _normalize_answer(text):
    """Lowercase, strip, normalise whitespace, convert word-numbers.

    Pipeline:
    1. Multi-word phrase substitution (e.g. 'square root' → 'sqrt')
    2. Compound number conversion  (e.g. 'twenty one' → '21')
    3. Single-word substitution    (e.g. 'plus' → '+')
    """
    if not text:
        return ""
    result = str(text).strip().lower()
    result = re.sub(r"\s+", " ", result)

    for phrase, replacement in _MULTIWORD_SYNONYMS:
        result = result.replace(phrase, replacement)

    result = _replace_number_words(result)

    words = result.split()
    normalized = []
    for w in words:
        if w in _MATH_SYNONYMS:
            normalized.append(_MATH_SYNONYMS[w])
        else:
            normalized.append(w)
    return " ".join(normalized)


def _replace_number_words(text):
    """Find contiguous runs of number-words and convert each to digits."""
    words = text.split()
    out = []
    buf = []

    def flush():
        if buf:
            val = _words_to_number(" ".join(buf))
            if val is not None:
                out.append(str(val))
            else:
                out.extend(buf)
            buf.clear()

    all_num_words = set(_WORD_NUMBERS) | set(_TENS) | set(_MAGNITUDES)
    for w in words:
        if w in all_num_words:
            buf.append(w)
        else:
            flush()
            out.append(w)
    flush()
    return " ".join(out)


def _to_number(text):
    """Try to parse text as a number (digits or word-form). Returns float or None."""
    if not text:
        return None
    try:
        return float(text)
    except (ValueError, TypeError):
        pass
    val = _words_to_number(text)
    return float(val) if val is not None else None


def _sim_result(score, method, norm_student, norm_correct):
    """Build a standard similarity result dict."""
    return {
        "score": score,
        "method": method,
        "normalized_student": norm_student,
        "normalized_correct": norm_correct,
    }


# ══════════════════════════════════════════════════════════════════════════════
# Delegate classes — each handles a single NLP responsibility
# ══════════════════════════════════════════════════════════════════════════════


class _SimilarityScorer:
    """Compare student answers to correct answers (numeric + text similarity)."""

    def score(self, student_answer, correct_answer):
        """Compare a student's voice/text answer against the correct answer.

        Scoring pipeline:
            1. Exact match after normalization → 1.0
            2. Numeric equivalence ("five" == "5") → 1.0
            3. Token overlap ratio (Jaccard) → 0.0–1.0
            4. Sequence similarity (SequenceMatcher) → 0.0–1.0
            Final = max(token_overlap, sequence_similarity)
        """
        norm_student = _normalize_answer(student_answer)
        norm_correct = _normalize_answer(correct_answer)

        if not norm_student or not norm_correct:
            return _sim_result(0.0, "empty", norm_student, norm_correct)

        if norm_student == norm_correct:
            return _sim_result(1.0, "exact", norm_student, norm_correct)

        # Numeric equivalence — try normalized first, then raw input
        num_student = _to_number(norm_student)
        num_correct = _to_number(norm_correct)
        if num_student is None:
            num_student = _to_number(student_answer)
        if num_correct is None:
            num_correct = _to_number(correct_answer)
        if num_student is not None and num_correct is not None:
            if abs(num_student - num_correct) < 1e-9:
                return _sim_result(1.0, "numeric", norm_student, norm_correct)

        # Token overlap (Jaccard similarity)
        tokens_s = set(norm_student.split())
        tokens_c = set(norm_correct.split())
        jaccard = (
            len(tokens_s & tokens_c) / len(tokens_s | tokens_c)
            if tokens_s and tokens_c else 0.0
        )

        # Sequence similarity
        seq_score = SequenceMatcher(None, norm_student, norm_correct).ratio()

        best = max(jaccard, seq_score)
        method = "token_overlap" if jaccard >= seq_score else "sequence"
        return _sim_result(round(best, 3), method, norm_student, norm_correct)


class _IntentDetector:
    """Classify voice input as a command or an answer."""

    def detect(self, text):
        """Returns intent, action, confidence, and original text."""
        if not text or not text.strip():
            return {"intent": "answer", "action": None, "confidence": 0.0, "text": ""}

        cleaned = text.strip().lower()
        words = cleaned.split()

        best_action = None
        best_score = 0.0

        for action, patterns in _COMMAND_PATTERNS.items():
            for pattern in patterns:
                pattern_words = pattern.split()

                if cleaned == pattern:
                    return {
                        "intent": "command", "action": action,
                        "confidence": 1.0, "text": text.strip(),
                    }

                if pattern in cleaned:
                    score = min(len(pattern_words) / max(len(words), 1) + 0.3, 1.0)
                    if score > best_score:
                        best_score = score
                        best_action = action
                elif words and words[0] in pattern_words:
                    if 0.5 > best_score:
                        best_score = 0.5
                        best_action = action

        if best_score >= 0.5:
            return {
                "intent": "command", "action": best_action,
                "confidence": round(best_score, 2), "text": text.strip(),
            }

        return {
            "intent": "answer", "action": None,
            "confidence": round(1.0 - best_score, 2), "text": text.strip(),
        }


class _Summarizer:
    """Condense question text for TTS readback via term-frequency scoring."""

    def summarize(self, text, max_sentences=2):
        """Extract the most important sentences from question text."""
        if not text or not text.strip():
            return {"summary": "", "sentence_count": 0}

        sentences = nltk.sent_tokenize(text)
        if len(sentences) <= max_sentences:
            return {"summary": text.strip(), "sentence_count": len(sentences)}

        stopwords = _get_stopwords()
        all_words = nltk.word_tokenize(text.lower())
        content_words = [w for w in all_words if w.isalnum() and w not in stopwords]
        freq = Counter(content_words)

        scored = []
        for i, sent in enumerate(sentences):
            words = nltk.word_tokenize(sent.lower())
            content = [w for w in words if w.isalnum() and w not in stopwords]
            score = (
                sum(freq.get(w, 0) for w in content) / max(len(content), 1)
                if content else 0
            )
            scored.append((i, score, sent))

        scored.sort(key=lambda x: x[1], reverse=True)
        top = sorted(scored[:max_sentences], key=lambda x: x[0])
        return {
            "summary": " ".join(s[2] for s in top),
            "sentence_count": len(sentences),
        }


class _KeywordExtractor:
    """Extract math-relevant keywords from text via POS tagging."""

    def extract(self, text):
        """Returns a list of keyword dicts with text, pos, and relevance."""
        if not text or not text.strip():
            return []

        tokens = nltk.word_tokenize(text)
        tagged = nltk.pos_tag(tokens)
        stopwords = _get_stopwords()

        all_lower = [t.lower() for t in tokens if t.isalnum()]
        freq = Counter(all_lower)
        max_freq = max(freq.values()) if freq else 1

        keywords = []
        seen = set()

        for word, pos in tagged:
            lower = word.lower()
            if lower in stopwords or len(lower) < 2:
                continue

            is_relevant = False
            relevance = 0.0

            if pos == "CD" or _to_number(lower) is not None:
                is_relevant, relevance = True, 1.0
            elif lower in _MATH_SYNONYMS or lower in _WORD_NUMBERS:
                is_relevant, relevance = True, 0.9
            elif pos.startswith("NN"):
                is_relevant = True
                relevance = freq.get(lower, 0) / max_freq * 0.8
            elif len(lower) == 1 and lower.isalpha() and lower not in stopwords:
                is_relevant, relevance = True, 0.85

            if is_relevant and lower not in seen:
                seen.add(lower)
                keywords.append({"text": word, "pos": pos, "relevance": round(relevance, 2)})

        keywords.sort(key=lambda k: k["relevance"], reverse=True)
        return keywords


# ══════════════════════════════════════════════════════════════════════════════
# NLPService — thin facade that delegates to focused classes
# ══════════════════════════════════════════════════════════════════════════════

_nlp_instance = None


def get_nlp_service():
    """Return a shared NLPService singleton (lazy-initialized)."""
    global _nlp_instance
    if _nlp_instance is None:
        _ensure_nltk_data()
        _nlp_instance = NLPService()
    return _nlp_instance


class NLPService:
    """Facade over four NLP capabilities, each handled by a delegate class."""

    def __init__(self):
        self._scorer = _SimilarityScorer()
        self._intent = _IntentDetector()
        self._summarizer = _Summarizer()
        self._keywords = _KeywordExtractor()

    def score_similarity(self, student_answer, correct_answer):
        """Compare a student's voice/text answer against the correct answer."""
        return self._scorer.score(student_answer, correct_answer)

    def detect_intent(self, text):
        """Classify spoken input as a command or an answer."""
        return self._intent.detect(text)

    def summarize(self, text, max_sentences=2):
        """Condense question text for TTS readback."""
        return self._summarizer.summarize(text, max_sentences=max_sentences)

    def extract_keywords(self, text):
        """Extract math-relevant keywords from text."""
        return self._keywords.extract(text)
