"""
Speech-to-Text service — transcribe audio files to text.

Accepts any audio format supported by pydub/ffmpeg (webm, mp3, ogg, wav, …)
and converts to a temporary WAV before passing to SpeechRecognition.

Requires:
    pip install pydub SpeechRecognition
    ffmpeg on PATH  (https://ffmpeg.org/download.html)

FIX 3: `transcribe()` now ALWAYS returns a structured dict:
    - Success: {"text": "the transcribed string"}
    - Failure: {"error": "description"}
This eliminates the inconsistency where success returned a plain str
and failure returned a dict, which caused dead-code branches in tools.py.
"""

import logging
import os
import tempfile

import speech_recognition as sr

_log = logging.getLogger(__name__)


class STTService:
    """Transcribe audio files using Google Speech Recognition."""

    def transcribe(self, audio_path: str) -> dict:
        """Transcribe an audio file to text.

        Args:
            audio_path: absolute path to the audio file (any ffmpeg format).

        Returns:
            Always a dict:
            - {"text": "..."}  on success
            - {"error": "..."} on failure
        """
        if not os.path.exists(audio_path):
            return {"error": "Audio file not found"}

        wav_path = None
        try:
            wav_path = self._convert_to_wav(audio_path)
            return self._recognise(wav_path)
        except Exception as exc:
            _log.exception("STT transcription failed for %s", audio_path)
            return {"error": str(exc)}
        finally:
            # Always clean up the temp WAV — never leak temp files
            if wav_path and wav_path != audio_path:
                try:
                    os.unlink(wav_path)
                except OSError:
                    pass

    # ── Internal helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _convert_to_wav(audio_path: str) -> str:
        """Convert any audio format to a temporary WAV file.

        Returns the path to the WAV file (may be the original path if
        pydub is unavailable and the file is hopefully already WAV).
        """
        try:
            from pydub import AudioSegment
        except ImportError:
            _log.warning("pydub not installed — assuming file is already WAV")
            return audio_path

        # Write directly to a named temp file — no intermediate buffer
        fd, wav_path = tempfile.mkstemp(suffix=".wav")
        try:
            os.close(fd)  # close the fd; pydub will write by path
            audio = AudioSegment.from_file(audio_path)
            audio.export(wav_path, format="wav")
            return wav_path
        except Exception:
            # Clean up the temp file if conversion fails
            try:
                os.unlink(wav_path)
            except OSError:
                pass
            raise  # re-raise so the caller sees the error

    @staticmethod
    def _recognise(wav_path: str) -> dict:
        """Transcribe a WAV file via Google Speech Recognition.

        Returns:
            {"text": "..."} on success
            {"error": "..."} on failure

        Does NOT call ``adjust_for_ambient_noise`` — that method is designed
        for live microphone streams, not pre-recorded files.  On a file source
        it silently skips the first *duration* seconds of audio, losing content.
        """
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)

        try:
            text = recognizer.recognize_google(audio_data)
            return {"text": text}
        except sr.UnknownValueError:
            return {"error": "Could not understand audio — speech may be too quiet or unclear"}
        except sr.RequestError as exc:
            return {"error": f"Google Speech Recognition unavailable: {exc}"}
