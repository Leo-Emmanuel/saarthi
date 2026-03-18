"""
Exam API endpoints — CRUD, file upload, submission, and auto-grading.

Registered at /api/exam in app.py.

Architecture: route handlers are thin — service helpers handle DB access,
grading logic, and PDF generation so they can be tested independently.
"""

import logging
import os
import re
import threading
import psutil  # type: ignore
import time
from typing import Any
from bson import ObjectId
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, current_app, Request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from werkzeug.local import LocalProxy
from config.db import db
from models.exam import Exam, Question
from services.upload import UploadService
from utils.validation import validate_request
from schemas.exam_schemas import ExamCreateSchema, SubmitAnswerSchema
from migrations.migrate_submissions import normalize_answers, answers_to_lookup

exam_bp = Blueprint("exam", __name__)

_exams = db.exams
_submissions = db.submissions
_users = db.users
_log = logging.getLogger(__name__)

# ── Memory monitoring & grading queue ────────────────────────────────────────
_active_grading_tasks = 0  # Limit concurrent grading to 1 per worker
_max_concurrent_grading = 1
_grading_lock = threading.Lock()
_grading_timeout_seconds = 30  # Max time for grading to complete (Render timeout is 60s)


def _get_memory_usage() -> dict:
    """Get current process memory usage."""
    try:
        proc = psutil.Process(os.getpid())
        mem_info = proc.memory_info()
        return {
            "rss_mb": mem_info.rss / 1024 / 1024,  # Resident set size (physical memory)
            "vms_mb": mem_info.vms / 1024 / 1024,  # Virtual memory size
            "percent": proc.memory_percent(),  # Percentage of system memory
        }
    except Exception as e:
        _log.warning(f"Failed to get memory info: {e}")
        return {"rss_mb": 0, "vms_mb": 0, "percent": 0}


def _log_memory_status(context: str = ""):
    """Log current memory usage."""
    mem = _get_memory_usage()
    context_str = f" [{context}]" if context else ""
    _log.info(f"[MEMORY] RSS={mem['rss_mb']:.1f}MB VMS={mem['vms_mb']:.1f}MB {mem['percent']:.1f}%{context_str}")
    
    # Warn if memory usage is high (>70% or >50MB on free tier)
    if mem["rss_mb"] > 50:
        _log.warning(f"⚠️  High memory usage detected: {mem['rss_mb']:.1f}MB")


def _can_start_grading() -> bool:
    """Check if we can start a new grading task."""
    global _active_grading_tasks
    
    with _grading_lock:
        if _active_grading_tasks >= _max_concurrent_grading:
            _log.warning(f"[GRADE] Grading queue full: {_active_grading_tasks}/{_max_concurrent_grading}")
            return False
        _active_grading_tasks += 1
        _log.info(f"[GRADE] Starting grading task: {_active_grading_tasks}/{_max_concurrent_grading}")
        return True


def _finish_grading():
    """Mark a grading task as complete."""
    global _active_grading_tasks
    
    with _grading_lock:
        _active_grading_tasks = max(0, _active_grading_tasks - 1)
        _log.info(f"[GRADE] Grading task complete: {_active_grading_tasks}/{_max_concurrent_grading}")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _safe_object_id(raw):
    """Convert a string to ObjectId, returning None on malformed input."""
    try:
        return ObjectId(raw)
    except Exception:
        return None


def _require_admin_or_creator(exam_doc=None):
    """Validate the JWT identity is an admin or the exam creator.

    Returns (user_doc, None) on success, or (None, (response, status)) on failure.
    """
    raw_id = get_jwt_identity()
    oid = _safe_object_id(raw_id)
    if oid is None:
        return None, (jsonify({"error": "Invalid session"}), 401)

    user = _users.find_one({"_id": oid})
    if not user:
        return None, (jsonify({"error": "User not found"}), 401)

    if user.get("role") == "admin":
        return user, None

    # If an exam doc is provided, check ownership
    if exam_doc and exam_doc.get("created_by") != oid:
        return None, (jsonify({"error": "Not authorized to modify this exam"}), 403)

    return user, None


