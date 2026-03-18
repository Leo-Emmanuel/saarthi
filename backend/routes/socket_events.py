from flask_socketio import join_room, leave_room, disconnect, emit
from flask_jwt_extended import decode_token
from app import socketio
import os
import logging

_log = logging.getLogger(__name__)
_jwt_secret = os.getenv("JWT_SECRET_KEY", "")


def _authenticate_socket(sid, data=None):
    """Authenticate Socket.IO connection by validating JWT from cookies."""
    try:
        # Get the token from cookies via the handshake
        token = None
        cookies = {}
        
        # Extract token from request cookies
        environ = getattr(socketio.server.environ, 'get', {})
        if isinstance(environ, dict):
            # Flask-SocketIO passes request info differently
            pass
        
        # Try to get token from session or cookies
        # In Flask-SocketIO, we can access cookies via request context
        from flask import request as flask_request
        token = flask_request.cookies.get('access_token_cookie')
        
        if not token:
            _log.warning(f"[SOCKET] No JWT token found for connection {sid}")
            return False
        
        # Verify the token
        decoded = decode_token(token)
        _log.info(f"[SOCKET] Authenticated user {decoded['sub']} for connection {sid}")
        return True
        
    except Exception as e:
        _log.warning(f"[SOCKET] Authentication failed for connection {sid}: {str(e)}")
        return False


@socketio.on('connect')
def on_connect(auth):
    """Handle Socket.IO connection with JWT authentication."""
    from flask import request as flask_request
    try:
        # Get token from cookies
        token = flask_request.cookies.get('access_token_cookie')
        
        if not token:
            _log.warning(f"[SOCKET] connect: No JWT token in cookies")
            return False  # Reject connection
        
        # Verify the token
        decoded = decode_token(token)
        user_id = decoded.get('sub')
        _log.info(f"[SOCKET] connect: Authenticated user {user_id}")
        return True  # Accept connection
        
    except Exception as e:
        _log.warning(f"[SOCKET] connect: JWT validation failed: {str(e)}")
        return False  # Reject connection


@socketio.on('join_teacher')
def on_join_teacher():
    """Join teacher room (broadcast updates to all teachers)."""
    try:
        from flask_jwt_extended import get_jwt_identity
        from flask import request as flask_request
        
        # Validate JWT
        token = flask_request.cookies.get('access_token_cookie')
        if not token:
            _log.warning(f"[SOCKET] join_teacher: No token found")
            emit('error', {'message': 'Unauthorized'})
            return
        
        decoded = decode_token(token)
        user_id = decoded.get('sub')
        join_room('teachers')
        _log.info(f"[SOCKET] User {user_id} joined teachers room")
        
    except Exception as e:
        _log.exception(f"[SOCKET] join_teacher failed: {str(e)}")
        emit('error', {'message': 'Authentication failed'})


@socketio.on('leave_teacher')
def on_leave_teacher():
    """Leave teacher room."""
    try:
        leave_room('teachers')
        _log.info(f"[SOCKET] User left teachers room")
    except Exception as e:
        _log.exception(f"[SOCKET] leave_teacher failed: {str(e)}")
