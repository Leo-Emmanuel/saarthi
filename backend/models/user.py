from bson import ObjectId
from datetime import datetime, timedelta, timezone


# ── Lockout configuration ─────────────────────────────────────────────────────
_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_DURATION = timedelta(minutes=15)


class User:
    def __init__(self, name, email=None, password=None, role="student",
                 studentId=None, pin=None, department=None, tts_settings=None):
        self.name = name
        self.email = email
        self.password = password
        self.role = role
        self.studentId = studentId
        self.pin = pin
        self.department = department
        self.tts_settings = tts_settings or {"rate": 1.0, "pitch": 1.0, "voice": None}

    def to_dict(self, include_secrets=False):
        """Serialise to a dict safe for API responses.

        Sensitive fields (password, pin) are excluded by default.
        Pass ``include_secrets=True`` only when writing to the database.
        """
        d = {
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "studentId": self.studentId,
            "department": self.department,
            "tts_settings": self.tts_settings,
        }
        if include_secrets:
            d["password"] = self.password
            d["pin"] = self.pin
        return d


# ── Fix 3: Brute-force protection helpers ─────────────────────────────────────

def is_account_locked(user_doc):
    """Check whether the student account is currently locked out.

    Args:
        user_doc: MongoDB user document (or dict with failed_attempts / locked_until).

    Returns:
        True if the account is locked and the lock has NOT expired.
    """
    attempts = user_doc.get("failed_attempts", 0)
    locked_until = user_doc.get("locked_until")

    if attempts < _MAX_FAILED_ATTEMPTS:
        return False
    if locked_until is None:
        return False
    if not isinstance(locked_until, datetime):
        try:
            locked_until = datetime.fromisoformat(str(locked_until))
        except (ValueError, TypeError):
            return False  # Unparseable — treat as not locked
    return datetime.now(timezone.utc) < locked_until



def record_failed_attempt(db, user_id):
    """Increment the failed login counter and lock the account if threshold reached.

    Args:
        db: PyMongo database instance.
        user_id: string or ObjectId of the user.

    Returns:
        Updated user document.
    """
    oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    user = db.users.find_one({"_id": oid})
    if not user:
        return None

    new_count = user.get("failed_attempts", 0) + 1
    update = {"$set": {"failed_attempts": new_count}}

    if new_count == _MAX_FAILED_ATTEMPTS:
        update["$set"]["locked_until"] = datetime.now(timezone.utc) + _LOCKOUT_DURATION

    db.users.update_one({"_id": oid}, update)
    return db.users.find_one({"_id": oid})


def reset_failed_attempts(db, user_id):
    """Reset the failed login counter after a successful login.

    Args:
        db: PyMongo database instance.
        user_id: string or ObjectId of the user.
    """
    oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    db.users.update_one(
        {"_id": oid},
        {"$set": {"failed_attempts": 0, "locked_until": None}},
    )
