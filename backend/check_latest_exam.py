from pymongo import MongoClient
import os
from dotenv import load_dotenv
import sys

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client.get_default_database()

# Get latest exam
latest_exam = db.exams.find_one(sort=[("_id", -1)])

if not latest_exam:
    print("No exams found!")
else:
    print(f"Latest Exam: {latest_exam.get('title')}")
    print(f"ID: {latest_exam.get('_id')}")
    print(f"File URL: {latest_exam.get('file_url')}")
    questions = latest_exam.get('questions', [])
    print(f"Questions Count: {len(questions)}")
    if len(questions) > 0:
        print("Sample Questions:")
        for q in questions[:3]:
            print(f" - {q.get('text')}")
    else:
        print("questions array is EMPTY.")
