"""
Utility tool endpoints — math solving, TTS, and STT.

Registered at /api/tools in app.py.
"""

import logging
import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from services.math_parser import MathParser, _MAX_EXPR_LEN
from services.tts import TTSService
from services.stt import STTService
from services.upload import UploadService

tools_bp = Blueprint("tools", __name__)

math_parser = MathParser()
tts_service = TTSService()
stt_service = STTService()
_log = logging.getLogger(__name__)

# Import shared limiter from app (set up in app.py)
def _get_limiter():
    from app import limiter
    return limiter


@tools_bp.route("/math/solve", methods=["POST"])
@jwt_required(optional=True)
def solve_math():
    """Parse and solve a math expression."""
    # FIX 8: Rate limit — 15 requests per minute per IP
    try:
        _get_limiter().limit("15 per minute")(lambda: None)()
    except Exception:
        return jsonify({"error": "Rate limit exceeded. Please wait before sending more requests."}), 429

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    expression = data.get("expression")
    if not expression:
        return jsonify({"error": "No expression provided"}), 400

    # FIX 8: Length guard as second line of defense (also enforced in MathParser)
    if len(expression) > _MAX_EXPR_LEN:
        return jsonify({"error": "Expression too long"}), 400

    result = math_parser.parse_and_solve(expression)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)


@tools_bp.route("/tts/speak", methods=["POST"])
@jwt_required()
def text_to_speech():
    """Convert text to speech audio."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    text = data.get("text")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    audio_url = tts_service.speak(text)
    if not audio_url:
        return jsonify({"error": "TTS synthesis failed"}), 500
    return jsonify({"audio_url": audio_url})


@tools_bp.route("/stt/transcribe", methods=["POST"])
@jwt_required()
def speech_to_text():
    """Accept an audio file upload, transcribe it, and return the text.

    The temp file is always deleted after transcription.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Save to a temp location for transcription
    file_path = UploadService.save_temp_file(file)
    if not file_path:
        return jsonify({"error": "Failed to save uploaded file"}), 500

    try:
        result = stt_service.transcribe(file_path)

        # FIX 3: STTService now always returns a structured dict.
        # Check for error key — if absent, return the transcription text.
        if result.get("error"):
            return jsonify({"error": result["error"]}), 422

        return jsonify({"transcription": result["text"]})
    except Exception:
        _log.exception("Transcription failed")
        return jsonify({"error": "Transcription failed"}), 500
    finally:
        # ✅ Always clean up — extracted to finally so it runs on success or error
        try:
            os.unlink(file_path)
        except OSError:
            pass


# ── NLP endpoints ─────────────────────────────────────────────────────────────

def _get_nlp():
    """Get the shared NLP service singleton."""
    from services.nlp import get_nlp_service
    return get_nlp_service()


@tools_bp.route("/nlp/intent", methods=["POST"])
@jwt_required()
def detect_intent():
    """Classify voice input as a command or an answer."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    text = data.get("text")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    result = _get_nlp().detect_intent(text)
    return jsonify(result)


@tools_bp.route("/nlp/summarize", methods=["POST"])
@jwt_required()
def summarize_text():
    """Condense question text for TTS readback."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    text = data.get("text")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    max_sentences = data.get("max_sentences", 2)
    result = _get_nlp().summarize(text, max_sentences=max_sentences)
    return jsonify(result)


@tools_bp.route("/nlp/keywords", methods=["POST"])
@jwt_required()
def extract_keywords():
    """Extract math-relevant keywords from text."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    text = data.get("text")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    keywords = _get_nlp().extract_keywords(text)
    return jsonify({"keywords": keywords})

