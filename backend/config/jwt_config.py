"""
JWT configuration — httpOnly cookie transport.

Replaces the default header-based JWT transport with secure cookies.
CSRF double-submit protection is enabled to prevent cross-site attacks.
"""

import os


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
    # Flask-JWT-Extended sets a non-httpOnly CSRF cookie; the frontend must
    # read it and send its value in the X-CSRF-TOKEN header on every request.
    app.config["JWT_COOKIE_CSRF_PROTECT"] = True
    app.config["JWT_CSRF_IN_COOKIES"] = True  # auto-set the CSRF cookie

    # ── Token expiry ──────────────────────────────────────────────────────
    # Keep the existing SECRET_KEY — already loaded from env.
