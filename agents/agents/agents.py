#OCR AGENT --> This agent will be responsible for extracting text from images (handwritten notes, student answers) and PDFs (teacher notes, answer keys). It will use OCR for images and a PDF loader for typed text in PDFs. The extracted text will then be cleaned and split into chunks for storage in the vector database.
#PREPROCESSING AGENT --> This agent will handle cleaning the extracted text to fix OCR errors, remove junk characters, and ensure the text is in a good format for storage and retrieval. It will also split the cleaned text into manageable chunks.
#VECTOR DB AGENT --> This agent will manage interactions with the vector database. It will store the cleaned and chunked teacher notes and answer keys, and retrieve relevant notes based on the question being graded. It will ensure that only relevant information is fetched to prevent data leakage.
#EVALUATION AGENT --> This agent will take the retrieved notes, the teacher's answer key, and the student's answer to perform the grading. It will use a language model to compare the student's answer against the key and provide feedback on correctness, completeness, and areas for improvement.
#RECHECK AGENT --> This agent will be responsible for checking the output given by the Evaluation Agent for any inconsistencies or errors. If it detects any issues, it will flag them and request a re-evaluation from the Evaluation Agent, ensuring that the final feedback provided to students is accurate and reliable.


from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END,START

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import traceback

import requests
from io import BytesIO
from tools.readers import OCR_image_to_text, load_pdf_text
from tools.text_preprocessing import text_cleaning, split_text
from tools.VectorDB_operations import retrieve_relevant_chunks,store_teacher_chunks
from tools.get_models import get_hf_model,get_groq
from tools.prompt import eval_prompt,recheck_prompt

from PyPDF2 import PdfReader


# 1. Define the Shared State
class AgentState(TypedDict):
    raw_input: str              # Path to image or PDF
    question: str               # question text
    exam_id: str                
    namespace: str              # college
    question_id: str  
    max_marks: float          
    extracted_text: str         # Text from OCR
    cleaned_text: str           # Preprocessed text
    context_notes: List[str]    # Retrieved from Pinecone
    student_answer: str
    teacher_key: str
    evaluation: str             # The grade and feedback
    recheck_status: str         # "Approved" or "Needs Revision"
    recheck_feedback: str       # Guidance for the evaluator
    revision_count: int         # Safety to prevent infinite loops

# 2. Define the Nodes (The Agents)
def ocr_agent(state: AgentState):
    print("--- OCR AGENT ---")
    url = state["raw_input"]
    extracted_text = ""

    # 1. Ask the server for the REAL file type (without downloading the whole file yet)
    try:
        head_response = requests.head(url, allow_redirects=True)
        content_type = head_response.headers.get('Content-Type', '').lower()
    except Exception as e:
        print(f"Could not fetch headers: {e}")
        content_type = "" # Fallback if the server blocks HEAD requests

    # 2. Handle PDFs (Check the header, or the URL just to be safe)
    if 'pdf' in content_type or '.pdf' in url.lower():
        print("Input is a PDF. Checking for digital text...")
        
        # Download PDF into memory
        response = requests.get(url)
        pdf_bytes = response.content
        pdf_file = BytesIO(pdf_bytes)
        
        try:
            reader = PdfReader(pdf_file)
            digital_text = ""
            
            # Check the first few pages for actual text
            for i in range(min(len(reader.pages), 3)):
                page_text = reader.pages[i].extract_text()
                if page_text:
                    digital_text += page_text

            # Decision Logic
            if len(digital_text.strip()) < 50:
                print("PDF is scanned or empty. Switching to OCR...")
                # Use your existing OCR function that handles URLs
                extracted_text = OCR_image_to_text(url)
            else:
                print("Digital text found. Using PDF Loader...")
                extracted_text = load_pdf_text(url)
                
        except Exception as e:
            print(f"Error reading PDF: {e}. Falling back to OCR.")
            extracted_text = OCR_image_to_text(url)

    # 3. Handle Images (or anything else we don't recognize)
    else:
        print("Input is an image. Calling OCR...")
        extracted_text = OCR_image_to_text(url)

    # print("extracted_text: \n",extracted_text)
    return {"extracted_text": extracted_text}



def preprocessing_agent(state: AgentState):
    print("--- PREPROCESSING AGENT ---")

    extracted_text = state.get("extracted_text", "")
 #  student_answer = state.get("student_answer", "")

    # clean extracted OCR/PDF text
    cleaned_text = text_cleaning(extracted_text)

    # clean student answer too if available
  # cleaned_student_answer = text_cleaning(student_answer)

    # chunk teacher/reference text
    chunks = split_text(cleaned_text)

    print(f"Cleaned text length: {len(cleaned_text)}")
    print(f"Generated chunks: {len(chunks)}")

    # print("cleaned_text: \n", cleaned_text)
    return {
        "cleaned_text": cleaned_text,
        "student_answer": cleaned_text,
        "chunks": chunks
    }