def _safe_file_path(file_url):
    """Convert a file_url to a safe absolute path, preventing path traversal.

    Returns the absolute path or None if the URL is invalid/suspicious.
    """
    if not file_url:
        return None

    # Strip leading slash and sanitize each path component
    parts = file_url.lstrip("/").split("/")
    sanitized = [secure_filename(p) for p in parts if p]
    if not sanitized:
        return None

    path = os.path.join(current_app.root_path, *sanitized)

    # Ensure the resolved path is still under the app root
    real_path = os.path.realpath(path)
    app_root = os.path.realpath(current_app.root_path)
    if not real_path.startswith(app_root):
        _log.warning("Path traversal attempt blocked: %s", file_url)
        return None

    return real_path if os.path.exists(real_path) else None


def _is_mcq_like(q) -> bool:
    """Return True if a question behaves like an MCQ.

    Legacy exams sometimes stored MCQs with type='text' but a non-empty
    options array. This helper treats any question with options as MCQ,
    regardless of its ``type`` field.
    """
    if hasattr(q, "type"):
        q_type = getattr(q, "type", None)
        options = getattr(q, "options", None)
    elif isinstance(q, dict):
        q_type = q.get("type")
        options = q.get("options")
    else:
        q_type = None
        options = None

    if options and len(options) > 0:
        return True
    return q_type == "mcq"


def _is_writing_like(q) -> bool:
    """Return True if a question expects a written answer."""
    if hasattr(q, "type"):
        q_type = getattr(q, "type", None)
    elif isinstance(q, dict):
        q_type = q.get("type")
    else:
        q_type = None
    return q_type == "text"


def _detect_exam_type(questions):
    """Auto-detect exam type based on question content."""
    if not questions:
        return "empty"

    has_mcq = any(_is_mcq_like(q) for q in questions)
    has_writing = any(_is_writing_like(q) for q in questions)

    if has_mcq and not has_writing:
        return "mcq-only"
    if not has_mcq and has_writing:
        return "writing-only"
    if has_mcq and has_writing:
        return "mixed"
    return "unknown"


def _parse_questions_from_file(file_url):
    """Attempt to extract questions from an uploaded DOCX or PDF.

    Returns a list of Question objects, or [] on failure.
    """
    path = _safe_file_path(file_url)
    if not path:
        return []

    try:
        if file_url.endswith((".docx", ".doc")):
            from services.question_parser import parse_docx
            return parse_docx(path)
        elif file_url.endswith(".pdf"):
            from services.pdf_parser import parse_pdf
            return parse_pdf(path)
    except Exception:
        _log.exception("Failed to parse questions from %s", file_url)

    return []


# ── Exam-type & answer helpers ───────────────────────────────────────────────

def _compute_exam_type(questions: list) -> str:
    """Derive the exam type from its questions — never stored in the database.

    Returns: 'mcq-only' | 'writing-only' | 'mixed' | 'empty' | 'unknown'
    """
    if not questions:
        return "empty"

    has_mcq = any(_is_mcq_like(q) for q in questions)
    has_writing = any(_is_writing_like(q) for q in questions)

    if has_mcq and not has_writing:
        return "mcq-only"
    if not has_mcq and has_writing:
        return "writing-only"
    if has_mcq and has_writing:
        return "mixed"
    return "unknown"


def _extract_mcq_letter(student_answer):
    """Extract MCQ letter A-D from natural voice response."""
    import re
    if not student_answer:
        return None
    text = student_answer.strip().upper()
    
    early_match = re.match(r'^\s*\(?([ABCD])[).]?\s+', text)
    if early_match:
        return early_match.group(1)
        
    patterns = [
        r'\b(?:OPTION|ANSWER|LETTER|CHOICE)\s+([A-D])\b',
        r'\b([A-D])\s+IS\s+(?:CORRECT|RIGHT)\b',
        r'\bI\s+(?:THINK|CHOOSE|PICK|SAY)\s+([A-D])\b',
        r"(?:IT'?S|ITS)\s+([A-D])\b",
        r'\b([A-D])[)\.]?\s*$',
        r'^\s*([A-D])[)\.]?\s*$',
    ]
    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            return m.group(1)
    return None

