"""
Evaluation API endpoints — teachers and admins grade submitted exams.

Registered at /api/evaluation in app.py.

Architecture: route handlers are thin — service helpers handle DB access
and business logic so they can be tested independently.
"""

import logging
from bson import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.db import db
from utils.validation import validate_request
from schemas.exam_schemas import GradeSchema
from migrations.migrate_submissions import normalize_answers, answers_to_lookup

evaluation_bp = Blueprint("evaluation", __name__)

_users = db.users
_exams = db.exams
_submissions = db.submissions
_log = logging.getLogger(__name__)

# Default page size for paginated endpoints
_DEFAULT_PAGE_SIZE = 50


# ── Helpers ────────────────────────────────────────────────────────────────────

def _safe_object_id(raw):
    """Convert a string to ObjectId, returning None on malformed input."""
    try:
        return ObjectId(raw)
    except Exception:
        return None


def _require_evaluator():
    """Validate the JWT identity is a teacher or admin.

    Returns (user_doc, None) on success, or (None, (response, status)) on failure.
    """
    raw_id = get_jwt_identity()
    oid = _safe_object_id(raw_id)
    if oid is None:
        return None, (jsonify({"error": "Invalid session"}), 401)

    user = _users.find_one({"_id": oid})
    if not user or user.get("role") not in ("teacher", "admin"):
        return None, (jsonify({"error": "Teacher or admin access required"}), 403)
    return user, None


def _parse_json(*required_fields):
    """Parse request JSON and validate required fields."""
    data = request.get_json(silent=True)
    if data is None:
        return None, (jsonify({"error": "Request body must be valid JSON"}), 400)

    missing = [f for f in required_fields if f not in data]
    if missing:
        return None, (jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400)

    return data, None


# ── Service functions ─────────────────────────────────────────────────────────

def _fetch_submissions(exam_id=None, page=1, per_page=_DEFAULT_PAGE_SIZE):
    """Return a paginated list of submitted exams with student info.

    Uses batch $in lookups to avoid the N+1 pattern.
    """
    query = {"status": {"$in": ["submitted", "grading", "graded"]}}
    if exam_id:
        oid = _safe_object_id(exam_id)
        if oid:
            query["exam_id"] = oid

    skip = (page - 1) * per_page
    total = _submissions.count_documents(query)
    docs = list(
        _submissions.find(query)
        .sort("last_updated", -1)
        .skip(skip)
        .limit(per_page)
    )

    user_ids = []
    for d in docs:
        uid = _safe_object_id(d.get("user_id"))
        if uid and uid not in user_ids:
            user_ids.append(uid)

    students_map = {
        str(s["_id"]): s
        for s in _users.find({"_id": {"$in": user_ids}}, {"name": 1, "email": 1, "studentId": 1})
    } if user_ids else {}

    items = []
    for sub in docs:
        user_id_str = str(sub.get("user_id", ""))
        student = students_map.get(user_id_str)
        submitted_at = sub.get("submitted_at") or sub.get("last_updated")

        student_name = student.get("name", "Unknown") if isinstance(student, dict) else "Unknown"
        
        student_email = "Unknown"
        if isinstance(student, dict):
            student_email = student.get("email") or student.get("studentId") or "Unknown"

        items.append({
            "_id": str(sub["_id"]),
            "exam_id": str(sub.get("exam_id", "")),
            "student": student_name,
            "student_email": student_email,
            "submitted_at": submitted_at,
            "is_graded": sub.get("is_graded", False),
            "total_marks": sub.get("total_marks", 0),
        })

    return items, total


def _fetch_submission_detail(submission_oid):
    """Return a single submission with ObjectId fields stringified."""
    doc = _submissions.find_one({"_id": submission_oid})
    if not doc:
        return None

    # Fix 5: normalize answers for backward compat
    doc["_id"] = str(doc["_id"])
    doc["exam_id"] = str(doc.get("exam_id", ""))
    doc["user_id"] = str(doc.get("user_id", ""))
    # Normalize answers to structured array
    doc["answers"] = normalize_answers(
        doc.get("answers", {}),
        doc.get("audio_files"),
    )
    return doc


def _grade_submission(submission_oid, grades, feedback):
    """Apply grades and feedback to a submission.

    Returns (total_marks, None) on success, or (None, error_msg) on failure.
    """
    sub = _submissions.find_one({"_id": submission_oid})
    if not sub:
        return None, "Submission not found"

    # Validate grades values are numeric
    try:
        total_marks = sum(float(v) for v in grades.values())
    except (TypeError, ValueError):
        return None, "All grade values must be numeric"

    _submissions.update_one(
        {"_id": submission_oid},
        {"$set": {
            "grades": grades,
            "total_marks": total_marks,
            "feedback": feedback,
            "is_graded": True,
        }},
    )
    return total_marks, None


# ── Route handlers (thin — validation + response only) ───────────────────────

@evaluation_bp.route("/submissions", methods=["GET"])
@jwt_required()
def get_submissions():
    """Paginated list of submitted exams for evaluation.

    Query params:
        ?exam_id=...   — filter by exam (optional)
        ?page=1        — page number (default 1)
        ?per_page=50   — items per page (default 50, max 200)
    """
    _, err = _require_evaluator()
    if err:
        return err

    exam_id = request.args.get("exam_id")
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(200, max(1, request.args.get("per_page", _DEFAULT_PAGE_SIZE, type=int)))

    try:
        items, total = _fetch_submissions(exam_id=exam_id, page=page, per_page=per_page)
        return jsonify({
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
        })
    except Exception:
        _log.exception("Failed to fetch submissions")
        return jsonify({"error": "Failed to fetch submissions"}), 500


@evaluation_bp.route("/submissions/<submission_id>", methods=["GET"])
@jwt_required()
def get_submission_details(submission_id):
    """View a single submission in full detail."""
    _, err = _require_evaluator()
    if err:
        return err

    oid = _safe_object_id(submission_id)
    if oid is None:
        return jsonify({"error": "Invalid submission ID"}), 400

    detail = _fetch_submission_detail(oid)
    if not detail:
        return jsonify({"error": "Submission not found"}), 404

    return jsonify(detail)


@evaluation_bp.route("/submissions/<submission_id>/grade", methods=["POST"])
@jwt_required()
@validate_request(GradeSchema)
def grade_submission(submission_id):
    """Apply grades and feedback to a submission."""
    _, err = _require_evaluator()
    if err:
        return err

    data = request.validated_data

    oid = _safe_object_id(submission_id)
    if oid is None:
        return jsonify({"error": "Invalid submission ID"}), 400

    grades = data.get("grades", {})
    feedback = data.get("feedback", "")

    try:
        total_marks, error_msg = _grade_submission(oid, grades, feedback)
        if error_msg:
            return jsonify({"error": error_msg}), 400

        return jsonify({"message": "Grading saved", "total_marks": total_marks})
    except Exception:
        _log.exception("Grading failed for submission %s", submission_id)
        return jsonify({"error": "Grading failed"}), 500
