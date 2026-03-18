from flask_socketio import join_room, leave_room, emit, disconnect
from flask_jwt_extended import decode_token
from flask import request as flask_request
from app import socketio
import logging

_log = logging.getLogger(__name__)


@socketio.on('connect')
def on_connect(auth):
    """Handle Socket.IO connection."""
    try:
        _log.info(f"[SOCKET] New connection attempt from {flask_request.remote_addr}")
        return True  # Accept connection, validate auth on join_teacher instead
        
    except Exception as e:
        _log.exception(f"[SOCKET] connect failed: {str(e)}")
        return False


@socketio.on_error()
def on_error(e):
    """Global error handler for Socket.IO."""
    _log.error(f"[SOCKET] Error: {str(e)}", exc_info=True)


@socketio.on_error_default
def default_error_handler(e):
    """Default error handler for unhandled exceptions."""
    _log.error(f"[SOCKET] Unhandled error: {str(e)}", exc_info=True)


@socketio.on('disconnect')
def on_disconnect():
    """Handle client disconnect."""
    _log.info(f"[SOCKET] Client disconnected from {flask_request.remote_addr}")


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
