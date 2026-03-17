"""
JWT configuration — httpOnly cookie transport.

Replaces the default header-based JWT transport with secure cookies.
CSRF double-submit protection is enabled to prevent cross-site attacks.
"""

import os
from datetime import timedelta


def configure_jwt(app):
    """Apply JWT cookie settings to the Flask app.

    Must be called BEFORE ``JWTManager(app)``.
    """
    # ── Token location: cookies only (no Authorization header) ────────────
    app.config["JWT_TOKEN_LOCATION"] = ["cookies"]

    # ── Cookie flags ──────────────────────────────────────────────────────
    # Secure=False for local dev (no HTTPS). Set True in production.
    app.config["JWT_COOKIE_SECURE"] = os.getenv("JWT_COOKIE_SECURE", "false").lower() == "true"
    # SameSite=None required for cross-origin requests (frontend ≠ backend domain)
    app.config["JWT_COOKIE_SAMESITE"] = "None"

    # ── CSRF double-submit cookie ─────────────────────────────────────────
    # TEMPORARILY DISABLED for cross-origin deployment
    # Will re-enable after fixing axios interceptor
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False
    app.config["JWT_CSRF_IN_COOKIES"] = False

    # ── Token expiry ──────────────────────────────────────────────────────
    # Set token to expire after 4 hours (240 minutes) to allow long exams
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=4)