def _normalize_mcq(s: str) -> str:
    """Reduce an MCQ answer to a single uppercase letter.

    Handles all common student formats:
        'a', 'A', '(a)', '(A)', '(A) Some text', 'A. Some text'
    """
    if not s:
        return ""
    s = s.strip().upper()
    # Strip leading parenthesis: '(A) ...' → 'A) ...'
    if s.startswith("("):
        s = s[1:]
    # Keep only the first character before any space, dot, or closing paren
    import re as _re
    m = _re.match(r'^([A-D])', s)
    return m.group(1) if m else s[:1]


# ── Grading logic ─────────────────────────────────────────────────────────────

def _get_nlp():
    """Get the shared NLP service singleton."""
    from services.nlp import get_nlp_service
    return get_nlp_service()


# Fix 4: Default grading config (used when question has no per-question config)
_DEFAULT_GRADING_CONFIG = {
    "method": "nlp",
    "threshold_full": 0.7,
    "threshold_partial": 0.4,
}


def _grade_answers(questions, answers_raw):
    """Score student answers against correct answers.

    MCQ questions use exact/loose match.
    Text/voice answers use NLP similarity scoring with partial credit.

    Fix 4: reads per-question grading_config instead of hardcoded thresholds.
    Fix 5: accepts both old dict format and new array format via answers_to_lookup.

    Returns (score, total_marks).
    """
    # Normalize answers to a lookup dict for grading
    answers = answers_to_lookup(answers_raw)

    score = 0
    total_marks = 0
    nlp = _get_nlp()

    for q in questions:
        q_id = str(q.get("_id", ""))
        marks = q.get("marks", 1)
        q_type = q.get("type", "text")
        total_marks += marks

        correct = str(q.get("correct_answer", "")).strip()
        student = str(answers.get(q_id, "")).strip()
        print(f"[GRADE DEBUG] q_id={q_id} student='{student}' correct='{correct}' type={q_type}")

        if not correct or not student:
            continue

        # Read per-question grading config (Fix 4)
        config = q.get("grading_config") or _DEFAULT_GRADING_CONFIG
        method = config.get("method", "nlp")

        # ── Manual grading: skip auto-scoring ─────────────────────────────
        if method == "manual":
            continue

        # ── MCQ: normalised single-letter comparison ──────────────────────
        if q_type == "mcq":
            extracted = _extract_mcq_letter(student)
            norm_correct = _normalize_mcq(correct)
            if extracted == norm_correct:
                score += marks
            continue

        # ── Exact match method ────────────────────────────────────────────
        if method == "exact":
            if student.lower() == correct.lower():
                score += marks
            continue

        # ── NLP: similarity scoring with configurable thresholds ──────────
        threshold_full = config.get("threshold_full", 0.7)
        threshold_partial = config.get("threshold_partial", 0.4)

        result = nlp.score_similarity(student, correct)
        sim = result.get("score", 0)

        if sim >= threshold_full:
            score += marks
        elif sim >= threshold_partial:
            score += marks * 0.5  # partial credit

    return score, total_marks


def _generate_submission_pdf(user_doc, exam_doc, exam_id, answers_raw, score, total_marks):
    """Generate a PDF answer sheet for a final submission.

    Returns the PDF URL or None on failure.
    """
    try:
        from services.pdf_generator import PDFGenerator

        student_name = user_doc.get("name", "Student") if user_doc else "Student"
        exam_title = exam_doc.get("title", "Exam") if exam_doc else "Exam"

        # Convert answers to lookup dict for PDF generation
        answers = answers_to_lookup(answers_raw)

        pdf_data = {
            "student_name": student_name,
            "exam_title": exam_title,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "answers": answers,
            "score": f"{score} / {total_marks}",
        }

        filename = secure_filename(f"{student_name}_{exam_title}_{exam_id}.pdf")
        return PDFGenerator.generate_answer_sheet(pdf_data, filename)
    except Exception:
        _log.exception("PDF generation failed for exam %s", exam_id)
        return None


