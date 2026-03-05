#!/usr/bin/env python3
"""
Test exam creation in isolation
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.question_parser import parse_docx
from models.exam import Question, Exam
from routes.exam import _detect_exam_type, _parse_questions_from_file

def test_exam_creation():
    print("Testing exam creation flow...")
    
    # Test 1: Create some sample questions
    questions = [
        Question(text="What is 2+2?", q_type="mcq", options=["A) 3", "B) 4", "C) 5", "D) 6"]),
        Question(text="Explain photosynthesis", q_type="text")
    ]
    
    print(f"Created {len(questions)} questions")
    
    # Test 2: Detect exam type
    exam_type = _detect_exam_type(questions)
    print(f"Detected exam type: {exam_type}")
    
    # Test 3: Create exam
    exam = Exam(
        title="Test Exam",
        description="Test Description",
        created_by="507f1f77bcf86cd799439011",
        duration=60,
        questions=questions,
        examType=exam_type
    )
    
    print(f"Exam created: {exam.to_dict()['title']}")
    print(f"Exam type in dict: {exam.to_dict()['examType']}")
    
    # Test 4: Try parsing from a file (if any exists)
    print("\nTesting file parsing...")
    try:
        # Look for any docx files in uploads
        import glob
        docx_files = glob.glob("uploads/*.docx")
        if docx_files:
            print(f"Found docx file: {docx_files[0]}")
            questions_from_file = _parse_questions_from_file(docx_files[0])
            print(f"Parsed {len(questions_from_file)} questions from file")
            for q in questions_from_file:
                print(f"  - {q.text} (type: {q.type})")
        else:
            print("No docx files found in uploads/")
    except Exception as e:
        print(f"File parsing error: {e}")
    
    print("✅ Exam creation test completed!")

if __name__ == "__main__":
    test_exam_creation()
