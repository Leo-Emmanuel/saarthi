"""
Submission answers migration — flat dict to structured array.

Converts existing submissions from:
    answers: { "q_id_1": "answer text", "q_id_2": "text" }

To:
    answers: [
        { "question_id": "q_id_1", "text": "answer text", "audio_url": null,
          "auto_score": null, "teacher_marks": null, "flagged_for_review": false },
        ...
    ]

Run manually:
    python -m migrations.migrate_submissions

Or import and call:
    from migrations.migrate_submissions import migrate_submissions
    result = migrate_submissions(db)
"""

import logging

_log = logging.getLogger(__name__)


def migrate_submissions(db):
    """Migrate all submissions from flat dict to structured array format.

    Args:
        db: PyMongo database instance.

    Returns:
        dict with keys: migrated, skipped, errors.
    """
    stats = {"migrated": 0, "skipped": 0, "errors": 0}
    submissions = db.submissions

    for doc in submissions.find():
        answers = doc.get("answers")
        audio_files = doc.get("audio_files", {})

        # Already migrated (list) or empty — skip
        if isinstance(answers, list):
            stats["skipped"] += 1
            continue

        if not isinstance(answers, dict):
            stats["skipped"] += 1
            continue

        try:
            new_answers = _convert_flat_to_array(answers, audio_files)
            submissions.update_one(
                {"_id": doc["_id"]},
                {"$set": {"answers": new_answers}},
            )
            stats["migrated"] += 1
        except Exception:
            _log.exception("Failed to migrate submission %s", doc["_id"])
            stats["errors"] += 1

    return stats


def _convert_flat_to_array(answers_dict, audio_files_dict=None):
    """Convert a flat {q_id: text} to structured array.

    Args:
        answers_dict: old-format answers.
        audio_files_dict: optional old-format audio files.

    Returns:
        list of structured answer dicts.
    """
    result = []
    for q_id, text in answers_dict.items():
        result.append({
            "question_id": q_id,
            "text": text or "",
            "audio_url": audio_files_dict.get(q_id) if isinstance(audio_files_dict, dict) else None,
            "auto_score": None,
            "teacher_marks": None,
            "flagged_for_review": False,
        })
    return result


def normalize_answers(answers, audio_files=None):
    """Normalize answers to the new array format (backward compat layer).

    Accepts both old dict format and new array format.
    Returns answers as a list of structured dicts.
    """
    if isinstance(answers, list):
        return answers
    if isinstance(answers, dict):
        return _convert_flat_to_array(answers, audio_files)
    return []


def answers_to_lookup(answers):
    """Convert structured answers array to a {question_id: text} lookup dict.

    Useful for grading functions that need quick access by question ID.
    """
    if isinstance(answers, dict):
        return answers  # already in old format
    return {a.get("question_id"): a.get("text", "") for a in answers if a.get("question_id")}


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os
    import sys
    # Add the 'backend' folder to the python path so it can be run standalone
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from config.db import db as _db  # type: ignore

    logging.basicConfig(level=logging.INFO)
    result = migrate_submissions(_db)
    print(f"Migration complete: {result}")