# ── Fix 7: Async grading in background thread ────────────────────────────────

def _grade_in_background(app, exam_oid, user_oid, answers_raw):
    """Run grading + PDF generation in a background thread.

    Uses app.app_context() since Flask context is not available in threads.
    Includes memory monitoring and grading queue management.
    Includes timeout to prevent worker hangs.
    """
    # Check if we can start grading
    if not _can_start_grading():
        _log.warning(f"[GRADE] Could not start grading for exam {exam_oid}, user {user_oid} - queue full")
        with app.app_context():
            _submissions.update_one(
                {"exam_id": exam_oid, "user_id": user_oid},
                {"$set": {"status": "graded", "score": 0, "total_marks": 0}},
            )
        return
    
    start_time = time.time()
    
    try:
        with app.app_context():
            _log_memory_status("GRADE_START")
            
            # Step 1: Fetch documents
            step1_start = time.time()
            exam_doc = _exams.find_one({"_id": exam_oid})
            user_doc = _users.find_one({"_id": user_oid})
            step1_time = time.time() - step1_start
            _log.info(f"[GRADE] Step 1 (fetch docs): {step1_time:.2f}s")

            # Check timeout after first step
            elapsed = time.time() - start_time
            if elapsed > _grading_timeout_seconds:
                _log.error(f"[GRADE] TIMEOUT: Already at {elapsed:.1f}s after fetch, aborting grading")
                _finish_grading()
                _submissions.update_one(
                    {"exam_id": exam_oid, "user_id": user_oid},
                    {"$set": {"status": "graded", "score": 0, "total_marks": 0}},
                )
                return

            # Step 2: Grade answers
            step2_start = time.time()
            score, total_marks = 0, 0
            if exam_doc and exam_doc.get("questions"):
                score, total_marks = _grade_answers(exam_doc["questions"], answers_raw)
            step2_time = time.time() - step2_start
            _log.info(f"[GRADE] Step 2 (grade answers): {step2_time:.2f}s → score={score}/{total_marks}")

            # Check timeout after grading
            elapsed = time.time() - start_time
            if elapsed > _grading_timeout_seconds:
                _log.error(f"[GRADE] TIMEOUT: Already at {elapsed:.1f}s after grading, skipping PDF")
                _finish_grading()
                # Still save the score even on timeout
                _submissions.update_one(
                    {"exam_id": exam_oid, "user_id": user_oid},
                    {"$set": {
                        "status": "graded",
                        "submitted_at": datetime.now(timezone.utc),
                        "score": score,
                        "total_marks": total_marks,
                    }},
                )
                return

            _log_memory_status("GRADE_COMPLETE")
            
            # Step 3: Generate PDF (non-critical, skip on timeout or memory pressure)
            pdf_url = None
            mem = _get_memory_usage()
            if exam_doc and user_doc and mem["rss_mb"] < 60:
                step3_start = time.time()
                try:
                    pdf_url = _generate_submission_pdf(
                        user_doc, exam_doc, str(exam_oid), answers_raw, score, total_marks,
                    )
                    step3_time = time.time() - step3_start
                    _log.info(f"[GRADE] Step 3 (generate PDF): {step3_time:.2f}s")
                except Exception as e:
                    _log.warning(f"[GRADE] PDF generation skipped: {str(e)}")
            else:
                _log.info(f"[GRADE] Step 3 (generate PDF): SKIPPED (mem={mem['rss_mb']:.1f}MB)")

            print(f"[GRADE DEBUG] FINAL score={score} total_marks={total_marks}")

            # Step 4: Update database
            step4_start = time.time()
            _submissions.update_one(
                {"exam_id": exam_oid, "user_id": user_oid},
                {"$set": {
                    "status": "graded",
                    "submitted_at": datetime.now(timezone.utc),
                    "score": score,
                    "total_marks": total_marks,
                    **({} if pdf_url is None else {"pdf_url": pdf_url}),
                }},
            )
            step4_time = time.time() - step4_start
            _log.info(f"[GRADE] Step 4 (update DB): {step4_time:.2f}s")
            
            # Step 5: Emit Socket.IO event
            step5_start = time.time()
            try:
                from app import socketio
                user_data = user_doc if user_doc else {}
                exam_data = exam_doc if exam_doc else {}
                
                # Fetch the submission to get the correct _id
                submission_doc = _submissions.find_one({"exam_id": exam_oid, "user_id": user_oid})
                submission_id = str(submission_doc.get("_id", "")) if submission_doc else ""
                
                socketio.emit('submission_graded', {
                    "_id": submission_id,
                    "examId": str(exam_oid),
                    "examTitle": exam_data.get("title", ""),
                    "studentName": user_data.get("name", "Unknown"),
                    "studentEmail": user_data.get("email") or user_data.get("studentId") or "Unknown",
                    "studentId": user_data.get("studentId", ""),
                    "score": score,
                    "total_marks": total_marks,
                    "status": "graded",
                }, room='teachers')  # type: ignore
                step5_time = time.time() - step5_start
                _log.info(f"[GRADE] Step 5 (emit event): {step5_time:.2f}s")
                print(f"[SOCKET] emitted submission_graded for user {user_oid}")
            except Exception:
                _log.exception("Failed to emit submission_graded event")
            
            total_time = time.time() - start_time
            _log.info(f"[GRADE] COMPLETE for exam {exam_oid}, user {user_oid} in {total_time:.2f}s: {score}/{total_marks}")
    except Exception:
        _log.exception("Background grading failed for exam %s", exam_oid)
        # Mark as graded with error so the frontend doesn't poll forever
        with app.app_context():
            _submissions.update_one(
                {"exam_id": exam_oid, "user_id": user_oid},
                {"$set": {"status": "graded", "score": 0, "total_marks": 0}},
            )
    finally:
        _finish_grading()
        _log_memory_status("GRADE_END")


