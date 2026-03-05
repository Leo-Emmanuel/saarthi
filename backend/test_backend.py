#!/usr/bin/env python3
"""
Quick test to check if backend is working
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.question_parser import parse_docx
from models.exam import Question, Exam

def test_backend():
    print("Testing backend components...")
    
    # Test Question model
    q = Question(text="Test question", q_type="mcq", options=["A) 1", "B) 2"])
    print(f"Question created: {q.to_dict()}")
    
    # Test Exam model
    exam = Exam(
        title="Test Exam",
        description="Test",
        created_by="507f1f77bcf86cd799439011",
        duration=60,
        questions=[q],
        examType="mcq-only"
    )
    print(f"Exam created: {exam.to_dict()}")
    
    print("✅ Backend components working!")

if __name__ == "__main__":
    test_backend()
