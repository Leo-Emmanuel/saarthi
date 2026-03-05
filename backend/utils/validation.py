"""
Request validation decorator using marshmallow schemas.

Usage:
    @validate_request(LoginSchema)
    def login():
        data = request.validated_data  # already validated & deserialized
        ...
"""

from functools import wraps
from flask import request, jsonify
from marshmallow import ValidationError


def validate_request(schema_class):
    """Decorator that validates the JSON body against a marshmallow schema.

    On success:  ``request.validated_data`` is set to the deserialized dict
                 and the decorated function runs normally.
    On failure:  returns a 422 response with per-field error details.
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            body = request.get_json(silent=True)
            if body is None:
                return jsonify({"error": "Request body must be valid JSON"}), 400

            schema = schema_class()
            try:
                request.validated_data = schema.load(body)
            except ValidationError as err:
                return jsonify({
                    "error": "Validation failed",
                    "errors": err.messages,
                }), 422

            return fn(*args, **kwargs)

        return wrapper

    return decorator