# ── Route handlers ────────────────────────────────────────────────────────────

@exam_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_file():
    """Upload a question paper (PDF/DOCX)."""
    if "file" not in request.files:
        return jsonify({
            "error": "Validation failed",
            "fields": {
                "file": "No file part",
            },
        }), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({
            "error": "Validation failed",
            "fields": {
                "file": "No selected file",
            },
        }), 400

    try:
        file_url = UploadService.save_file(file, folder="question_papers")
        if not file_url:
            return jsonify({
                "error": "Validation failed",
                "fields": {
                    "file": "File upload failed or invalid file type",
                },
            }), 400
        return jsonify({"file_url": file_url})
    except Exception:
        _log.exception("File upload failed")
        return jsonify({"error": "File upload failed"}), 500


@exam_bp.route("/create", methods=["POST"])
@jwt_required()
@validate_request(ExamCreateSchema)
def create_exam():
    """Create a new exam. Optionally auto-parse questions from uploaded file."""
    data: dict[str, Any] = request.validated_data  # type: ignore

    try:
        current_user_id = get_jwt_identity()
        _log.info(f"Creating exam for user: {current_user_id}")
        _log.info(f"Request data: {data}")

        # Build questions from request data or parse from file
        questions_list = data.get("questions") or []
        if isinstance(questions_list, list):
            for q in questions_list:
                if isinstance(q, dict) and "correct_answer" not in q:
                    for key in ("correctAnswer", "answer", "solution"):
                        if key in q:
                            q["correct_answer"] = q[key]
                            break
        file_url = data.get("file_url") or data.get("file_path")
        _log.info(f"File URL: {file_url}")
        _log.info(f"Questions from data: {len(questions_list)}")
        
        if not questions_list and file_url:
            questions_list = _parse_questions_from_file(file_url)
            _log.info(f"Questions from file: {len(questions_list)}")

        # Auto-detect exam type based on questions
        exam_type = _detect_exam_type(questions_list)
        _log.info(f"Detected exam type: {exam_type}")
        
        exam = Exam(
            title=data.get("title", "Untitled Exam"),
            description=data.get("description", ""),
            created_by=current_user_id,
            duration=data.get("duration", 60),
            questions=questions_list,
            file_url=file_url,
            examType=exam_type,
        )

        result = _exams.insert_one(exam.to_dict())
        _log.info(f"Exam created successfully: {result.inserted_id}")
        created_exam = {
            "_id": str(result.inserted_id),
            "title": exam.title,
            "description": exam.description,
            "duration": exam.duration,
            "file_url": exam.file_url,
            "examType": exam.examType,
        }
        return jsonify({
            "message": "Exam created",
            "exam_id": str(result.inserted_id),
            "exam": created_exam,
        }), 201
    except Exception:
        _log.exception("Unexpected error in exam route")
        return jsonify({"error": "An unexpected error occurred"}), 500


