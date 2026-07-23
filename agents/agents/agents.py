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
from tools.get_models import get_gemini,get_hf_model,get_groq,get_gemini_embedding_model
from tools.prompt import eval_prompt,recheck_prompt

from PyPDF2 import PdfReader


import json
import re

def parse_llm_json(content: str):
    try:
        return json.loads(content)
    except Exception:
        pass
    cleaned = content.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except Exception:
        pass
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None

# 1. Define the Shared State
class AgentState(TypedDict):
    raw_input: str              # Path to image or PDF
    question: str               # question text
    exam_id: str                
    course_id: Optional[str]    # Course ID for course-wide retrieval
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
    recheck_logs: List[dict]    # Traceable audit logs for appeals

# 2. Define the Nodes (The Agents)
def ocr_agent(state: AgentState):
    print("--- OCR AGENT ---")
    url = state["raw_input"]
    extracted_text = ""

    # 1. Ask the server for the REAL file type with timeout
    try:
        head_response = requests.head(url, allow_redirects=True, timeout=10)
        content_type = head_response.headers.get('Content-Type', '').lower()
    except Exception as e:
        print(f"Could not fetch headers: {e}")
        content_type = ""

    # 2. Handle PDFs (Check the header, or the URL just to be safe)
    if 'pdf' in content_type or '.pdf' in url.lower():
        print("Input is a PDF. Checking for digital text...")
        
        try:
            # Download PDF into memory with timeout
            response = requests.get(url, timeout=30)
            pdf_bytes = response.content
            pdf_file = BytesIO(pdf_bytes)
            
            reader = PdfReader(pdf_file)
            digital_text = ""
            
            # Check ALL pages for digital text
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    digital_text += page_text

            # Decision Logic: Check average characters per page
            avg_chars = len(digital_text.strip()) / len(reader.pages) if len(reader.pages) > 0 else 0
            if avg_chars < 100:
                print(f"PDF average characters per page ({avg_chars:.1f}) is low. Switching to OCR...")
                extracted_text = OCR_image_to_text(url)
            else:
                print(f"Digital text found (avg {avg_chars:.1f} chars/page). Using PDF Loader...")
                extracted_text = load_pdf_text(url)
                
        except Exception as e:
            print(f"Error reading PDF: {e}. Falling back to OCR.")
            try:
                extracted_text = OCR_image_to_text(url)
            except Exception as ocr_err:
                print(f"OCR fallback failed: {ocr_err}")
                extracted_text = ""

    # 3. Handle Images (or anything else we don't recognize)
    else:
        print("Input is an image. Calling OCR...")
        try:
            extracted_text = OCR_image_to_text(url)
        except Exception as ocr_err:
            print(f"OCR failed: {ocr_err}")
            extracted_text = ""

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
    course_id = state.get("course_id", "")
    namespace = state.get("namespace", "")
    question_id = state.get("question_id", "")

    # 1. Retrieve Answer Key (Priority: Question-Specific -> Exam-Wide -> Legacy)
    answer_key_chunks = []
    if question_id:
        answer_key_chunks = retrieve_relevant_chunks(
            question_text=question,
            namespace=namespace,
            course_id=course_id,
            exam_id=exam_id,
            question_id=question_id,
            content_type="answer_key",
            top_k=1
        )
    
    if not answer_key_chunks:
        # Fallback to entire exam / course wide answer key
        answer_key_chunks = retrieve_relevant_chunks(
            question_text=question,
            namespace=namespace,
            course_id=course_id,
            exam_id=exam_id,
            question_id="entire_exam",
            content_type="answer_key",
            top_k=1
        )
        
    if not answer_key_chunks:
        # Fallback to no question_id filter just in case of migrated/older keys
        answer_key_chunks = retrieve_relevant_chunks(
            question_text=question,
            namespace=namespace,
            course_id=course_id,
            exam_id=exam_id,
            question_id=None,
            content_type="answer_key",
            top_k=1
        )

    teacher_key = answer_key_chunks[0] if answer_key_chunks else ""

    # 2. Retrieve Rubrics (Priority: Question-Specific -> Exam-Wide -> Legacy)
    rubric_chunks = []
    if question_id:
        rubric_chunks = retrieve_relevant_chunks(
            question_text=question,
            namespace=namespace,
            course_id=course_id,
            exam_id=exam_id,
            question_id=question_id,
            content_type="rubric",
            top_k=2
        )
    
    if not rubric_chunks:
        rubric_chunks = retrieve_relevant_chunks(
            question_text=question,
            namespace=namespace,
            course_id=course_id,
            exam_id=exam_id,
            question_id="entire_exam",
            content_type="rubric",
            top_k=2
        )

    if not rubric_chunks:
        rubric_chunks = retrieve_relevant_chunks(
            question_text=question,
            namespace=namespace,
            course_id=course_id,
            exam_id=exam_id,
            question_id=None,
            content_type="rubric",
            top_k=2
        )

    # 3. Retrieve Notes (type="notes", course-level retrieval)
    notes_chunks = retrieve_relevant_chunks(
        question_text=question,
        namespace=namespace,
        course_id=course_id,
        exam_id=None,
        question_id=None,
        content_type="notes",
        top_k=3
    )

    # 4. Retrieve Syllabus (type="syllabus", course-level retrieval)
    syllabus_chunks = retrieve_relevant_chunks(
        question_text=question,
        namespace=namespace,
        course_id=course_id,
        exam_id=None,
        question_id=None,
        content_type="syllabus",
        top_k=1
    )

    # Format context_notes based on the priority order
    context_notes = []
    
    if rubric_chunks:
        context_notes.append("### Rubrics and Marking Guidelines:\n" + "\n".join(rubric_chunks))
    if notes_chunks:
        context_notes.append("### Lecture Notes and Reference Material:\n" + "\n".join(notes_chunks))
    if syllabus_chunks:
        context_notes.append("### Syllabus and Course Outline:\n" + "\n".join(syllabus_chunks))

    return {
        "context_notes": context_notes,
        "teacher_key": teacher_key
    }


