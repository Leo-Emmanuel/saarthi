import os
import sys
import logging
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()  # Load environment variables first

from flask import Flask, request, jsonify, make_response
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO

from config.db import db, create_indexes
from config.jwt_config import configure_jwt
from routes.auth import auth_bp
from routes.exam import exam_bp
from routes.admin import admin_bp
from routes.evaluation import evaluation_bp
from routes.tools import tools_bp

app = Flask(__name__)
_secret_key = os.getenv("SECRET_KEY")
if not _secret_key:
    raise ValueError(
        "SECRET_KEY environment variable is not set. "
        "Add SECRET_KEY to your .env file before starting the server."
    )
app.secret_key = _secret_key
app.config["JWT_SECRET_KEY"] = _secret_key

_startup_log = logging.getLogger("startup")

if os.getenv("FLASK_DEBUG", "false").lower() == "true":
    _startup_log.warning("⚠️  FLASK_DEBUG is enabled — do not use in production")

if os.getenv("RATELIMIT_STORAGE_URI", "memory://") == "memory://":
    _startup_log.warning("⚠️  Rate limiter using memory:// — brute force protection resets on restart")

if os.getenv("JWT_COOKIE_SECURE", "false").lower() != "true":
    _startup_log.warning("⚠️  JWT_COOKIE_SECURE is false — cookies will transmit over HTTP")

# ── Fix 1: JWT httpOnly cookie transport ──────────────────────────────────────
configure_jwt(app)
jwt = JWTManager(app)

# ── CORS: allow credentials (cookies) from the Vite dev server ────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
CORS(app, supports_credentials=True, origins=_allowed_origins)

# ── Fix 3: Rate limiter (shared instance, imported by route modules) ──────────
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],           # No global limit — applied per-endpoint
    storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
)

_debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
# Use polling only on free tier (WebSocket has issues on Render free tier with HTTPS)
_is_production = os.getenv("RENDER", "false").lower() == "true"
socketio = SocketIO(
    app,
    cors_allowed_origins=_allowed_origins,
    async_mode="threading",
    allowEIO3=True,
    # On free tier production, use polling only (WebSocket upgrade fails)
    transports=['polling'] if _is_production else ['websocket', 'polling'],
    logger=_debug_mode,
    engineio_logger=_debug_mode,
    ping_timeout=60,
    ping_interval=25,
)
from routes import socket_events  # noqa: F401

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(exam_bp, url_prefix="/api/exam")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(evaluation_bp, url_prefix="/api/evaluation")
app.register_blueprint(tools_bp, url_prefix="/api/tools")

with app.app_context():
    create_indexes()

@app.route("/")
def home():
    return {"message": "Saarthi backend running"}

if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    socketio.run(app, debug=debug_mode, port=5000, use_reloader=False)
