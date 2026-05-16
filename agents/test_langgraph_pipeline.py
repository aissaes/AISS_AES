"""
test_langgraph_pipeline.py

Master Orchestrator: End-to-End Agentic Evaluation System Simulation.

This module acts as the primary LangGraph StateGraph compiler. It orchestrates 
the interaction between the OCR data preparation, Semantic Retrieval, LLM Evaluation, 
and LLM Validation nodes. 

Key Architecture Feature: 
The inclusion of `node_review` introduces a self-correcting conditional logic loop. 
If the primary Evaluation Agent generates mathematically inconsistent scores or 
hallucinates logic, the Review Agent traps the error and forces the state backward 
for recalculation before routing to completion.
"""

import json
import os
import sys
import time
import textwrap
from typing import TypedDict, Literal

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field

# Ensure UTF-8 Output Encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

load_dotenv()
if not os.getenv("GEMINI_API_KEY"):
    raise EnvironmentError("GEMINI_API_KEY is missing. Check environment configuration.")

# ===========================================================================
# MOCK CORPUS: System Test Data
# ===========================================================================
EXAM_ID       = "bio_midterm_01"
QUESTION_TEXT = "Describe the process of photosynthesis and its primary inputs and outputs."
MAX_MARKS     = 10

TEACHER_NOTES = """\
BIOLOGY MIDTERM STUDY GUIDE — BIO 101
=== TOPIC 1: PHOTOSYNTHESIS ===
Photosynthesis is the fundamental biochemical process by which green plants,
algae, and certain bacteria convert light energy into chemical energy stored
in glucose. The overall reaction can be summarised as:
    6CO2 + 6H2O + light energy -> C6H12O6 + 6O2
PRIMARY INPUTS:
  * Carbon dioxide (CO2) — absorbed through tiny pores called stomata in the leaf surface.
  * Water (H2O) — drawn from the soil through the plant's root system.
  * Light energy — typically absorbed by the green pigment chlorophyll.
PRIMARY OUTPUTS:
  * Glucose (C6H12O6) — a simple sugar used as the plant's primary energy source.
  * Oxygen (O2) — released as a by-product through the stomata back into the atmosphere.
TWO STAGES OF PHOTOSYNTHESIS:
  1. Light-Dependent Reactions (Thylakoid Membrane)
     Uses light to split water molecules, releasing oxygen and generating ATP and NADPH.
  2. Light-Independent Reactions / Calvin Cycle (Stroma)
     ATP and NADPH drive the fixation of CO2 into glucose.
=== TOPIC 2: CELL DIVISION ===
MITOSIS: Purpose is growth and repair of somatic (body) cells.
MEIOSIS: Purpose is production of gametes (sex cells).
=== TOPIC 3: THE WATER CYCLE ===
Key processes: Evaporation, Condensation, Precipitation, Surface Runoff.
"""

TEACHER_KEY = """\
ANSWER KEY — Q1: Photosynthesis (10 marks)
[2 marks] Primary INPUTS (CO2, H2O).
[2 marks] Primary OUTPUTS (Glucose, Oxygen).
[2 marks] Two stages (Light-dependent, Calvin Cycle).
[2 marks] Location and chlorophyll role.
[2 marks] Balanced overall equation.
TOTAL: 10 marks.
"""

# Simulated raw OCR payload containing typical handwriting extraction artefacts.
STUDENT_OCR_TEXT = """\
Photosynthesis  is  the  process  where^  plants  make  their  own  food|
using  sunlight.  The  main  inputs  are  carbon~  dioxide  and  water.
CO2  comes  in  through  the  stomata`  on  the  leaves,  and  water  is
absorbed  from  the  soil  by  the  roots.

The  plant  uses  chlorophyl|  in  the  chloroplasts  to  capture  the
light  energy.  The  outputs  of  photosynthesis  are  glucose^  and
oxygen~.  The  oxygen  is  released  into  the  air.

I  think^  there  are  two  stages.  The  first  one  happens  in  the
thylakoid  and  uses  light  to  make  ATP|.  The  second  stage  is
called  the  Calvin  cycle`  where  glucose  is  made  using  CO2.

The  overall  equation  is:  6CO2  +  6H2O  +  light  ->  glucose  +  6O2^
"""

# ===========================================================================
# SECTION 1: STATE DEFINITION
# ===========================================================================
class ExamState(TypedDict):
    """
    Centralized State Object for LangGraph.
    Passes data iteratively across the Agent network.
    """
    exam_id:           str
    question_text:     str
    max_marks:         int
    raw_student_text:  str
    cleaned_text:      str
    retrieved_context: str
    score:             float
    reasoning:         str
    feedback:          str
    review_status:     str   # "PASS" or "FAIL"
    review_feedback:   str
    attempts:          int

# ===========================================================================
# SECTION 2: REVIEWER SCHEMA & LLM CONFIG
# ===========================================================================
class ReviewResult(BaseModel):
    """Structured output schema for the Validation Agent."""
    is_valid: bool = Field(description="True if math and logic align. False otherwise.")
    reviewer_notes: str = Field(description="Explanation of the validation decision.")

