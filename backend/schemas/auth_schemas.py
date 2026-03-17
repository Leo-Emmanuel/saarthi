"""
Marshmallow schemas for authentication endpoints.
"""

from marshmallow import Schema, fields, validate, pre_load


class LoginSchema(Schema):
    email = fields.Email(required=True, error_messages={"required": "Email is required"})
    password = fields.String(
        required=True,
        validate=validate.Length(min=1),
        error_messages={"required": "Password is required"},
    )


class VoiceLoginSchema(Schema):
    studentId = fields.String(
        required=True,
        validate=validate.Length(min=1, max=50),
        error_messages={"required": "Student ID is required"},
    )
    pin = fields.String(
        required=True,
        validate=[validate.Length(min=4, max=6), validate.Regexp(r"^\d{4,6}$", error="PIN must be 4 to 6 digits")],
        error_messages={"required": "PIN is required"},
    )

    @pre_load
    def strip_fields(self, data, **kwargs):
        """Strip whitespace from studentId and pin before validation.

        Voice STT may include trailing spaces that cause 422 failures.
        """
        if isinstance(data.get("studentId"), str):
            data["studentId"] = data["studentId"].strip()
        if isinstance(data.get("pin"), str):
            pin_val = str(data["pin"])
            digits_list = []
            for char in pin_val:
                if char.isdigit() and len(digits_list) < 6:
                    digits_list.append(char)
            data["pin"] = "".join(digits_list)
        return data


class RegisterSchema(Schema):
    name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=200),
        error_messages={"required": "Name is required"},
    )
    email = fields.Email(required=True, error_messages={"required": "Email is required"})
    password = fields.String(
        required=True,
        validate=validate.Length(min=6, max=128),
        error_messages={"required": "Password is required"},
    )
    role = fields.String(
        load_default="student",
        validate=validate.OneOf(["student", "teacher"]),
    )


class RegisterStudentSchema(Schema):
    name = fields.String(
        required=True,
        validate=validate.Length(min=2, max=200),
        error_messages={"required": "Name is required"},
    )
    studentId = fields.String(
        required=True,
        validate=[
            validate.Length(min=1, max=50),
            validate.Regexp(r"^[A-Za-z0-9]+$", error="Student ID must be alphanumeric with no spaces"),
        ],
        error_messages={"required": "Student ID is required"},
    )
    pin = fields.String(
        required=True,
        validate=[validate.Length(min=4, max=6), validate.Regexp(r"^\d{4,6}$", error="PIN must be 4 to 6 digits")],
        error_messages={"required": "PIN is required"},
    )
    department = fields.String(
        required=True,
        validate=validate.Length(min=1, max=200),
        error_messages={"required": "Department is required"},
    )
    email = fields.String(load_default="")
