"""
teacher_upload_graph.py

# OCR AGENT --> This agent is responsible for extracting text from teacher uploads (images or PDFs). It intelligently decides whether to use direct text extraction (for digital PDFs) or OCR API (for scanned images and handwritten rubrics).
# PREPROCESSING AGENT --> This agent handles cleaning the extracted text to fix OCR hallucinations. Crucially, because this is teacher data, it ALSO splits the cleaned text into manageable, overlapping chunks suitable for semantic vector search.
# VECTOR DB AGENT --> This agent takes the cleaned, chunked teacher notes and pushes them into Pinecone. It attaches strict metadata (exam_id, question_no, type) to ensure no data leakage occurs between different exams.
"""

from typing import TypedDict, List
from langgraph.graph import StateGraph, END, START

import sys
import os
# Ensure Python can find the 'tools' folder
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import requests
from io import BytesIO
from tools.readers import OCR_image_to_text, load_pdf_text
from tools.text_preprocessing import text_cleaning, split_text
from tools.VectorDB_operations import store_teacher_chunks

from PyPDF2 import PdfReader

# ==========================================
# 1. Define the Shared State
# ==========================================
class TeacherUploadState(TypedDict):
    raw_input: str              # Path to image or PDF uploaded by teacher
    content_type: str           # "notes" or "answer_key"
    subject: str                # e.g., "biology"
    exam_id: str                # e.g., "midterm_2024_v2", can be None/empty
    namespace: str              # e.g., "NIT_Raipur"
    question_id: str            # e.g., "S1-Q1"
    material_id: str            # Unique MongoDB material ID
    course_id: str              # Course ID
    faculty_id: str             # Uploader faculty ID
    extracted_text: str         # Text from OCR/PDF Loader
    cleaned_text: str           # Preprocessed text
    chunks: List[str]           # Split text chunks ready for Pinecone
    upload_status: str          # Final success message


# ==========================================
# 2. Define the Nodes (The Agents)
# ==========================================
def ocr_agent(state: TeacherUploadState):
    print("--- TEACHER OCR AGENT ---")
    url = state["raw_input"]
    extracted_text = ""

    # Check headers for actual content type
    try:
        head_response = requests.head(url, allow_redirects=True)
        content_type = head_response.headers.get('Content-Type', '').lower()
    except Exception as e:
        print(f"Could not fetch headers: {e}")
        content_type = ""

    # 1. Handle PDFs (Robust checking matches agents.py)
    if 'pdf' in content_type or '.pdf' in url.lower():
        print("Input is a PDF. Checking for digital text...")
        response = requests.get(url)
        pdf_file = BytesIO(response.content)
        
        try:
            reader = PdfReader(pdf_file)
            digital_text = ""
            
            # Check the first few pages for actual digital text
            for i in range(min(len(reader.pages), 3)):
                page_text = reader.pages[i].extract_text()
                if page_text:
                    digital_text += page_text

            # Decision Logic: If mostly empty, it's a scanned PDF. Use OCR.
            if len(digital_text.strip()) < 50:
                print("PDF is scanned or empty. Switching to OCR...")
                extracted_text = OCR_image_to_text(url)
            else:
                print("Digital text found. Using PDF Loader...")
                extracted_text = load_pdf_text(url)
                
        except Exception as e:
            print(f"Error reading PDF: {e}. Falling back to OCR.")
            extracted_text = OCR_image_to_text(url)
    
    # 2. Handle Images Directly (or anything else we don't recognize)
    else:
        print("Input is an image or unknown. Calling OCR...")
        extracted_text = OCR_image_to_text(url)

    return {"extracted_text": extracted_text}


def preprocessing_agent(state: TeacherUploadState):
    print("--- TEACHER PREPROCESSING AGENT ---")

    extracted_text = state.get("extracted_text", "")

    # 1. Clean the OCR/PDF text
    cleaned_text = text_cleaning(extracted_text)

    # 2. Chunk the text (CRITICAL for Teacher Uploads)
    chunks = split_text(cleaned_text)

    print(f"Cleaned text length: {len(cleaned_text)}")
    print(f"Generated {len(chunks)} semantic chunks for Vector DB.")

    return {
        "cleaned_text": cleaned_text,
        "chunks": chunks
    }


def vector_db_agent(state: TeacherUploadState):
    print("--- TEACHER VECTOR DB AGENT ---")

    chunks = state.get("chunks", [])
    
    if not chunks:
        print("⚠️ No chunks generated. Skipping Pinecone upload.")
        return {"upload_status": "Failed: No text to upload."}

    # Push chunks to Pinecone using the tool
    store_teacher_chunks(
        chunks=chunks,
        question_id=state.get("question_id"),
        content_type=state.get("content_type"),
        subject=state.get("subject"),
        exam_id=state.get("exam_id"),
        NAMESPACE=state.get("namespace"),
        material_id=state.get("material_id"),
        course_id=state.get("course_id"),
        faculty_id=state.get("faculty_id")
    )

    return {"upload_status": f"Success: Stored {len(chunks)} chunks in Pinecone."}


# ==========================================
# 3. Build & Compile the Graph
# ==========================================
workflow = StateGraph(TeacherUploadState)

# Add Nodes
workflow.add_node("ocr", ocr_agent)
workflow.add_node("preprocess", preprocessing_agent)
workflow.add_node("store_in_db", vector_db_agent)

# Linear flow (ETL Pipeline)
workflow.add_edge(START, "ocr")
workflow.add_edge("ocr", "preprocess")
workflow.add_edge("preprocess", "store_in_db")
workflow.add_edge("store_in_db", END)

# Compile
upload_app = workflow.compile()


# ==========================================
# EXECUTE THE GRAPH (TESTING)
# ==========================================
if __name__ == "__main__":
    print("\n🚀 Starting the Teacher Upload Pipeline...")
    
    # Example: Uploading a handwritten answer key image
    initial_state = {
        "raw_input": "https://ik.imagekit.io/k3p6avtbf/teacher_materials/Unit_No_6_O.S_Notes_G4pmvRKzR.pdf", 
        "content_type": "answer_key",  
        "subject": "OS",
        "exam_id": "midterm_2026",  
        "namespace": "NIT_Raipur",
        "question_id": "1",
    }
    
    # Run the graph
    final_state = upload_app.invoke(initial_state)
    
    print(" PIPELINE COMPLETE")
    print(final_state.get("upload_status"))