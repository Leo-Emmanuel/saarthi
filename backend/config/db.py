from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client.get_default_database()
_users = db.users

def create_indexes():
    try:
        _users.create_index("studentId", unique=True, sparse=True)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Could not create studentId index: {e}")
