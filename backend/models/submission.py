from bson import ObjectId
from datetime import datetime

class Submission:
    def __init__(self, exam_id, user_id, answers, audio_files=None):
        self.exam_id = ObjectId(exam_id)
        self.user_id = ObjectId(user_id)
        self.answers = answers # Dictionary {question_id: answer_text}
        self.audio_files = audio_files or {} # Dictionary {question_id: audio_url}
        self.submitted_at = datetime.utcnow()
        self.grades = {} # Dictionary {question_id: marks}
        self.total_marks = 0
        self.is_graded = False
        self.feedback = ""

    def to_dict(self):
        return {
            "exam_id": self.exam_id,
            "user_id": self.user_id,
            "answers": self.answers,
            "audio_files": self.audio_files,
            "submitted_at": self.submitted_at,
            "grades": self.grades,
            "total_marks": self.total_marks,
            "is_graded": self.is_graded,
            "feedback": self.feedback
        }