def sanitize_prompt_input(text: str) -> str:
    if not isinstance(text, str):
        return str(text) if text is not None else ""
    return (text.replace("<student_answer>", "").replace("</student_answer>", "")
            .replace("<teacher_answer_key>", "").replace("</teacher_answer_key>", "")
            .replace("<context_notes>", "").replace("</context_notes>", "")
            .replace("<teacher_key>", "").replace("</teacher_key>", "")
            .replace("<evaluation>", "").replace("</evaluation>", ""))

#This is for evaluation agent which evaluates the student answer based on retrieved notes and teacher key. It also provides feedback on what was correct, what was missing, and how to improve. The recheck agent will then verify if the evaluation is consistent with the notes and key, and if not, it will request a revision from the evaluation agent.
def evaluation_agent(state: AgentState):
    print("--- EVALUATION AGENT ---")

    question = state.get("question", "")
    student_answer = state.get("student_answer", "")
    context_notes = state.get("context_notes", [])
    teacher_key = state.get("teacher_key", "")
    recheck_feedback = state.get("recheck_feedback", "")
    max_marks = state.get("max_marks", 10)

    # Check for empty OCR result
    if not student_answer or not student_answer.strip():
        print("⚠️ Student answer is empty after OCR. Returning OCR_FAILED response.")
        return {
            "evaluation": "OCR_FAILED: No text detected in student answer script.",
            "revision_count": state.get("revision_count", 0) + 1
        }

    context_str = "\n".join(context_notes)

    llm = get_groq()
    chain = eval_prompt | llm

    prompt_inputs = {
        "question": question,
        "answer_key": sanitize_prompt_input(teacher_key),
        "context_notes": sanitize_prompt_input(context_str),
        "student_answer": sanitize_prompt_input(student_answer),
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
    
    evaluation = state.get("evaluation", "")
    recheck_logs = state.get("recheck_logs") or []
    if not isinstance(recheck_logs, list):
        recheck_logs = []
        
    revision_count = state.get("revision_count", 0)
    
    if evaluation and evaluation.startswith("OCR_FAILED:"):
        recheck_logs.append({
            "revisionNumber": revision_count,
            "recheckStatus": "Approved",
            "feedback": "OCR failed. Approved for manual review."
        })
        return {
            "recheck_status": "Approved",
            "recheck_feedback": "",
            "recheck_logs": recheck_logs
        }

    try:
        # Check if evaluation is valid JSON
        parsed = parse_llm_json(evaluation)
        if parsed is None or "score" not in parsed:
            feedback = "The previous evaluation output was not in valid JSON format or was missing the 'score' field. Please generate a valid JSON object."
            recheck_logs.append({
                "revisionNumber": revision_count,
                "recheckStatus": "Revision Needed",
                "feedback": feedback
            })
            return {
                "recheck_status": "Revision Needed",
                "recheck_feedback": feedback,
                "recheck_logs": recheck_logs
            }

        score = parsed.get("score")
        max_marks = state.get("max_marks", 10.0)
        try:
            score_val = float(score)
            if score_val < 0 or score_val > max_marks:
                feedback = f"The evaluated score ({score_val}) is out of bounds [0, {max_marks}]. Adjust the score to be within this range."
                recheck_logs.append({
                    "revisionNumber": revision_count,
                    "recheckStatus": "Revision Needed",
                    "feedback": feedback
                })
                return {
                    "recheck_status": "Revision Needed",
                    "recheck_feedback": feedback,
                    "recheck_logs": recheck_logs
                }
        except ValueError:
            feedback = "The evaluated score is not a valid number. Please provide a numeric score."
            recheck_logs.append({
                "revisionNumber": revision_count,
                "recheckStatus": "Revision Needed",
                "feedback": feedback
            })
            return {
                "recheck_status": "Revision Needed",
                "recheck_feedback": feedback,
                "recheck_logs": recheck_logs
            }

        llm = get_groq()
        chain = recheck_prompt | llm

        response = chain.invoke({
            "question": state["question"],
            "teacher_key": sanitize_prompt_input(state["teacher_key"]),
            "context_notes": sanitize_prompt_input("\n".join(state["context_notes"])),
            "student_answer": sanitize_prompt_input(state["student_answer"]),
            "evaluation": sanitize_prompt_input(state["evaluation"]),
            "max_marks": state.get("max_marks")
        })

        result = response.content
        print(result)

        if "STATUS: APPROVED" in result:
            recheck_logs.append({
                "revisionNumber": revision_count,
                "recheckStatus": "Approved",
                "feedback": "Evaluation approved by recheck auditor."
            })
            return {
                "recheck_status": "Approved",
                "recheck_feedback": "",
                "recheck_logs": recheck_logs
            }
        
        recheck_logs.append({
            "revisionNumber": revision_count,
            "recheckStatus": "Revision Needed",
            "feedback": result
        })
        return {
            "recheck_status": "Revision Needed",
            "recheck_feedback": result,
            "recheck_logs": recheck_logs
        }
        
    except Exception as e:
        print("\n" + "="*50)
        print("⚠️ RECHECK AGENT CRASHED ⚠️")
        print("="*50)
        traceback.print_exc()
        print("="*50 + "\n")
        feedback = f"Warning: Recheck agent crashed, marked as Uncertain. Error: {str(e)}"
        recheck_logs.append({
            "revisionNumber": revision_count,
            "recheckStatus": "Uncertain",
            "feedback": feedback
        })
        return {
            "recheck_status": "Uncertain",
            "recheck_feedback": feedback,
            "recheck_logs": recheck_logs
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
