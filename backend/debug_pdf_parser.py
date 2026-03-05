"""
Debug script — test PDF parsing on the latest exam's uploaded file.

Usage:
    cd backend
    python debug_pdf_parser.py
"""

from pymongo import MongoClient
import os
import sys
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client.get_default_database()

# Get latest exam
latest_exam = db.exams.find_one(sort=[("_id", -1)])

if not latest_exam:
    print("No exams found!")
    sys.exit()

print(f"Latest Exam: {latest_exam.get('title')}")

# file_url is a relative URL path like "/static/question_papers/file.pdf"
file_url = latest_exam.get("file_url")
print(f"File URL: {file_url}")
print(f"Stored Questions: {len(latest_exam.get('questions', []))}")

if not file_url:
    print("No file URL found.")
    sys.exit()

if not file_url.lower().endswith(".pdf"):
    print(f"File is not a PDF: {file_url}")
    sys.exit()

# Convert the URL path to an absolute filesystem path
rel_path = file_url.lstrip("/")
file_path = os.path.join(os.getcwd(), rel_path)

# Validate the resolved path stays within the project directory
project_root = os.path.realpath(os.getcwd())
resolved_path = os.path.realpath(file_path)
if not resolved_path.startswith(project_root):
    print(f"Path traversal blocked: {file_url}")
    sys.exit()

print(f"Resolved path: {file_path}")

if not os.path.exists(file_path):
    print(f"File not found at {file_path}")
    sys.exit()

try:
    from services.pdf_parser import parse_pdf

    questions = parse_pdf(file_path)
    print(f"Extracted: {len(questions)}")
    for i, q in enumerate(questions):
        print(f"Q{i+1}: {q['text'][:50]}... (Correct: {q.get('correct_answer')})")
except Exception as e:
    print(f"Parser Error: {e}")
    import traceback
    traceback.print_exc()
