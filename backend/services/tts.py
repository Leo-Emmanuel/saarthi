"""
Text-to-Speech service — synthesise audio files from text.

Generates MP3 files and returns a URL path for the client to play.
Includes automatic cleanup of stale audio files.

Dependencies: pyttsx3.
"""

import logging
import os
import time
import uuid

_log = logging.getLogger(__name__)

# Files older than this are eligible for cleanup
_STALE_AGE_SECONDS = 24 * 60 * 60  # 1 day
_DEFAULT_SUBFOLDER = os.path.join("static", "tts_audio")


class TTSService:
    """Synthesise speech audio files from text."""

    def synthesise(self, text, base_dir=None, subfolder=None):
        """Generate an audio file from *text* and return its URL path.

        Args:
            text: the string to convert to speech.
            base_dir: absolute root directory for output.
                      Falls back to Flask ``current_app.root_path`` if *None*.
            subfolder: relative folder under *base_dir*/static/ for output.
                       Defaults to ``tts_audio``.

        Returns:
            URL path string (e.g. ``/static/tts_audio/<uuid>.mp3``),
            or *None* on failure.
        """
        try:
            import pyttsx3

            # ── Resolve output directory ──────────────────────────────────
            if base_dir is None:
                from flask import current_app
                base_dir = current_app.root_path

            rel_folder = subfolder or _DEFAULT_SUBFOLDER
            save_dir = os.path.join(base_dir, rel_folder)

            # Path-traversal guard: ensure resolved dir is under base_dir
            real_base = os.path.realpath(base_dir)
            real_save = os.path.realpath(save_dir)
            if not real_save.startswith(real_base):
                _log.warning("Path traversal blocked: %s", rel_folder)
                return None

            os.makedirs(save_dir, exist_ok=True)

            # ── Synthesise ────────────────────────────────────────────────
            filename = f"{uuid.uuid4()}.mp3"
            output_path = os.path.join(save_dir, filename)

            engine = pyttsx3.init()
            engine.save_to_file(text, output_path)
            engine.runAndWait()

            # Best-effort cleanup of old files
            _cleanup_stale_files(save_dir)

            return f"/{rel_folder.replace(os.sep, '/')}/{filename}"

        except Exception:
            _log.exception("TTS synthesis failed")
            return None

    # Keep 'speak' as an alias for backwards compatibility
    speak = synthesise


def _cleanup_stale_files(folder, max_age=_STALE_AGE_SECONDS):
    """Delete audio files older than *max_age* seconds (best-effort)."""
    try:
        now = time.time()
        for name in os.listdir(folder):
            if not name.lower().endswith(".mp3"):
                continue
            path = os.path.join(folder, name)
            try:
                if now - os.path.getmtime(path) > max_age:
                    os.unlink(path)
                    _log.info("Cleaned up stale TTS file: %s", name)
            except OSError:
                pass
    except OSError:
        pass
