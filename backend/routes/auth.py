"""
Authentication API endpoints.

Registered at /api/auth in app.py.

Architecture: route handlers are thin — validation helpers and service
functions keep business logic and data access out of the HTTP layer.
"""

import logging
import re
from bson import ObjectId
from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    set_access_cookies,
    unset_jwt_cookies,
)
from werkzeug.security import generate_password_hash, check_password_hash
from config.db import db
from models.user import is_account_locked, record_failed_attempt, reset_failed_attempts
from utils.validation import validate_request
from schemas.auth_schemas import (
    LoginSchema,
    VoiceLoginSchema,
    RegisterSchema,
    RegisterStudentSchema,
)

auth_bp = Blueprint("auth", __name__)

_users = db.users
_log = logging.getLogger(__name__)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _safe_object_id(raw):
    """Convert a string to ObjectId, returning None on malformed input."""
    try:
        return ObjectId(raw)
    except Exception:
        return None


def _require_admin():
    """Validate the JWT identity is an admin user.

    Returns (user_doc, None) on success, or (None, (response, status)) on failure.
    """
    raw_id = get_jwt_identity()
    oid = _safe_object_id(raw_id)
    if oid is None:
        return None, (jsonify({"error": "Invalid session"}), 401)

    user = _users.find_one({"_id": oid})
    if not user or user.get("role") != "admin":
        return None, (jsonify({"error": "Admin access required"}), 403)
    return user, None


def _find_by_student_id(student_id):
    """Case-insensitive lookup by studentId.

    Voice processing may uppercase the ID, so we always match insensitively.
    """
    student_id = student_id.strip()
    pattern = re.compile(f"^{re.escape(student_id)}$", re.IGNORECASE)
    return _users.find_one({"studentId": pattern})


def _make_cookie_response(payload, token, status_code=200):
    """Build a JSON response with JWT set as an httpOnly cookie.

    Fix 1: tokens are now transported via cookies, not in the response body.
    The token is still returned in the body during the transition period so
    the frontend can read the role/name without an extra API call.
    """
    resp = make_response(jsonify(payload), status_code)
    set_access_cookies(resp, token)
    return resp


# ── Service functions ─────────────────────────────────────────────────────────

def _register_user(name, email, password, role):
    """Create a regular user (student/teacher via email signup)."""
    email = email.lower().strip()
    if _users.find_one({"email": email}):
        return None, "User already exists"

    if role not in ("student", "teacher"):
        return None, "Invalid role selected"

    hashed = generate_password_hash(password)
    _users.insert_one({
        "name": name,
        "email": email,
        "password": hashed,
        "role": role,
    })
    return True, None


def _login_user(email, password):
    """Authenticate a regular user by email/password."""
    clean_email = email.lower().strip()
    user = _users.find_one({"email": clean_email})
    if not user or not check_password_hash(user.get("password", ""), password):
        return None, "Invalid credentials"

    token = create_access_token(identity=str(user["_id"]))
    return {
        "token": token,
        "role": user["role"],
        "name": user["name"],
        "tts_settings": user.get("tts_settings", {"rate": 1.0, "pitch": 1.0, "voice": None}),
    }, None


def _register_student(name, student_id, pin, department, email=""):
    """Admin creates a student account with ID and PIN."""
    student_id = student_id.strip()
    # Case-insensitive uniqueness check
    if _find_by_student_id(student_id):
        return None, "Student ID already exists"

    hashed_pin = generate_password_hash(pin)
    _users.insert_one({
        "name": name,
        "studentId": student_id,
        "pin": hashed_pin,
        "department": department,
        "role": "student",
        "email": email,
        "password": "",  # No password for voice students
        "failed_attempts": 0,
        "locked_until": None,
    })
    return True, None


def _login_voice(student_id, pin):
    """Authenticate a student by studentId + PIN (voice login).

    Fix 3: checks brute-force lockout before verifying the PIN.
    """
    user = _find_by_student_id(student_id)
    if not user:
        return None, "Invalid Student ID"

    # Check lockout status
    if is_account_locked(user):
        return None, "Account is temporarily locked due to too many failed attempts. Please try again later."

    if not check_password_hash(user.get("pin", ""), pin):
        # Record the failed attempt
        record_failed_attempt(db, user["_id"])
        return None, "Invalid PIN"

    # Successful login — reset counter
    reset_failed_attempts(db, user["_id"])

    token = create_access_token(identity=str(user["_id"]))
    return {
        "token": token,
        "role": user["role"],
        "name": user["name"],
        "studentId": user["studentId"],
        "tts_settings": user.get("tts_settings", {"rate": 1.0, "pitch": 1.0, "voice": None}),
    }, None


