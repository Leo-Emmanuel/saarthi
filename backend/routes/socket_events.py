from flask_socketio import join_room, leave_room, emit
from flask_jwt_extended import decode_token
from flask import request as flask_request
from app import socketio
import logging

_log = logging.getLogger(__name__)


@socketio.on('connect')
def on_connect(auth):
    """Handle Socket.IO connection with JWT authentication."""
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