@exam_bp.route("/", methods=["GET"])
@jwt_required()
def list_exams():
    """List all exams (requires authentication)."""
    try:
        exams = list(_exams.find(
            {},
            {
                "title": 1,
                "description": 1,
                "duration": 1,
                "created_at": 1,
                "file_url": 1,
                "examType": 1,
                "questions.type": 1,
                "questions.options": 1,
            },
        ))
        for ex in exams:
            ex["_id"] = str(ex["_id"])
            if "created_by" in ex:
                ex["created_by"] = str(ex["created_by"])
            # Prefer stored examType when present (set at creation time)
            stored_type = ex.get("examType")
            if stored_type in {"mcq-only", "writing-only", "mixed", "empty"}:
                ex["exam_type"] = stored_type
            else:
                # Fallback: derive from questions using the same helpers as get_exam
                ex["exam_type"] = _compute_exam_type(ex.get("questions", []))
            ex.pop("questions", None)  # strip questions list — only type summary needed
        return jsonify(exams)
    except Exception:
        _log.exception("Failed to list exams")
        return jsonify({"error": "Failed to list exams"}), 500




# ── MCQ enrichment helper ─────────────────────────────────────────────────────

import re as _re

# Matches embedded options like "• (A) H₂O • (B) CO₂" or "(A) Alpha (B) Beta"
_OPTION_RE = _re.compile(
    r'[•\-\s]*\(([A-D])\)\s*([^•\(\n]+?)(?=\s*[•\-]*\s*\([A-D]\)|$)',
    _re.IGNORECASE | _re.DOTALL,
)


def _enrich_question_for_client(q: dict) -> dict:
    """Normalise question fields that the frontend needs to render correctly.

    Legacy / PDF-parsed questions are stored with type='text' even when they
    are actually MCQ questions (they have a correct_answer like 'A', 'B', etc.)
    This function:
      1. Detects MCQ questions by presence of correct_answer OR embedded options
      2. Sets type='mcq'
      3. Parses the A/B/C/D options from the question text and exposes them
         as an 'options' list so MCQOptionCard renders properly

    NOTE: correct_answer is NOT returned here — it is stripped by the caller.
    """
    q = dict(q)  # shallow copy — don't mutate the DB document

    has_correct = bool(q.get("correct_answer", ""))
    existing_options = q.get("options") or []
    text = q.get("text", "")

    # Parse options from embedded text like "… • (A) H₂O • (B) CO₂ …"
    parsed_options = []
    if text:
        matches = _OPTION_RE.findall(text)
        if matches:
            # Build ordered list [optA, optB, optC, optD]
            option_map = {letter.upper(): val.strip() for letter, val in matches}
            for letter in ["A", "B", "C", "D"]:
                if letter in option_map:
                    parsed_options.append(option_map[letter])

    # Determine if this is an MCQ question
    is_mcq = (
        has_correct
        or len(existing_options) > 0
        or len(parsed_options) > 0
    )

    if is_mcq:
        q["type"] = "mcq"
        # Prefer already-stored options; fall back to parsed
        if not existing_options and parsed_options:
            q["options"] = parsed_options

    return q


