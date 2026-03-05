from dotenv import load_dotenv
load_dotenv()  # Load environment variables first

from flask_jwt_extended import JWTManager
from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from config.db import db
from config.jwt_config import configure_jwt
from routes.auth import auth_bp
from routes.exam import exam_bp
from routes.admin import admin_bp
from routes.evaluation import evaluation_bp
from routes.tools import tools_bp

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY")
app.secret_key = os.getenv("SECRET_KEY", "dev_secret")

# ── Fix 1: JWT httpOnly cookie transport ──────────────────────────────────────
configure_jwt(app)
jwt = JWTManager(app)

# ── CORS: allow credentials (cookies) from the Vite dev server ────────────────
CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])

# ── Fix 3: Rate limiter (shared instance, imported by route modules) ──────────
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],           # No global limit — applied per-endpoint
    storage_uri="memory://",     # In-memory for simplicity (no Redis)
)

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(exam_bp, url_prefix="/api/exam")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(evaluation_bp, url_prefix="/api/evaluation")
app.register_blueprint(tools_bp, url_prefix="/api/tools")

@app.route("/")
def home():
    return {"message": "Saarthi backend running"}

if __name__ == "__main__":
    app.run(debug=True)