def vector_db_agent(state: AgentState):
    print("--- VECTOR DB AGENT ---")

    question = state.get("question", "")
    exam_id = state.get("exam_id", "")
    namespace = state.get("namespace", "")
    question_id = state.get("question_id", "")

    # Retrieve notes
    notes = retrieve_relevant_chunks(
        question_text=question,
        namespace=namespace,
        exam_id=exam_id,
        question_id=question_id,
        content_type="notes",
        top_k=3
    )

    # Retrieve teacher answer key
    answer_key = retrieve_relevant_chunks(
        question_text=question,
        namespace=namespace,
        exam_id=exam_id,
        question_id=question_id,
        content_type="answer_key",
        top_k=1
    )

    teacher_key = answer_key[0] if answer_key else ""

    # print(f"Retrieved {len(notes)} notes")
    # print(f"Retrieved teacher key: {'YES' if teacher_key else 'NO'}")
    # print("answer_key chunks: \n ",answer_key)

    return {
        "context_notes": notes,
        "teacher_key": teacher_key
    }


#This is for evaluation agent which evaluates the student answer based on retrieved notes and teacher key. It also provides feedback on what was correct, what was missing, and how to improve. The recheck agent will then verify if the evaluation is consistent with the notes and key, and if not, it will request a revision from the evaluation agent.
def evaluation_agent(state: AgentState):
    print("--- EVALUATION AGENT ---")

    question = state.get("question", "")
    student_answer = state.get("student_answer", "")
    context_notes = state.get("context_notes", [])
    teacher_key = state.get("teacher_key", "")
    recheck_feedback = state.get("recheck_feedback", "")
    max_marks = state.get("max_marks", 10)

    context_str = "\n".join(context_notes)

    llm = get_hf_model()
    chain = eval_prompt | llm

    prompt_inputs = {
        "question": question,
        "answer_key": teacher_key,
        "context_notes": context_str,
        "student_answer": student_answer,
        "recheck_feedback": recheck_feedback,
        "max_marks": max_marks
    }

    response = chain.invoke(prompt_inputs)
    # print("response content: \n ",response.content)
    return {
        "evaluation": response.content,
        "revision_count": state.get("revision_count", 0) + 1
    }



def recheck_agent(state: AgentState):
    print("--- RECHECK AGENT ---")
    try:
        llm = get_hf_model()   # different model

        chain = recheck_prompt | llm

        response = chain.invoke({
            "question": state["question"],
            "teacher_key": state["teacher_key"],
            "context_notes": "\n".join(state["context_notes"]),
            "student_answer": state["student_answer"],
            "evaluation": state["evaluation"],
            "max_marks": state.get("max_marks")
        })

        result = response.content

        print(result)

        if "STATUS: APPROVED" in result:
            return {
                "recheck_status": "Approved",
                "recheck_feedback": ""
            }
        
    except Exception as e:
            print("\n" + "="*50)
            print("⚠️ RECHECK AGENT CRASHED ⚠️")
            print("="*50)
            traceback.print_exc() # Prints the raw API error from OpenAI
            print("="*50 + "\n")

    return {
        "recheck_status": "Revision Needed",
        "recheck_feedback": result
    }

# 3. Define the Routing Logic
def should_continue(state: AgentState):
    print("--- ROUTING DECISION ---")

    revision_count = state.get("revision_count", 0)
    recheck_status = state.get("recheck_status", "Approved")

    if recheck_status == "Revision Needed" and revision_count < 3:
        print(f"Revision required. Retry count: {revision_count}")
        return "evaluate"

    print("Evaluation approved or retry limit reached.")
    return "end"


# ============================
# BUILD GRAPH
# ============================
workflow = StateGraph(AgentState)

# Nodes
workflow.add_node("ocr", ocr_agent)
workflow.add_node("preprocess", preprocessing_agent)
workflow.add_node("retrieve", vector_db_agent)
workflow.add_node("evaluate", evaluation_agent)
workflow.add_node("recheck", recheck_agent)


# Linear flow
workflow.add_edge(START, "ocr")
workflow.add_edge("ocr", "preprocess")
workflow.add_edge("preprocess", "retrieve")
workflow.add_edge("retrieve", "evaluate")
workflow.add_edge("evaluate", "recheck")

# Conditional loop
workflow.add_conditional_edges(
    "recheck",
    should_continue,
    {
        "evaluate": "evaluate",
        "end": END
    }
)

# Compile
app = workflow.compile()


# EXECUTE THE GRAPH (TESTING)

if __name__ == "__main__":
    print("\n🚀 Starting the AI Evaluation Pipeline...")
    
    # This is the exact test data
    initial_state = {
        "raw_input": "https://ik.imagekit.io/k3p6avtbf/answer_scripts/Screenshot_2026-05-18_172458_rKz4KXVqR.png",
        "question": "What is a Deadlock?",
        "exam_id": "midterm_2026",
        "namespace": "NIT_Raipur",
        "question_id": "1",
    }
    
    # Running the graph
    final_state = app.invoke(initial_state)
    
    # Print the final result/state 
    print(final_state.get("evaluation"))