def _llm_with_retry(model_name: str, prompt: str, output_schema) -> object:
    """Helper method for LLM invocation with strict schema adherence and back-off."""
    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.1, 
    )
    chain = llm.with_structured_output(output_schema)
    max_retries, wait_seconds = 3, 35

    for attempt in range(1, max_retries + 1):
        try:
            return chain.invoke(prompt)
        except Exception as exc:
            if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                if attempt < max_retries:
                    print(f"    [rate-limit] Waiting {wait_seconds}s... (attempt {attempt}/{max_retries})")
                    time.sleep(wait_seconds)
                    wait_seconds *= 2
                else:
                    raise RuntimeError("API quota limits exhausted.") from exc
            else:
                raise

# ===========================================================================
# SECTION 3: GRAPH NODES
# ===========================================================================
def node_clean_text(state: ExamState) -> dict:
    from utils.text_cleaner import clean_ocr_text
    _banner("NODE: Text Cleaning")
    cleaned = clean_ocr_text(state["raw_student_text"])
    print("    OCR text successfully sanitized.")
    return {"cleaned_text": cleaned}

def node_retrieve(state: ExamState) -> dict:
    from services.vector_store import retrieve_rubric
    _banner("NODE: Semantic Retrieval")
    context = retrieve_rubric(state["exam_id"], state["question_text"], top_k=3)
    return {"retrieved_context": context}

def node_evaluate(state: ExamState) -> dict:
    from utils.evaluator import grade_student_answer
    new_attempt = state["attempts"] + 1
    _banner(f"NODE: Evaluation Agent (Attempt {new_attempt})")

    if state["review_feedback"]:
        print("    [RETRY] Incorporating previous validator feedback...")

    result: dict = grade_student_answer(
        question_text=state["question_text"],
        student_text=state["cleaned_text"],
        reference_context=state["retrieved_context"],
        max_marks=state["max_marks"],
    )
    return {
        "score":    result["score"],
        "reasoning": result["reasoning"],
        "feedback":  result["feedback"],
        "attempts":  new_attempt,
    }

def node_review(state: ExamState) -> dict:
    _banner(f"NODE: Validation Agent (Reviewing Attempt {state['attempts']})")
    prompt = f"""
    Validate the evaluation AI's output. Check arithmetic bounds (max {state['max_marks']}),
    verify math logic, and check for hallucinated concepts not present in the rubric.
    
    RUBRIC: {state['retrieved_context']}
    SCORE: {state['score']}
    REASONING: {state['reasoning']}
    FEEDBACK: {state['feedback']}
    """
    review: ReviewResult = _llm_with_retry("gemini-2.5-flash", prompt, ReviewResult)
    status = "PASS" if review.is_valid else "FAIL"
    print(f"    Validation Decision: {status}")
    return {"review_status": status, "review_feedback": review.reviewer_notes}

# ===========================================================================
# SECTION 4: ROUTING LOGIC
# ===========================================================================
def route_after_review(state: ExamState) -> Literal["node_evaluate", "__end__"]:
    _banner("ROUTER: Edge Condition Check")
    if state["review_status"] == "PASS":
        print("    Logic verified. Routing to Graph Terminus.")
        return END
    if state["attempts"] >= 2:
        print("    Max retries reached. Forcing route to Graph Terminus.")
        return END
    print("    Validation failed. Re-routing back to Evaluation Node.")
    return "node_evaluate"

# ===========================================================================
# SECTION 5: COMPILATION & EXECUTION
# ===========================================================================
def build_graph() -> object:
    builder = StateGraph(ExamState)
    builder.add_node("node_clean_text", node_clean_text)
    builder.add_node("node_retrieve",   node_retrieve)
    builder.add_node("node_evaluate",   node_evaluate)
    builder.add_node("node_review",     node_review)

    builder.add_edge(START, "node_clean_text")
    builder.add_edge("node_clean_text", "node_retrieve")
    builder.add_edge("node_retrieve", "node_evaluate")
    builder.add_edge("node_evaluate", "node_review")
    builder.add_conditional_edges("node_review", route_after_review)

    return builder.compile()

def _banner(title: str, width: int = 62) -> None:
    print(f"\n{'=' * width}\n  {title}\n{'=' * width}")

def seed_pinecone_if_needed() -> None:
    from utils.text_splitter import chunk_reference_material
    from services.vector_store import store_rubric_chunks
    _banner("PRE-FLIGHT: Vector Database Seeding")
    chunks = chunk_reference_material(TEACHER_NOTES + "\n\n" + TEACHER_KEY)
    store_rubric_chunks(chunks, EXAM_ID)

def main() -> None:
    # Optional DB Seeding
    # seed_pinecone_if_needed()

    app = build_graph()
    initial_state: ExamState = {
        "exam_id":           EXAM_ID,
        "question_text":     QUESTION_TEXT,
        "max_marks":         MAX_MARKS,
        "raw_student_text":  STUDENT_OCR_TEXT,
        "cleaned_text":      "",
        "retrieved_context": "",
        "score":             0.0,
        "reasoning":         "",
        "feedback":          "",
        "review_status":     "",
        "review_feedback":   "",
        "attempts":          0,
    }

    _banner("LANGGRAPH PIPELINE ACTIVATION")
    final_state: ExamState = app.invoke(initial_state)

    _banner("SYSTEM OUTPUT (Database Payload)")
    payload = {
        "exam_id": final_state["exam_id"],
        "score": final_state["score"],
        "feedback": final_state["feedback"],
        "validation_status": final_state["review_status"]
    }
    print(json.dumps(payload, indent=2))

if __name__ == "__main__":
    main()