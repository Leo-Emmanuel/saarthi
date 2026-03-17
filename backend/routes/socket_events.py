from flask_socketio import join_room, leave_room
from app import socketio


@socketio.on('join_teacher')
def on_join_teacher():
    join_room('teachers')


@socketio.on('leave_teacher')
def on_leave_teacher():
    leave_room('teachers')
