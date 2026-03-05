#!/usr/bin/env python3
"""
Quick script to fix MCQ questions in existing exams.
Run this when MongoDB is running.
"""

import os
import sys
from pymongo import MongoClient

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "saarthi")

def fix_mcq_exam():
    """Fix MCQ questions that are incorrectly marked as text type."""
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Get all exams
    exams = list(db.exams.find({}))
    updated_count = 0
    
    for exam in exams:
        exam_id = exam["_id"]
        questions = exam.get("questions", [])
        exam_updated = False
        
        for i, question in enumerate(questions):
            # Check if this question has options but is marked as "text"
            if question.get("type") == "text" and question.get("options") and len(question.get("options", [])) > 0:
                print(f"Fixing question {i+1} in exam {exam_id}")
                print(f"  Old type: {question.get('type')}")
                print(f"  Options: {question.get('options')}")
                
                # Update to MCQ type
                questions[i]["type"] = "mcq"
                updated_count += 1
                exam_updated = True
        
        # Update the exam if any questions were changed
        if exam_updated:
            db.exams.update_one(
                {"_id": exam_id},
                {"$set": {"questions": questions}}
            )
            print(f"Updated exam {exam_id}")
    
    # Also update exam type if needed
    for exam in db.exams.find({}):
        questions = exam.get("questions", [])
        mcq_count = sum(1 for q in questions if q.get("type") == "mcq")
        written_count = sum(1 for q in questions if q.get("type") in ["text", "voice"])
        
        new_exam_type = None
        if mcq_count > 0 and written_count == 0:
            new_exam_type = "mcq-only"
        elif written_count > 0 and mcq_count == 0:
            new_exam_type = "writing-only"
        elif mcq_count > 0 and written_count > 0:
            new_exam_type = "mixed"
        
        if new_exam_type and exam.get("examType") != new_exam_type:
            db.exams.update_one(
                {"_id": exam["_id"]},
                {"$set": {"examType": new_exam_type}}
            )
            print(f"Updated exam type to {new_exam_type}")
    
    client.close()
    print(f"Total questions updated: {updated_count}")

if __name__ == "__main__":
    fix_mcq_exam()
