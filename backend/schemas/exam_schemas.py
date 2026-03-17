"""
Marshmallow schemas for exam and evaluation endpoints.
"""

from marshmallow import Schema, fields, validate, validates_schema, ValidationError, pre_load


class GradingConfigSchema(Schema):
    """Schema for per-question grading configuration."""
    method = fields.String(
        load_default="nlp",
        validate=validate.OneOf(["nlp", "exact", "manual"]),
    )
    threshold_full = fields.Float(load_default=0.7, validate=validate.Range(min=0.0, max=1.0))
    threshold_partial = fields.Float(load_default=0.4, validate=validate.Range(min=0.0, max=1.0))

    @validates_schema
    def validate_thresholds(self, data, **kwargs):
        if data.get("threshold_partial", 0) >= data.get("threshold_full", 1):
            raise ValidationError(
                "threshold_partial must be less than threshold_full",
                field_name="threshold_partial",
            )


class QuestionSchema(Schema):
    """Schema for a single question within an exam."""
    text = fields.String(required=True, validate=validate.Length(min=10))
    type = fields.String(load_default="text", validate=validate.OneOf(["text", "mcq"]))
    options = fields.List(fields.String(), load_default=[])
    correct_answer = fields.String(load_default=None, allow_none=True)
    marks = fields.Integer(load_default=1, validate=validate.Range(min=0))
    grading_config = fields.Nested(GradingConfigSchema, load_default=None, allow_none=True)

    @pre_load
    def normalize_correct_answer(self, data, **kwargs):
        if isinstance(data, dict) and "correct_answer" not in data:
            for key in ("correctAnswer", "answer", "solution"):
                if key in data:
                    data["correct_answer"] = data[key]
                    break
        return data


class ExamCreateSchema(Schema):
    title = fields.String(
        required=True,
        validate=validate.Length(min=3, max=500),
        error_messages={"required": "Exam title is required"},
    )
    description = fields.String(load_default="", validate=validate.Length(max=5000))
    duration = fields.Integer(
        load_default=60,
        validate=validate.Range(min=1, max=600),
    )
    questions = fields.List(fields.Nested(QuestionSchema), load_default=[])
    file_url = fields.String(load_default=None, allow_none=True)
    file_path = fields.String(load_default=None, allow_none=True)


class AnswerItemSchema(Schema):
    """Schema for a single structured answer."""
    question_id = fields.String(required=True)
    text = fields.String(load_default="")
    audio_url = fields.String(load_default=None, allow_none=True)


class SubmitAnswerSchema(Schema):
    answers = fields.Raw(required=True)  # Accept both dict and list for backward compat
    audio_files = fields.Dict(
        keys=fields.String(),
        values=fields.String(),
        load_default={},
    )
    final = fields.Boolean(load_default=False)
    tab_violations = fields.Raw(load_default=0)  # Accept count or list for backward compat


class GradeSchema(Schema):
    grades = fields.Dict(
        keys=fields.String(),
        values=fields.Float(),
        load_default={},
    )
    feedback = fields.String(load_default="", validate=validate.Length(max=10000))

