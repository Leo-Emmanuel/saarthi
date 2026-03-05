from bson import ObjectId
from datetime import datetime


class Question:
    """Represents a single exam question.

    Accepts an optional ``id`` so existing database records can be
    rehydrated into Question instances without generating a new ObjectId.
    """

    def __init__(self, text, q_type, options=None, correct_answer=None, marks=1, id=None, grading_config=None):
        self.id = ObjectId(id) if id else ObjectId()
        self.text = text
        self.type = q_type  # 'text', 'mcq', 'voice'
        self.options = options or []
        self.correct_answer = correct_answer
        self.marks = marks
        # Fix 4: per-question grading config
        # { method: "nlp"|"exact"|"manual", threshold_full: float, threshold_partial: float }
        self.grading_config = grading_config

    def to_dict(self):
        d = {
            "_id": self.id,
            "text": self.text,
            "type": self.type,
            "options": self.options,
            "correct_answer": self.correct_answer,
            "marks": self.marks,
        }
        if self.grading_config:
            d["grading_config"] = self.grading_config
        return d

    @classmethod
    def from_dict(cls, data):
        """Reconstruct a Question from a MongoDB document dict."""
        return cls(
            text=data["text"],
            q_type=data["type"],
            options=data.get("options", []),
            correct_answer=data.get("correct_answer"),
            marks=data.get("marks", 1),
            id=data.get("_id"),
            grading_config=data.get("grading_config"),
        )


class Exam:
    """Represents an exam containing zero or more Questions.

    The ``questions`` attribute always holds ``Question`` instances (not
    raw dicts) so callers can rely on a consistent object-oriented API.
    Serialisation to dicts happens only inside ``to_dict()``.
    """

    def __init__(self, title, description, created_by, duration, questions=None, file_url=None, examType=None):
        self.title = title
        self.description = description
        self.created_by = ObjectId(created_by)  # Admin ID
        self.duration = duration  # In minutes
        # ✅ Keep questions as Question objects — convert dicts on the way in
        self.questions = [
            q if isinstance(q, Question) else Question.from_dict(q)
            for q in (questions or [])
        ]
        self.file_url = file_url
        self.examType = examType
        self.created_at = datetime.utcnow()

    def to_dict(self):
        return {
            "title": self.title,
            "description": self.description,
            "created_by": self.created_by,
            "duration": self.duration,
            "questions": [q.to_dict() for q in self.questions],
            "file_url": self.file_url,
            "examType": self.examType,
            "created_at": self.created_at,
        }
