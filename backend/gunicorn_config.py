# Gunicorn configuration for Saarthi backend
# Deployed to handle long Socket.IO polling + grading operations

import os
import signal
import sys

# Timeout: Set to 120s to allow 60s+ grading ops + Socket.IO shutdown
timeout = 120

# Worker timeout grace period: Give workers 30s to shutdown gracefully after SIGTERM
graceful_timeout = 30

# Bind to Render port
bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"

# Single worker for dev/free tier (Render free has limited memory)
workers = int(os.getenv("GUNICORN_WORKERS", "1"))

# Worker class: sync (simple, reliable for Flask-SocketIO with threading async_mode)
worker_class = "sync"

# Worker connections: max concurrent connections per worker
worker_connections = int(os.getenv("GUNICORN_WORKER_CONNECTIONS", "1024"))

# Max requests per worker before restart (prevent memory leaks)
max_requests = int(os.getenv("GUNICORN_MAX_REQUESTS", "10000"))
max_requests_jitter = int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER", "500"))

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Pre-fork hook: Ensure worker starts cleanly
def on_starting(server):
    print(f"🚀 Gunicorn starting: timeout={timeout}s, graceful_timeout={graceful_timeout}s, workers={workers}")

# Worker exit hook: Log when worker exits
def worker_exit(server, worker):
    print(f"⚠️  Worker {worker.pid} exiting")
