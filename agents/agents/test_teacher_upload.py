# test_teacher_upload.py
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from tools.text_preprocessing import split_text
from tools.VectorDB_operations import store_teacher_chunks

# 1. Mock Teacher Data
TEACHER_NOTES = """
BIOLOGY MIDTERM STUDY GUIDE — BIO 101
Photosynthesis is the fundamental biochemical process by which green plants convert light energy into chemical energy stored in glucose. 
PRIMARY INPUTS: Carbon dioxide (CO2), Water (H2O), Light energy.
PRIMARY OUTPUTS: Glucose (C6H12O6), Oxygen (O2).
TWO STAGES: 
1. Light-Dependent Reactions (Thylakoid Membrane)
2. Light-Independent Reactions / Calvin Cycle (Stroma)
"""

TEACHER_KEY = """
ANSWER KEY — Q1: Photosynthesis 
Primary INPUTS (CO2, H2O).
Primary OUTPUTS (Glucose, Oxygen).
Two stages (Light-dependent, Calvin Cycle).
Location and chlorophyll role.
Balanced overall equation.

"""

print("🚀 Step 1: Processing Teacher Notes...")
note_chunks = split_text(TEACHER_NOTES)
store_teacher_chunks(
    chunks=note_chunks, 
    question_no=1, 
    content_type="notes", 
    subject="biology", 
    exam_id="midterm_2024", 
    NAMESPACE="NIT_Raipur"
)

print("\n🚀 Step 2: Processing Answer Key...")
key_chunks = split_text(TEACHER_KEY)
store_teacher_chunks(
    chunks=key_chunks, 
    question_no=1, 
    content_type="answer_key", 
    subject="biology", 
    exam_id="midterm_2024", 
    NAMESPACE="NIT_Raipur"
)

print("\n Uploaded to pine cone successfully")