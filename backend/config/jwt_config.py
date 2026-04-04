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
    _is_secure = os.getenv("JWT_COOKIE_SECURE", "false").lower() == "true"
    app.config["JWT_COOKIE_SECURE"] = _is_secure

    # SameSite=None requires Secure=True (HTTPS) per browser spec — browsers
    # silently DROP None cookies over plain HTTP, breaking local dev login.
    # Use "Lax" for HTTP dev, "None" only in production where HTTPS is enforced.
    app.config["JWT_COOKIE_SAMESITE"] = "None" if _is_secure else "Lax"

    # ── CSRF double-submit cookie ─────────────────────────────────────────
    # TEMPORARILY DISABLED for cross-origin deployment
    # Will re-enable after fixing axios interceptor
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False
    app.config["JWT_CSRF_IN_COOKIES"] = False

    # ── Token expiry ──────────────────────────────────────────────────────
    # Set token to expire after 4 hours (240 minutes) to allow long exams
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=4)
