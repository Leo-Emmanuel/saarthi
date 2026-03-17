"""
Admin-only API endpoints.

All endpoints require a valid JWT token from an admin-role user.
Registered at /api/admin in app.py.

Architecture: route handlers are thin — DB queries and business logic
live in the _service helpers below so they can be reused or tested
independently.
"""

import logging
import random
import string
from datetime import datetime, timezone
from bson import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from config.db import db

admin_bp = Blueprint("admin", __name__)

_users = db.users
_exams = db.exams
_submissions = db.submissions
_log = logging.getLogger(__name__)

# Default page size for paginated endpoints
_DEFAULT_PAGE_SIZE = 50


# ══════════════════════════════════════════════════════════════════════════════
# Service helpers  (DB access + business logic, no Flask request/response)
# ══════════════════════════════════════════════════════════════════════════════

def _safe_object_id(raw):
    """Convert a string to ObjectId, returning None on malformed input."""
    try:
        return ObjectId(raw)
    except Exception:
        return None


def _get_admin_or_error():
    """Validate the JWT identity is a valid admin.

    Returns (user_doc, None) on success, or (None, (response, status)) on failure.
    """
    raw_id = get_jwt_identity()
    oid = _safe_object_id(raw_id)
    if oid is None:
        return None, (jsonify({"error": "Malformed token identity"}), 401)

    user = _users.find_one({"_id": oid})
    if not user or user.get("role") != "admin":
        return None, (jsonify({"error": "Admin access required"}), 403)
    return user, None


def _fetch_stats():
    """Return dashboard aggregate numbers."""
    return {
        "total_students": _users.count_documents({"role": "student"}),
        "total_exams": _exams.count_documents({}),
        "total_submissions": _submissions.count_documents({}),
        "submissions_in_progress": _submissions.count_documents({"status": "in_progress"}),
        "submissions_submitted": _submissions.count_documents({"status": "submitted"}),
    }


def _fetch_submissions(status=None, page=1, per_page=_DEFAULT_PAGE_SIZE):
    """Return a paginated list of submissions with student/exam names."""
    query = {}
    if status:
        query["status"] = status

    skip = (page - 1) * per_page
    total = _submissions.count_documents(query)
    docs = list(
        _submissions.find(query)
        .sort("last_updated", -1)
        .skip(skip)
        .limit(per_page)
    )

    # Batch-fetch related students and exams (3 queries, not 2N+1)
    user_ids = list({d.get("user_id") for d in docs if d.get("user_id")})
    exam_ids = list({d.get("exam_id") for d in docs if d.get("exam_id")})

    students_map = {
        s["_id"]: s
        for s in _users.find({"_id": {"$in": user_ids}}, {"name": 1, "studentId": 1})
    } if user_ids else {}

    exams_map = {
        e["_id"]: e
        for e in _exams.find({"_id": {"$in": exam_ids}}, {"title": 1})
    } if exam_ids else {}

    items = []
    for doc in docs:
        student = students_map.get(doc.get("user_id"))
        exam = exams_map.get(doc.get("exam_id"))
        items.append({
            "_id": str(doc["_id"]),
            "student_name": student.get("name", "Unknown") if student else "Unknown",
            "student_id": student.get("studentId", "") if student else "",
            "exam_title": exam.get("title", "Unknown") if exam else "Unknown",
            "status": doc.get("status", "unknown"),
            "last_updated": doc.get("last_updated"),
            "submitted_at": doc.get("submitted_at"),
        })

    return items, total


def _fetch_submission_detail(submission_oid):
    """Return a single submission document with student/exam names."""
    doc = _submissions.find_one({"_id": submission_oid})
    if not doc:
        return None

    student = _users.find_one({"_id": doc.get("user_id")}, {"name": 1, "studentId": 1})
    exam = _exams.find_one({"_id": doc.get("exam_id")}, {"title": 1})

    return {
        "_id": str(doc["_id"]),
        "student_name": student.get("name", "Unknown") if student else "Unknown",
        "student_id": student.get("studentId", "") if student else "",
        "exam_title": exam.get("title", "Unknown") if exam else "Unknown",
        "answers": doc.get("answers", {}),
        "audio_files": doc.get("audio_files", {}),
        "status": doc.get("status", "unknown"),
        "last_updated": doc.get("last_updated"),
        "submitted_at": doc.get("submitted_at"),
        "score": doc.get("score"),
        "total_marks": doc.get("total_marks"),
    }


def _delete_student_and_submissions(student_id):
    """Delete a student and cascade-delete their submissions.

    Accepts either MongoDB ObjectId or custom studentId string.
    Returns (student_name, deleted_submission_count) or None if not found.
    """
    student = None
    oid = _safe_object_id(student_id)
    if oid is not None:
        student = _users.find_one({"_id": oid, "role": "student"})
    if not student:
        student = _users.find_one({"studentId": student_id, "role": "student"})
    if not student:
        return None

    deleted = _submissions.delete_many({"user_id": student["_id"]})
    _users.delete_one({"_id": student["_id"]})
    return student.get("name", "Unknown"), deleted.deleted_count


