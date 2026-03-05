#!/usr/bin/env python3
"""
Script to update existing exam questions to properly detect MCQ questions.
This should be run once after updating the parser to fix MCQ detection.
Run this when the backend server is running.
"""

import requests
import os

def update_existing_exams():
    """Update existing exams to properly detect MCQ questions."""
    # This would need to be called from within the Flask app context
    # For now, let's create a simple API endpoint to trigger this
    print("To update existing MCQ questions, run the following curl command:")
    print("curl -X POST http://localhost:5000/api/admin/update-mcqs")
    print("\nOr add this route to your Flask app and call it from the admin panel.")

if __name__ == "__main__":
    update_existing_exams()
