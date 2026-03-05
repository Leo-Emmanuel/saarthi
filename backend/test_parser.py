#!/usr/bin/env python3
"""
Simple test to verify the MCQ parser is working correctly.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.question_parser import parse_docx

def test_mcq_parsing():
    """Test the MCQ parsing with sample data."""
    
    # Create a simple test to verify the parser logic
    print("Testing MCQ parser...")
    
    # Test the _flush_question function directly
    from services.question_parser import _flush_question
    
    # Test MCQ question with options
    mcq_question = _flush_question("What is 2+2?", options=["A) 3", "B) 4", "C) 5", "D) 6"])
    print(f"MCQ Question: {mcq_question}")
    
    # Test written question without options
    written_question = _flush_question("Explain the process of photosynthesis.")
    print(f"Written Question: {written_question}")
    
    # Verify the types are correct
    assert mcq_question["type"] == "mcq", "MCQ question should have type='mcq'"
    assert mcq_question["options"] == ["A) 3", "B) 4", "C) 5", "D) 6"], "MCQ question should have options"
    assert written_question["type"] == "text", "Written question should have type='text'"
    assert written_question["options"] == [], "Written question should have empty options array"
    
    print("✅ Parser tests passed!")

if __name__ == "__main__":
    test_mcq_parsing()