def _reset_student_pin(student_oid):
    """Generate a new random 4-digit PIN, hash it, and store it.

    Returns (student_name, new_plaintext_pin) or None if not found.
    """
    student = _users.find_one({"_id": student_oid, "role": "student"})
    if not student:
        return None

    new_pin = ''.join(random.choices(string.digits, k=4))
    hashed = generate_password_hash(new_pin)
    _users.update_one({"_id": student_oid}, {"$set": {"pin": hashed}})
    return student.get("name", "Unknown"), new_pin


# ══════════════════════════════════════════════════════════════════════════════
# Route handlers  (thin — validation + response formatting only)
# ══════════════════════════════════════════════════════════════════════════════

# ── 1. Dashboard stats ────────────────────────────────────────────────────────

@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    """Overview numbers for the admin dashboard."""
    _, err = _get_admin_or_error()
    if err:
        return err
    return jsonify(_fetch_stats())


# ── 2. List submissions (paginated) ──────────────────────────────────────────

@admin_bp.route("/submissions", methods=["GET"])
@jwt_required()
def list_submissions():
    """Paginated submission list with student/exam names.

    Query params:
        ?status=submitted   — filter by status (optional)
        ?page=1             — page number (default 1)
        ?per_page=50        — items per page (default 50, max 200)
    """
    _, err = _get_admin_or_error()
    if err:
        return err

    status_filter = request.args.get("status")
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(200, max(1, request.args.get("per_page", _DEFAULT_PAGE_SIZE, type=int)))

    items, total = _fetch_submissions(status=status_filter, page=page, per_page=per_page)

    return jsonify({
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    })


# ── 3. Submission detail ─────────────────────────────────────────────────────

@admin_bp.route("/submissions/<submission_id>", methods=["GET"])
@jwt_required()
def get_submission(submission_id):
    """View a single submission in full detail."""
    _, err = _get_admin_or_error()
    if err:
        return err

    oid = _safe_object_id(submission_id)
    if oid is None:
        return jsonify({"error": "Invalid submission ID"}), 400

    detail = _fetch_submission_detail(oid)
    if not detail:
        return jsonify({"error": "Submission not found"}), 404

    return jsonify(detail)


# ── 4. Delete student ─────────────────────────────────────────────────────────

@admin_bp.route("/students/<student_id>", methods=["DELETE"])
@jwt_required()
def delete_student(student_id):
    """Remove a student account and their submissions."""
    _, err = _get_admin_or_error()
    if err:
        return err

    result = _delete_student_and_submissions(student_id)
    if result is None:
        return jsonify({"error": "Student not found"}), 404

    return jsonify({"message": "Student deleted successfully"}), 200


# ── 5. Reset student PIN ─────────────────────────────────────────────────────

@admin_bp.route("/students/<student_id>/reset-pin", methods=["PUT"])
@jwt_required()
def reset_pin(student_id):
    """Generate a new random 4-digit PIN for a student.

    Returns the new PIN exactly once — it is not stored in plaintext.
    """
    _, err = _get_admin_or_error()
    if err:
        return err

    oid = _safe_object_id(student_id)
    if oid is None:
        return jsonify({"error": "Invalid student ID"}), 400

    result = _reset_student_pin(oid)
    if result is None:
        return jsonify({"error": "Student not found"}), 404

    name, new_pin = result
    return jsonify({
        "message": f"PIN reset for '{name}'",
        "new_pin": new_pin,
        "note": "This PIN is shown only once. Please note it down.",
    })


# ── 6. Update existing MCQ questions ───────────────────────────────────────────

@admin_bp.route("/update-mcqs", methods=["POST"])
@jwt_required()
def update_existing_mcqs():
    """Update existing exam questions to properly detect MCQ questions."""
    _, err = _get_admin_or_error()
    if err:
        return err

    # Get all exams
    exams = list(_exams.find({}))
    updated_count = 0
    
    for exam in exams:
        exam_id = exam["_id"]
        questions = exam.get("questions", [])
        updated_questions = []
        
        for question in questions:
            # Check if this question has options but is marked as "text"
            if question.get("type") == "text" and question.get("options") and len(question.get("options", [])) > 0:
                # Update to MCQ type
                question["type"] = "mcq"
                updated_questions.append(question)
                updated_count += 1
            else:
                updated_questions.append(question)
        
        # Persist processed questions for this exam
        if updated_questions:
            _exams.update_one(
                {"_id": exam_id},
                {"$set": {"questions": updated_questions}}
            )
    
    return jsonify({
        "message": f"Updated {updated_count} questions to MCQ type",
        "total_updated": updated_count
    })