@exam_bp.route("/<exam_id>", methods=["GET"])
@jwt_required()
def get_exam(exam_id):
    """Fetch a single exam by ID.

    Security: correct_answer is STRIPPED before sending to the student so that
    the answer key is never exposed to the client.
    """
    oid = _safe_object_id(exam_id)
    if oid is None:
        return jsonify({"error": "Invalid exam ID"}), 400

    exam = _exams.find_one({"_id": oid})
    if not exam:
        return jsonify({"error": "Exam not found"}), 404

    exam["_id"] = str(exam["_id"])
    exam["created_by"] = str(exam.get("created_by", ""))

    questions = exam.get("questions", [])
    enriched = []
    for q in questions:
        if "_id" in q:
            q["_id"] = str(q["_id"])
        # Enrich first (parses MCQ type/options), THEN strip answer key
        q = _enrich_question_for_client(q)
        q.pop("correct_answer", None)
        q.pop("grading_config", None)
        enriched.append(q)

    exam["questions"] = enriched

    # Add computed exam_type so the frontend never needs to re-derive it
    exam["exam_type"] = _compute_exam_type(enriched)

    return jsonify(exam)




@exam_bp.route("/<exam_id>/submit", methods=["POST"])
@jwt_required()
@validate_request(SubmitAnswerSchema)
def submit_exam(exam_id):
    """Save progress or finalize a submission.

    Fix 5: writes answers in structured array format.
    Fix 7: when final=true, returns 202 and grades asynchronously.
    """
    _log_memory_status(f"SUBMIT_START for exam {exam_id}")
    
    data: dict[str, Any] = request.validated_data  # type: ignore

    exam_oid = _safe_object_id(exam_id)
    user_oid = _safe_object_id(get_jwt_identity())
    if not exam_oid or not user_oid:
        return jsonify({"error": "Invalid exam or user ID"}), 400

    is_final = data.get("final", False)
    answers_raw = data.get("answers", {})
    audio_files = data.get("audio_files", {})
    tab_violations = data.get("tab_violations", 0)
    if isinstance(tab_violations, list):
        violation_count = len(tab_violations)
    else:
        try:
            violation_count = int(tab_violations)
        except (TypeError, ValueError):
            violation_count = 0

    # Fix 5: normalize answers to structured array format
    answers = normalize_answers(answers_raw, audio_files)

    try:
        # Upsert submission
        existing = _submissions.find_one({"exam_id": exam_oid, "user_id": user_oid})

        submission_data = {
            "exam_id": exam_oid,
            "user_id": user_oid,
            "answers": answers,
            "audio_files": audio_files,
            "tab_violations": violation_count,
            "flagged": violation_count >= 3,  # Auto-flag if 3+ violations
            "last_updated": datetime.now(timezone.utc),
            "status": "submitted" if is_final else "in_progress",
        }

        if existing:
            _submissions.update_one({"_id": existing["_id"]}, {"$set": submission_data})
            submission_id = existing["_id"]
        else:
            insert_result = _submissions.insert_one(submission_data)
            submission_id = insert_result.inserted_id

        # ── For partial saves, return immediately (no scores) ─────────────
        if not is_final:
            _log_memory_status(f"SUBMIT_END (final=false, partial save)")
            return jsonify({"message": "Progress saved"}), 201

        # ── Fix 7: Final submission → async grading ───────────────────────
        # Mark as "grading" and return 202 immediately
        _submissions.update_one(
            {"exam_id": exam_oid, "user_id": user_oid},
            {"$set": {"status": "grading"}},
        )

        # Launch grading in background thread
        app = current_app._get_current_object()  # type: ignore
        thread = threading.Thread(
            target=_grade_in_background,
            args=(app, exam_oid, user_oid, answers_raw),
            daemon=True,
        )
        thread.start()

        try:
            from app import socketio
            from services.email_service import send_exam_submission_confirmation
            
            student_doc = _users.find_one({"_id": user_oid}, {"name": 1, "email": 1, "studentId": 1})
            exam_doc = _exams.find_one({"_id": exam_oid}, {"title": 1})
            submitted_at = datetime.now(timezone.utc).isoformat()
            
            # Send email confirmation to student
            if student_doc:
                # Extract valid email (prefer 'email' field, fallback to 'studentId' only if it looks like an email)
                student_email = student_doc.get("email")
                if not student_email or not isinstance(student_email, str) or "@" not in student_email:
                    student_email = student_doc.get("studentId")
                
                # Only send if we have a valid email
                if student_email and isinstance(student_email, str) and "@" in str(student_email):
                    student_name = student_doc.get("name", "Student")
                    exam_title = exam_doc.get("title", "Exam") if exam_doc else "Exam"
                    send_exam_submission_confirmation(student_email, student_name, exam_title)
                else:
                    print(f"⚠️  Skipping email: No valid email for user {user_oid}")
            
            print("[SOCKET] emitting new_submission")
            socketio.emit('new_submission', {
                "_id": str(submission_id),
                "examId": str(exam_oid),
                "examTitle": exam_doc.get("title", "") if exam_doc else "",
                "studentName": student_doc.get("name", "Unknown") if student_doc else "Unknown",
                "studentEmail": (student_doc.get("email") or student_doc.get("studentId")) if student_doc else "Unknown",
                "studentId": student_doc.get("studentId", "") if student_doc else "",
                "submittedAt": submitted_at,
                "score": 0,
                "status": "grading",
            }, room='teachers')  # type: ignore
        except Exception:
            _log.exception("Failed to emit submission socket event")

        _log_memory_status(f"SUBMIT_END (final=true)")
        return jsonify({"message": "Exam submitted — grading in progress", "status": "grading"}), 202

    except Exception:
        _log.exception("Submission failed for exam %s", exam_id)
        _log_memory_status(f"SUBMIT_ERROR")
        return jsonify({"error": "Submission failed"}), 500


