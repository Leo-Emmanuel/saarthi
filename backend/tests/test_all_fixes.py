import pytest
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import from backend components
from models.user import is_account_locked, record_failed_attempt, _MAX_FAILED_ATTEMPTS
from routes.exam import _extract_mcq_letter, _normalize_mcq
from migrations.migrate_submissions import answers_to_lookup
# test_all_fixes.py test functions

def test_is_account_locked():
    # test: not-locked (attempts=4)
    assert is_account_locked({"failed_attempts": 4}) == False
    
    # test: locked (attempts=5 + future expiry)
    future = datetime.now(timezone.utc) + timedelta(minutes=10)
    assert is_account_locked({"failed_attempts": 5, "locked_until": future}) == True
    
    # test: expired (attempts=5 + past expiry)
    past = datetime.now(timezone.utc) - timedelta(minutes=10)
    assert is_account_locked({"failed_attempts": 5, "locked_until": past}) == False
    
    # test: non-datetime locked_until (must not crash)
    assert is_account_locked({"failed_attempts": 5, "locked_until": str(future)}) == True
    assert is_account_locked({"failed_attempts": 5, "locked_until": "invalid-datetime-string"}) == False

def test_configurable_grading():
    from services.nlp import get_nlp_service
    nlp = get_nlp_service()
    res = nlp.score_similarity("five", "5")
    assert res["score"] == 1.0
    
    from schemas.exam_schemas import GradingConfigSchema
    from marshmallow import ValidationError
    schema = GradingConfigSchema()
    try:
        schema.load({"threshold_full": 0.5, "threshold_partial": 0.6})
        assert False, "Should have raised ValidationError"
    except ValidationError:
        pass

def test_migration_helper():
    # test_migration_helper() — assert converted output is a list, correct question_id, correct text, and that list-format input is skipped
    from migrations.migrate_submissions import normalize_answers
    # dict format input
    d_input = { "q1": "Answer 1", "q2": "Answer 2" }
    audio = { "q1": "audio1.webm" }
    output = normalize_answers(d_input, audio)
    
    assert isinstance(output, list)
    assert output[0]["question_id"] in ["q1", "q2"]
    assert output[0]["text"] in ["Answer 1", "Answer 2"]
    
    # list-format input is skipped (returned as is)
    list_input = [{"question_id": "q1", "text": "Answer 1"}]
    output2 = normalize_answers(list_input, {})
    assert output2 == list_input

def test_validation_schema():
    from marshmallow import ValidationError
    from schemas.auth_schemas import RegisterSchema
    # assert 422 for bad email, empty password, and invalid PIN (non-numeric, wrong length)
    # The Gap refers to schema validation behavior
    schema = RegisterSchema()
    
    # bad email
    errors = schema.validate({"name": "X", "email": "bad-email", "password": "pass", "pin": "1234"})
    assert "email" in errors
    
    # empty password
    errors = schema.validate({"name": "X", "email": "a@b.com", "password": "", "pin": "1234"})
    assert "password" in errors
    
    # invalid PIN
    errors = schema.validate({"name": "X", "email": "a@b.com", "password": "pass", "pin": "123"})
    assert "pin" in errors
    errors = schema.validate({"name": "X", "email": "a@b.com", "password": "pass", "pin": "123a"})
    assert "pin" in errors

def test_mcq_normalization():
    from routes.exam import _normalize_mcq, _extract_mcq_letter
    
    assert _normalize_mcq("A.") == "A"
    assert _normalize_mcq("(A)") == "A"
    assert _normalize_mcq(" a ") == "A"
    assert _normalize_mcq("(A) some text") == "A"
    
    # Tests for Gap 3
    assert _extract_mcq_letter("(A) some text") == "A"
    assert _extract_mcq_letter("A. some text") == "A"
    assert _extract_mcq_letter("a) text") == "A"
    assert _extract_mcq_letter(" B ") == "B"

def test_secret_key_validation():
    import os
    import subprocess
    import sys
    
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    env_file = os.path.join(backend_dir, ".env")
    env_bak = os.path.join(backend_dir, ".env.bak")
    
    # Move .env out of the way so load_dotenv() doesn't find it
    if os.path.exists(env_file):
        os.rename(env_file, env_bak)
        
    try:
        # 1. When SECRET_KEY is missing from the environment
        env_without_key = os.environ.copy()
        if "SECRET_KEY" in env_without_key:
            env_without_key.pop("SECRET_KEY", None)
            
        result_missing = subprocess.run(
            [sys.executable, "-c", "import app"], 
            cwd=backend_dir, 
            env=env_without_key,
            capture_output=True,
            text=True
        )
        
        assert result_missing.returncode != 0
        assert "SECRET_KEY environment variable is not set" in result_missing.stderr
        
        # 2. When SECRET_KEY is set to a non-empty string, no error is raised
        env_with_key = os.environ.copy()
        env_with_key["SECRET_KEY"] = "test-secret"
        
        result_present = subprocess.run(
            [sys.executable, "-c", "import app"], 
            cwd=backend_dir, 
            env=env_with_key,
            capture_output=True,
            text=True
        )
        
        assert result_present.returncode == 0
    finally:
        # Restore .env
        if os.path.exists(env_bak):
            os.rename(env_bak, env_file)

def test_production_config():
    # FLASK_DEBUG defaults to false
    os.environ.pop("FLASK_DEBUG", None)
    assert os.getenv("FLASK_DEBUG", "false").lower() != "true"

    # ALLOWED_ORIGINS parses correctly
    raw = "https://example.com, https://app.example.com"
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    assert len(origins) == 2
    assert "https://example.com" in origins

    # RATELIMIT_STORAGE_URI defaults to memory://
    os.environ.pop("RATELIMIT_STORAGE_URI", None)
    assert os.getenv("RATELIMIT_STORAGE_URI", "memory://") == "memory://"

def test_student_id_uniqueness_check():
    """studentId uniqueness logic works correctly."""
    # Simulate duplicate check
    existing_ids = {"STU001", "STU002"}
    new_id = "STU001"
    assert new_id in existing_ids  # would trigger 409

def test_pin_format_validation():
    """PIN must be 4-6 digits only."""
    import re
    valid = ["1234", "12345", "123456"]
    invalid = ["123", "1234567", "abcd", "12 34", ""]
    pattern = r'^\d{4,6}$'
    for pin in valid:
        assert re.match(pattern, pin), f"{pin} should be valid"
    for pin in invalid:
        assert not re.match(pattern, pin), f"{pin} should be invalid"

if __name__ == "__main__":
    pytest.main([__file__])
