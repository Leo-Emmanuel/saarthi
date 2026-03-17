"""
Text-to-Speech service — synthesise audio files from text.

FIX 2: Replaced pyttsx3 (which outputs PCM/WAV data with a .mp3 extension,
breaking browser playback) with edge-tts (Microsoft neural voices, async,
produces genuine MP3 output). Voice: en-US-AriaNeural.

Generates MP3 files and returns a URL path for the client to play.
Includes automatic cleanup of stale audio files.

Dependencies: edge-tts (pip install edge-tts).
"""

import asyncio
import logging
import os
import time
import uuid
from flask import current_app

_log = logging.getLogger(__name__)

# Files older than this are eligible for cleanup
_STALE_AGE_SECONDS = 24 * 60 * 60  # 1 day
_DEFAULT_SUBFOLDER = os.path.join("static", "tts_audio")
_DEFAULT_VOICE = "en-US-AriaNeural"


async def _synthesise_async(text: str, filepath: str, voice: str) -> None:
    """Async helper: use edge-tts to write a real MP3 to filepath."""
    import edge_tts
    communicate = edge_tts.Communicate(text, voice=voice)
    await communicate.save(filepath)


class TTSService:
    """Synthesise speech audio files from text using edge-tts."""

    def synthesise(self, text, base_dir=None, subfolder=None, voice=None):
        """Generate an MP3 audio file from *text* and return its URL path.

        Args:
            text:     the string to convert to speech.
            base_dir: absolute root directory for output.
                      Falls back to Flask ``current_app.root_path`` if *None*.
            subfolder: relative folder under *base_dir* for output.
                       Defaults to ``static/tts_audio``.
            voice:    edge-tts voice name. Defaults to en-US-AriaNeural.

        Returns:
            URL path string (e.g. ``/static/tts_audio/<uuid>.mp3``),
            or *None* on failure.
        """
        try:
            # ── Resolve output directory ──────────────────────────────────
            if base_dir is None:
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

            # ── Synthesise via edge-tts (real MP3) ────────────────────────
            filename = f"{uuid.uuid4()}.mp3"
            output_path = os.path.join(save_dir, filename)
            selected_voice = voice or _DEFAULT_VOICE

            asyncio.run(_synthesise_async(text, output_path, selected_voice))

            # Best-effort cleanup of old files
            _cleanup_stale_files(save_dir)

            return f"/{rel_folder.replace(os.sep, '/')}/{filename}"

        except Exception:
            _log.exception("TTS synthesis failed")
            return None

    # Keep 'speak' as an alias for backwards compatibility
    speak = synthesise


def _cleanup_stale_files(folder, max_age=_STALE_AGE_SECONDS):
    """Delete MP3 files older than *max_age* seconds (best-effort)."""
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