@exam_bp.route("/<exam_id>/submission/status", methods=["GET"])
@jwt_required()
def get_submission_status(exam_id):
    """Fix 7: poll endpoint for async grading status.

    Returns { status, score, total_marks }.
    """
    exam_oid = _safe_object_id(exam_id)
    user_oid = _safe_object_id(get_jwt_identity())
    if not exam_oid or not user_oid:
        return jsonify({"error": "Invalid IDs"}), 400

    sub = _submissions.find_one(
        {"exam_id": exam_oid, "user_id": user_oid},
        {"status": 1, "score": 1, "total_marks": 1, "tab_violations": 1, "flagged": 1},
    )
    if not sub:
        return jsonify({"error": "Submission not found"}), 404

    return jsonify({
        "status": sub.get("status", "unknown"),
        "score": sub.get("score"),
        "total_marks": sub.get("total_marks"),
        "tab_violations": sub.get("tab_violations", []),
        "flagged": sub.get("flagged", False),
    })


@exam_bp.route("/<exam_id>", methods=["DELETE"])
@jwt_required()
def delete_exam(exam_id):
    """Delete an exam. Requires admin role or ownership."""
    oid = _safe_object_id(exam_id)
    if oid is None:
        return jsonify({"error": "Invalid exam ID"}), 400

    exam = _exams.find_one({"_id": oid})
    if not exam:
        return jsonify({"error": "Exam not found"}), 404

    # Ownership check — only admin or creator can delete
    _, auth_err = _require_admin_or_creator(exam)
    if auth_err:
        return auth_err

    try:
        _exams.delete_one({"_id": oid})
        # Delete associated submissions to prevent orphans
        _submissions.delete_many({"exam_id": oid})
        return jsonify({"message": "Exam deleted successfully"})
    except Exception:
        _log.exception("Failed to delete exam %s", exam_id)
        return jsonify({"error": "Failed to delete exam"}), 500