@admin_bp.route("/student/<student_id>/tts", methods=["PATCH"])
@jwt_required()
def update_student_tts(student_id):
    """Update TTS settings for a specific student."""
    _, err = _get_admin_or_error()
    if err:
        return err

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        rate = float(data.get("rate", 1.0))
        pitch = float(data.get("pitch", 1.0))
        voice = data.get("voice", None)

        # Validate ranges
        rate = max(0.5, min(2.0, rate))
        pitch = max(0.5, min(2.0, pitch))

        tts_settings = {"rate": rate, "pitch": pitch, "voice": voice}

        # Try to find student by studentId field first, then by _id
        student = _users.find_one({"studentId": student_id})
        if not student:
            # Try by ObjectId if studentId not found
            try:
                student = _users.find_one({"_id": ObjectId(student_id)})
            except Exception:
                pass
        
        if not student:
            _log.error(f"Student not found with ID: {student_id}")
            return jsonify({"error": "Student not found"}), 404

        result = _users.update_one(
            {"_id": student["_id"]},
            {"$set": {"tts_settings": tts_settings}}
        )
        
        _log.info(f"Updated TTS settings for student {student_id}: {tts_settings}")

        if result.matched_count == 0:
            return jsonify({"error": "Student not found"}), 404

        return jsonify({
            "message": "TTS settings updated successfully",
            "tts_settings": tts_settings
        }), 200

    except Exception as e:
        _log.exception("Failed to update TTS settings")
        return jsonify({"error": f"Failed to update TTS settings: {str(e)}"}), 500


@admin_bp.route("/staff", methods=["POST"])
@jwt_required()
def create_staff():
    """Create a teacher/admin account."""
    _, err = _get_admin_or_error()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()
    role = str(data.get("role", "teacher")).strip()

    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if role not in ("teacher", "admin"):
        return jsonify({"error": "Role must be teacher or admin"}), 400

    if _users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400

    hashed = generate_password_hash(password)
    new_staff = {
        "name": name,
        "email": email,
        "password": hashed,
        "role": role,
        "department": "MCA",
        "created_at": datetime.now(timezone.utc),
    }
    _users.insert_one(new_staff)
    _log.info("Staff created: %s (%s)", email, role)
    return jsonify({"message": f"{role.capitalize()} created successfully"}), 201


@admin_bp.route("/staff", methods=["GET"])
@jwt_required()
def get_staff():
    """Return all teacher/admin accounts."""
    _, err = _get_admin_or_error()
    if err:
        return err

    staff = list(_users.find(
        {"role": {"$in": ["teacher", "admin"]}},
        {"password": 0, "pin": 0}
    ))
    for member in staff:
        member["_id"] = str(member["_id"])
    return jsonify(staff), 200


@admin_bp.route("/staff/<staff_id>", methods=["DELETE"])
@jwt_required()
def delete_staff(staff_id):
    """Delete a teacher/admin account by id."""
    admin, err = _get_admin_or_error()
    if err:
        return err

    oid = _safe_object_id(staff_id)
    if not oid:
        return jsonify({"error": "Invalid ID"}), 400
    if oid == admin["_id"]:
        return jsonify({"error": "Cannot delete your own account"}), 400

    result = _users.delete_one({"_id": oid, "role": {"$in": ["teacher", "admin"]}})
    if result.deleted_count == 0:
        return jsonify({"error": "Staff member not found"}), 404
    return jsonify({"message": "Staff member deleted"}), 200


# ── System settings ────────────────────────────────────────────────────────────

_DEFAULT_SYSTEM_SETTINGS = {
    "default_tts": {"rate": 1.0, "pitch": 1.0, "voice": None},
    "default_exam_duration": 60,
}


def _merge_system_settings(admin_doc):
    """Return system settings from the admin document, merged with defaults."""
    stored = admin_doc.get("system_settings") or {}
    merged = {**_DEFAULT_SYSTEM_SETTINGS, **stored}
    merged["default_tts"] = {
        **_DEFAULT_SYSTEM_SETTINGS["default_tts"],
        **(merged.get("default_tts") or {}),
    }
    return merged


@admin_bp.route("/settings", methods=["GET"])
@jwt_required()
def get_system_settings():
    """Return the system-wide settings stored on the admin account."""
    admin, err = _get_admin_or_error()
    if err:
        return err
    return jsonify(_merge_system_settings(admin)), 200


@admin_bp.route("/settings", methods=["PATCH"])
@jwt_required()
def update_system_settings():
    """Update one or more system-wide settings on the admin account."""
    admin, err = _get_admin_or_error()
    if err:
        return err

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No data provided"}), 400

    current = _merge_system_settings(admin)

    if "default_tts" in data:
        tts = data["default_tts"]
        current["default_tts"]["rate"] = max(0.5, min(2.0, float(tts.get("rate", current["default_tts"]["rate"]))))
        current["default_tts"]["pitch"] = max(0.5, min(2.0, float(tts.get("pitch", current["default_tts"]["pitch"]))))
        current["default_tts"]["voice"] = tts.get("voice", current["default_tts"]["voice"])

    if "default_exam_duration" in data:
        current["default_exam_duration"] = max(5, min(300, int(data["default_exam_duration"])))

    _users.update_one({"_id": admin["_id"]}, {"$set": {"system_settings": current}})
    _log.info("System settings updated by admin %s", admin.get("email"))
    return jsonify(current), 200
