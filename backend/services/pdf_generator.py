"""
PDF answer-sheet generator for student exam submissions.

Generates a simple PDF containing question IDs and student answers,
suitable for archiving or downloading.

Dependencies: reportlab.
"""

import logging
import os
import time

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

_log = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
# Default output folder relative to the caller's chosen base directory.
_DEFAULT_SUBFOLDER = os.path.join("static", "submissions_pdf")

# Files older than this (seconds) are eligible for cleanup.
_STALE_AGE_SECONDS = 7 * 24 * 60 * 60  # 7 days


class PDFGenerator:
    """Generate PDF answer sheets from submission data.

    Usage::

        url = PDFGenerator.generate_answer_sheet(data, "file.pdf", base_dir="/app")
    """

    @staticmethod
    def generate_answer_sheet(submission_data, filename, base_dir=None):
        """Create a PDF answer sheet and return its relative URL path.

        Args:
            submission_data: dict with the following keys:
                - student_name (str): name of the student
                - exam_title   (str): title of the exam
                - date         (str, optional): submission date
                - score        (str, optional): e.g. "8 / 10"
                - answers      (dict): mapping of question_id → answer_text
            filename: the PDF filename (should be pre-sanitised).
            base_dir: absolute path used as root for the output folder.
                      If *None*, falls back to Flask's ``current_app.root_path``
                      so non-Flask callers can use this class too.

        Returns:
            The URL path string (e.g. ``/static/submissions_pdf/file.pdf``)
            or *None* if generation failed.
        """
        try:
            # ── Resolve output directory ──────────────────────────────────
            if base_dir is None:
                # Import inside the branch so the module is importable
                # without Flask when base_dir is provided explicitly.
                from flask import current_app
                base_dir = current_app.root_path

            folder = os.path.join(base_dir, _DEFAULT_SUBFOLDER)
            os.makedirs(folder, exist_ok=True)

            filepath = os.path.join(folder, filename)
            c = canvas.Canvas(filepath, pagesize=letter)
            width, height = letter

            # ── Header ────────────────────────────────────────────────────
            c.setFont("Helvetica-Bold", 16)
            title = submission_data.get("exam_title", "Exam") or "Exam"
            c.drawString(50, height - 50, f"Answer Sheet - {title}")

            c.setFont("Helvetica", 12)
            student = submission_data.get("student_name", "Unknown") or "Unknown"
            c.drawString(50, height - 70, f"Student: {student}")
            c.drawString(50, height - 90, f"Date: {submission_data.get('date', '')}")

            score = submission_data.get("score")
            if score:
                c.drawString(50, height - 110, f"Score: {score}")

            c.line(50, height - 120, width - 50, height - 120)
            y_pos = height - 150

            # ── Answers ───────────────────────────────────────────────────
            # answers is a dict of {question_id: answer_text}
            answers = submission_data.get("answers") or {}

            for q_id, answer_text in answers.items():
                if y_pos < 100:
                    c.showPage()
                    y_pos = height - 50

                c.setFont("Helvetica-Bold", 12)
                c.drawString(50, y_pos, f"Q: {q_id}")
                y_pos -= 20

                c.setFont("Helvetica", 12)
                # Guard against None / non-string answer values
                safe_text = str(answer_text) if answer_text is not None else ""
                for line in safe_text.split("\n"):
                    if y_pos < 50:
                        c.showPage()
                        y_pos = height - 50
                    c.drawString(60, y_pos, line)
                    y_pos -= 15

                y_pos -= 20  # space between questions

            c.save()

            # Clean up old files in the background (best-effort)
            _cleanup_stale_files(folder)

            return f"/{_DEFAULT_SUBFOLDER.replace(os.sep, '/')}/{filename}"

        except Exception:
            _log.exception("PDF generation failed for %s", filename)
            return None

    @staticmethod
    def cleanup(base_dir=None, max_age_seconds=None):
        """Manually trigger cleanup of stale PDF files.

        Args:
            base_dir: root directory (defaults to Flask root_path).
            max_age_seconds: override the default stale-age threshold.
        """
        if base_dir is None:
            from flask import current_app
            base_dir = current_app.root_path
        folder = os.path.join(base_dir, _DEFAULT_SUBFOLDER)
        _cleanup_stale_files(folder, max_age_seconds or _STALE_AGE_SECONDS)


def _cleanup_stale_files(folder, max_age=_STALE_AGE_SECONDS):
    """Delete PDF files older than *max_age* seconds (best-effort, non-blocking)."""
    try:
        now = time.time()
        for name in os.listdir(folder):
            if not name.lower().endswith(".pdf"):
                continue
            path = os.path.join(folder, name)
            try:
                if now - os.path.getmtime(path) > max_age:
                    os.unlink(path)
                    _log.info("Cleaned up stale PDF: %s", name)
            except OSError:
                pass  # file may have been removed concurrently
    except OSError:
        pass  # folder might not exist yet
