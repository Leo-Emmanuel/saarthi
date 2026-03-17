"""
PDF parser — extract exam questions from uploaded PDF files.

Uses a two-pass strategy:
    Pass 1 (explicit): numbered questions like ``Q1.`` or ``Question 2)``
    Pass 2 (implicit): heuristic fallback for non-numbered PDFs

Dependencies: pypdf.
"""

import logging
import re

from models.exam import Question

_log = logging.getLogger(__name__)


# ── Regex patterns ────────────────────────────────────────────────────────────
_QUESTION_RE = re.compile(
    r"^\s*(?:Q|Question)?\s*\d+[.\)\:]\s*(.*)", re.IGNORECASE
)
# Match options A-D (or a-d) followed by ) or . and a space
_OPTION_RE = re.compile(r"^[A-Da-d][)\.]\s")
_CORRECT_ANS_RE = re.compile(r"^correct\s*answer\s*:\s*(.*)", re.IGNORECASE)


# Question line filter: must start with number (optional Q) and have real content.
def is_question_line(line):
    line = line.strip()
    if len(line) < 10:
        return False
    if re.match(r'^(?:Q|Question)?\s*\d+[\.\)\:]', line, re.IGNORECASE):
        return True
    return False


# ══════════════════════════════════════════════════════════════════════════════
# Public API
# ══════════════════════════════════════════════════════════════════════════════


def parse_pdf(file_path):
    """Extract questions from a PDF file.

    Returns a list of ``Question.to_dict()`` dicts, or an empty list on error.
    """
    try:
        lines = list(_iter_lines(file_path))

        questions = _parse_numbered(lines)
        if not questions:
            _log.info("No numbered questions found; strict filter returned no questions.")

        _log.info("Extracted %d questions from PDF.", len(questions))
        return questions

    except Exception:
        _log.exception("Error parsing PDF: %s", file_path)
        return []


# ══════════════════════════════════════════════════════════════════════════════
# Internal helpers
# ══════════════════════════════════════════════════════════════════════════════


def _iter_lines(file_path):
    """Yield non-empty, stripped lines from a PDF — no intermediate full-text string."""
    import pypdf

    reader = pypdf.PdfReader(file_path)
    for page in reader.pages:
        page_text = page.extract_text()
        if not page_text:
            continue
        for line in page_text.split("\n"):
            stripped = line.strip()
            if stripped:
                yield stripped


def _is_option_line(line):
    """True if the line looks like an MCQ option (A-D or a-d)."""
    return bool(_OPTION_RE.match(line))


def _try_correct_answer(line):
    """If the line is a 'Correct Answer: X' line, return X; else None."""
    m = _CORRECT_ANS_RE.match(line)
    return m.group(1).strip() if m else None


def _flush_question(text, correct_answer=None):
    """Create a Question dict, optionally with a correct answer."""
    q = Question(text=text, q_type="text").to_dict()
    if correct_answer:
        q["correct_answer"] = correct_answer
    return q


# ── Pass 1: numbered questions (stateful buffered parser) ─────────────────────

def _parse_numbered(lines):
    """Extract explicitly numbered questions (``Q1.``, ``Question 2)``)."""
    questions = []
    current_text = ""
    current_answer = None  # correct answer seen while building current question

    for line in lines:
        if is_question_line(line):
            match = _QUESTION_RE.match(line)
            if match:
                # Flush the previous question
                if current_text:
                    questions.append(_flush_question(current_text, current_answer))
                    current_answer = None
                current_text = match.group(1)
                continue
        elif not current_text:
            # Not a question start and no active question buffer
            continue

        # We're inside a question — classify the line
        if not current_text:
            continue

        # Option line (A-D / a-d) → skip
        if _is_option_line(line):
            continue

        # Correct answer metadata → attach to *current* question (not previous)
        ans = _try_correct_answer(line)
        if ans is not None:
            current_answer = ans
            continue

        # Regular continuation text
        current_text = f"{current_text} {line}"

    # Flush last question
    if current_text:
        questions.append(_flush_question(current_text, current_answer))

    return questions


# ── Pass 2: implicit questions (stateless heuristic parser) ───────────────────

def _parse_implicit(lines):
    """Deprecated: strict filter requires numbered question starts."""
    return []
