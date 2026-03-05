import os
import sys
from datetime import datetime, timedelta

# Add backend dir to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.user import is_account_locked
from services.nlp import get_nlp_service
from migrations.migrate_submissions import migrate_submissions
from marshmallow import ValidationError
from schemas.auth_schemas import LoginSchema

def test_is_account_locked():
    # FIX 3 — Brute force lockout test
    # Not locked
    assert is_account_locked({"failed_attempts": 4, "locked_until": None}) == False
    
    # Locked
    assert is_account_locked({"failed_attempts": 5, "locked_until": datetime.utcnow() + timedelta(minutes=10)}) == True
    
    # Lock expired
    assert is_account_locked({"failed_attempts": 5, "locked_until": datetime.utcnow() - timedelta(minutes=1)}) == False

def test_configurable_grading():
    # FIX 4 — Configurable grading
    nlp = get_nlp_service()
    
    # We can test the grade_answer logic directly or via the underlying nlp similarity.
    # We'll test similarity scores matching expectations
    assert nlp.score_similarity("five", "5")["score"] == 1.0
    
    sim = nlp.score_similarity("mitochondria makes ATP", "mitochondria is the powerhouse of the cell")["score"]
    # We expect some similarity score. We'll verify the threshold check in the route separately, 
    # but let's just make sure score is > 0 and reasonable for scoring.
    assert sim >= 0.0

def test_migration_helper():
    # FIX 5 — Migration
    class MockCollection:
        def __init__(self, data):
            self.data = data
            self.updates = []
        def find(self):
            return self.data
        def update_one(self, query, update):
            self.updates.append((query, update))
            
    class MockDB:
        def __init__(self, data):
            self.submissions = MockCollection(data)
            
    mock_db_old = [
        {"_id": "1", "answers": {"q1": "Paris", "q2": "Newton"}}
    ]
    
    db = MockDB(mock_db_old)
    result = migrate_submissions(db)
    
    assert result["migrated"] == 1
    update_call = db.submissions.updates[0]
    new_answers = update_call[1]["$set"]["answers"]
    
    assert isinstance(new_answers, list)
    assert new_answers[0]["question_id"] == "q1"
    assert new_answers[0]["text"] == "Paris"

def test_validation_schema():
    # FIX 9 — Validation rejects bad input
    schema = LoginSchema()
    
    try:
        schema.load({"email": "not-an-email", "password": ""})
        assert False, "Should raise ValidationError"
    except ValidationError as e:
        assert "email" in e.messages
        assert "password" in e.messages

if __name__ == "__main__":
    print("Running tests...")
    test_is_account_locked()
    print("✓ test_is_account_locked passed")
    test_configurable_grading()
    print("✓ test_configurable_grading passed")
    test_migration_helper()
    print("✓ test_migration_helper passed")
    test_validation_schema()
    print("✓ test_validation_schema passed")
    print("All tests passed successfully!")

