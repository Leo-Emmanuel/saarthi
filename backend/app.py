import os
import sys
import logging
import time
import signal
import atexit
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()  # Load environment variables first

from flask import Flask, request, jsonify, make_response, g
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

# Configure logging to capture all logger output to stdout
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",  # Simple format - just the message
    stream=sys.stdout,
    force=True,  # Override any existing configuration
)

app = Flask(__name__)
_secret_key = os.getenv("SECRET_KEY")
if not _secret_key:
    raise ValueError(
        "SECRET_KEY environment variable is not set. "
        "Add SECRET_KEY to your .env file before starting the server."
    )
app.secret_key = _secret_key
app.config["JWT_SECRET_KEY"] = _secret_key

# Request timeout protection (Gunicorn timeout is 60s, so abort at 50s)
@app.before_request
def _request_timeout_guard():
    """Store request start time for timeout detection."""
    g.start_time = time.time()

@app.after_request
def _check_request_timeout(response):
    """Log warning if request took >40s (close to timeout)."""
    if hasattr(g, 'start_time'):
        elapsed = time.time() - g.start_time
        if elapsed > 40:
            _startup_log.warning(f"⚠️  Slow request: {request.method} {request.path} took {elapsed:.1f}s")
    return response

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

# On Render, force polling-only mode (WebSocket unreliable on free tier)
_allowed_transports = ["polling"] if _is_production else ["websocket", "polling"]

socketio = SocketIO(
    app,
    cors_allowed_origins=_allowed_origins,
    async_mode="threading",
    logger=_debug_mode,
    engineio_logger=_debug_mode,
    transports=_allowed_transports,           # Force polling on Render
    ping_timeout=60,                          # Close idle connections after 60s (increased for stability)
    ping_interval=25,                         # Send ping every 25s
    max_http_buffer_size=10000000,            # 10MB buffer for large messages
    upgrade_timeout=10,                       # Allow 10s for transport upgrade
)
from routes import socket_events  # noqa: F401

# ── Graceful shutdown for Socket.IO ─────────────────────────────────────────────
_shutdown_in_progress = False

def _close_socketio_connections():
    """Close all active Socket.IO connections on shutdown."""
    global _shutdown_in_progress
    if _shutdown_in_progress:
        return
    _shutdown_in_progress = True
    
    try:
        _startup_log.info("[SHUTDOWN] Closing Socket.IO connections...")
        # Broadcast shutdown event to all connected clients
        try:
            socketio.emit('server_shutdown', 
                         {'message': 'Server is shutting down'}, 
                         namespace='/')
            _startup_log.info("[SHUTDOWN] Shutdown notification sent")
        except Exception as e:
            _startup_log.warning(f"[SHUTDOWN] Could not emit shutdown event: {e}")
        _startup_log.info("[SHUTDOWN] Socket.IO shutdown complete")
    except Exception as e:
        _startup_log.warning(f"[SHUTDOWN] Error during Socket.IO shutdown: {e}")

# Register handler for both normal exit and signals
atexit.register(_close_socketio_connections)

def _shutdown_signal_handler(signum, frame):
    """Handle SIGTERM/SIGINT for graceful shutdown."""
    _startup_log.info(f"[SHUTDOWN] Received signal {signum}")
    _close_socketio_connections()
    sys.exit(0)

signal.signal(signal.SIGTERM, _shutdown_signal_handler)
signal.signal(signal.SIGINT, _shutdown_signal_handler)

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