# ── Route handlers (thin — validation + response only) ───────────────────────

@auth_bp.route("/register", methods=["POST"])
@validate_request(RegisterSchema)
def register():
    """Public registration for students/teachers via email."""
    data = request.validated_data

    try:
        result, error_msg = _register_user(
            name=data["name"],
            email=data["email"],
            password=data["password"],
            role=data.get("role", "student"),
        )
        if error_msg:
            return jsonify({"error": error_msg}), 400

        _log.info("User registered: %s", data["email"])
        return jsonify({"message": "User registered successfully"})
    except Exception:
        _log.exception("Registration failed")
        return jsonify({"error": "Registration failed"}), 500


@auth_bp.route("/login", methods=["POST"])
@validate_request(LoginSchema)
def login():
    """Email + password login. Fix 1: sets JWT as httpOnly cookie."""
    data = request.validated_data

    try:
        result, error_msg = _login_user(
            email=data["email"],
            password=data["password"],
        )
        if error_msg:
            return jsonify({"error": error_msg}), 401

        _log.info("User logged in: %s", data["email"])
        # Fix 1: set cookie instead of returning token in body only
        return _make_cookie_response(
            {
                "role": result["role"], 
                "name": result["name"],
                "tts_settings": result["tts_settings"]
            },
            result["token"],
        )
    except Exception:
        _log.exception("Login failed")
        return jsonify({"error": "Login failed"}), 500


@auth_bp.route("/register-student", methods=["POST"])
@jwt_required()
@validate_request(RegisterStudentSchema)
def register_student():
    """Admin creates a student account with ID and PIN."""
    _, admin_err = _require_admin()
    if admin_err:
        return admin_err

    data = request.validated_data

    try:
        result, error_msg = _register_student(
            name=data["name"],
            student_id=data["studentId"],
            pin=data["pin"],
            department=data["department"],
            email=data.get("email", ""),
        )
        if error_msg:
            return jsonify({"error": error_msg}), 400

        _log.info("Student registered: %s", data["studentId"])
        return jsonify({"message": "Student registered successfully"})
    except Exception:
        _log.exception("Student registration failed")
        return jsonify({"error": "Student registration failed"}), 500


@auth_bp.route("/students", methods=["GET"])
@jwt_required()
def get_students():
    """Admin fetches list of students (credentials excluded)."""
    _, admin_err = _require_admin()
    if admin_err:
        return admin_err

    try:
        student_list = list(
            _users.find({"role": "student"}, {"_id": 0, "password": 0, "pin": 0})
        )
        return jsonify(student_list)
    except Exception:
        _log.exception("Failed to fetch students")
        return jsonify({"error": "Failed to fetch students"}), 500


@auth_bp.route("/login-voice", methods=["POST"])
@validate_request(VoiceLoginSchema)
def login_voice():
    """Voice-based login using Student ID and PIN.

    Fix 1: sets JWT as httpOnly cookie.
    Fix 3: rate-limited + brute-force lockout.
    """
    data = request.validated_data

    try:
        result, error_msg = _login_voice(
            student_id=data["studentId"],
            pin=data["pin"],
        )
        if error_msg:
            return jsonify({"error": error_msg}), 401

        _log.info("Voice login: %s", data["studentId"])
        return _make_cookie_response(
            {
                "role": result["role"], 
                "name": result["name"], 
                "studentId": result["studentId"],
                "tts_settings": result["tts_settings"]
            },
            result["token"],
        )
    except Exception:
        _log.exception("Voice login failed")
        return jsonify({"error": "Voice login failed"}), 500


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Clear the JWT cookie. Fix 1: cookie-based logout."""
    resp = make_response(jsonify({"message": "Logged out successfully"}))
    unset_jwt_cookies(resp)
    return resp
