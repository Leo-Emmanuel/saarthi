"""
File upload service — save uploaded files securely.

Provides two methods:
    save_file      → for permanent uploads (exam PDFs, etc.) — returns a URL
    save_temp_file → for ephemeral processing (STT audio) — returns an abs path

Dependencies: werkzeug (for secure_filename).
"""

import logging
import os
import tempfile
import time
import uuid

from werkzeug.utils import secure_filename

_log = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

# Allowed extensions per upload type
_ALLOWED_DOCUMENT_EXT = {".pdf", ".docx", ".doc", ".txt"}
_ALLOWED_AUDIO_EXT = {".wav", ".mp3", ".ogg", ".webm", ".m4a", ".flac"}

# Default subfolder for permanent uploads (under static/)
_DEFAULT_UPLOAD_FOLDER = "uploads"

# Temp files older than this are cleaned up automatically
_STALE_AGE_SECONDS = 2 * 60 * 60  # 2 hours


def _validate_filename(file):
    """Return a safe, non-empty filename or None if invalid."""
    if not file or not getattr(file, "filename", None):
        return None
    name = secure_filename(file.filename)
    # secure_filename can return "" for pathological inputs like "../../"
    return name if name else None


def _check_extension(filename, allowed):
    """Return True if the file's extension is in the allowed set."""
    _, ext = os.path.splitext(filename)
    return ext.lower() in allowed


class UploadService:
    """Save uploaded files with validation, path-safety, and cleanup."""

    @staticmethod
    def save_file(file, folder=None, base_dir=None, allowed_ext=None):
        """Save an uploaded file to a public directory and return its URL.

        Args:
            file: a Werkzeug ``FileStorage`` object.
            folder: subfolder name under ``<base_dir>/static/`` (default: ``uploads``).
            base_dir: root directory; falls back to Flask ``current_app.root_path``.
            allowed_ext: set of allowed extensions (default: documents).

        Returns:
            URL path (e.g. ``/static/uploads/file.pdf``) or *None* on failure.
        """
        safe_name = _validate_filename(file)
        if safe_name is None:
            _log.warning("Upload rejected: empty or invalid filename")
            return None
        unique_prefix = uuid.uuid4().hex[:8]
        filename = f"{unique_prefix}_{safe_name}"

        exts = allowed_ext or _ALLOWED_DOCUMENT_EXT
        if not _check_extension(filename, exts):
            _log.warning("Upload rejected: disallowed extension in %s", filename)
            return None

        if base_dir is None:
            from flask import current_app
            base_dir = current_app.root_path

        sub = folder or _DEFAULT_UPLOAD_FOLDER
        upload_dir = os.path.join(base_dir, "static", sub)
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        _log.info("Saved upload: %s", filename)

        return f"/static/{sub}/{filename}"

    @staticmethod
    def save_temp_file(file, base_dir=None, allowed_ext=None):
        """Save an uploaded file to a private temp directory.

        The file is stored *outside* the public static directory so it
        cannot be accessed via a URL.  Callers must delete the file
        after processing.

        Args:
            file: a Werkzeug ``FileStorage`` object.
            base_dir: root directory for the temp folder; falls back to
                      Flask ``current_app.root_path``.
            allowed_ext: set of allowed extensions (default: audio formats).

        Returns:
            Absolute filesystem path, or *None* on failure.
        """
        safe_name = _validate_filename(file)
        if safe_name is None:
            _log.warning("Temp upload rejected: empty or invalid filename")
            return None
        unique_prefix = uuid.uuid4().hex[:8]
        filename = f"{unique_prefix}_{safe_name}"

        exts = allowed_ext or _ALLOWED_AUDIO_EXT
        if not _check_extension(filename, exts):
            _log.warning("Temp upload rejected: disallowed extension in %s", filename)
            return None

        if base_dir is None:
            from flask import current_app
            base_dir = current_app.root_path

        # Store in a private _tmp directory (NOT under static/)
        tmp_dir = os.path.join(base_dir, "_tmp")
        os.makedirs(tmp_dir, exist_ok=True)

        file_path = os.path.join(tmp_dir, filename)
        file.save(file_path)

        # Best-effort cleanup of old temp files
        _cleanup_stale(tmp_dir)

        return file_path

    @staticmethod
    def cleanup_temp(base_dir=None, max_age=None):
        """Manually trigger cleanup of stale temp files."""
        if base_dir is None:
            from flask import current_app
            base_dir = current_app.root_path
        _cleanup_stale(os.path.join(base_dir, "_tmp"), max_age or _STALE_AGE_SECONDS)


def _cleanup_stale(folder, max_age=_STALE_AGE_SECONDS):
    """Delete files older than *max_age* seconds (best-effort)."""
    try:
        now = time.time()
        for name in os.listdir(folder):
            path = os.path.join(folder, name)
            if not os.path.isfile(path):
                continue
            try:
                if now - os.path.getmtime(path) > max_age:
                    os.unlink(path)
                    _log.info("Cleaned up stale temp file: %s", name)
            except OSError:
                pass
    except OSError:
        pass
