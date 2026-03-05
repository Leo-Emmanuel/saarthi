"""
DOCX parser — extract exam questions from uploaded Word documents.

Uses a two-pass strategy (mirrors pdf_parser):
    Pass 1 (explicit): numbered questions like ``Q1.`` or ``Question 2)``
    Pass 2 (implicit): heuristic fallback for non-numbered documents

Dependencies: python-docx.
"""

import logging
import re

from models.exam import Question

_log = logging.getLogger(__name__)


# ── Regex patterns ────────────────────────────────────────────────────────────
_QUESTION_RE = re.compile(
    r"^\s*(?:Q|Question)?\s*\d+[.\)]\s*(.*)", re.IGNORECASE
)
_OPTION_RE = re.compile(r"^[A-Da-d][)\.]\s*")
_CORRECT_ANS_RE = re.compile(r"^correct\s*answer\s*:\s*(.*)", re.IGNORECASE)


# ── Shared helpers ────────────────────────────────────────────────────────────

def _is_option_line(line):
    """True if the line looks like an MCQ option (A-D or a-d)."""
    return bool(_OPTION_RE.match(line))


def _try_correct_answer(line):
    """If the line is a 'Correct Answer: X' line, return X; else None."""
    m = _CORRECT_ANS_RE.match(line)
    return m.group(1).strip() if m else None


def _flush_question(text, correct_answer=None, options=None):
    """Create a Question dict, optionally with a correct answer and options."""
    q_type = "mcq" if options else "text"
    print(f"DEBUG: Creating question - type: {q_type}, options: {options}, text: {text[:50]}...")
    q = Question(text=text, type=q_type).to_dict()
    print(f"DEBUG: Question dict created: {q}")
    if correct_answer:
        q["correct_answer"] = correct_answer
    if options:
        q["options"] = options
    return q


# ══════════════════════════════════════════════════════════════════════════════
# Public API
# ══════════════════════════════════════════════════════════════════════════════


def parse_docx(file_path):
    """Extract questions from a .docx file.

    Returns a list of ``Question.to_dict()`` dicts, or an empty list on error.
    """
    try:
        import docx

        doc = docx.Document(file_path)
        lines = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

        questions = _parse_numbered(lines)
        if not questions:
            _log.info("No numbered questions found; falling back to implicit mode.")
            questions = _parse_implicit(lines)

        _log.info("Extracted %d questions from docx.", len(questions))
        return questions

    except Exception:
        _log.exception("Error parsing docx: %s", file_path)
        return []


# ══════════════════════════════════════════════════════════════════════════════
# Internal parsers
# ══════════════════════════════════════════════════════════════════════════════


def _parse_numbered(lines):
    """Pass 1 — extract explicitly numbered questions.

    Handles the case where the question number line has no text after it
    (e.g. ``Q1.`` on one line, question body on the next).
    """
    questions = []
    current_text = ""
    current_answer = None
    current_options = []
    in_question = False  # True once we've seen a Q-header

    for line in lines:
        match = _QUESTION_RE.match(line)

        if match:
            # Flush the previous question
            if in_question and current_text:
                questions.append(_flush_question(current_text, current_answer, current_options))
                current_answer = None
                current_options = []
            # group(1) may be empty when question text is on the next line
            current_text = match.group(1)
            in_question = True
            continue

        if not in_question:
            continue

        # Option line → collect
        if _is_option_line(line):
            current_options.append(line)
            continue

        # Correct answer → buffer for current question (not questions[-1])
        ans = _try_correct_answer(line)
        if ans is not None:
            current_answer = ans
            continue

        # Continuation or first line after empty Q-header
        if current_text:
            current_text += " " + line
        else:
            current_text = line

    # Flush last question
    if in_question and current_text:
        questions.append(_flush_question(current_text, current_answer, current_options))

    return questions


def _parse_implicit(lines):
    """Pass 2 — heuristic fallback for docs without numbered questions."""
    questions = []
    current_options = []

    for line in lines:
        line = line.strip()
        print(f"DEBUG: Processing line: '{line}'")
        
        # Option line → collect
        if _is_option_line(line):
            print(f"DEBUG: Found option line: '{line}'")
            current_options.append(line)
            continue
        
        # Correct answer → attach to the previous question
        ans = _try_correct_answer(line)
        if ans is not None:
            if questions:
                questions[-1]["correct_answer"] = ans
            continue
        
        # Skip section/instruction headers
        lower = line.lower()
        if lower.startswith("section") or lower.startswith("instructions"):
            continue
        
        # Heuristic: substantial lines or lines ending with ? or :
        if line.endswith("?") or line.endswith(":") or len(line) > 10:
            print(f"DEBUG: Flushing question with {len(current_options)} options")
            questions.append(_flush_question(line, None, current_options))
            current_options = []

    return questions
