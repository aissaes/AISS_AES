"""
test_langgraph_pipeline.py

LangGraph-powered Agentic Evaluation Pipeline for the AISS AES system.

Run from the agents/ directory:
    python test_langgraph_pipeline.py

This script replaces the linear test_e2e_pipeline.py with a compiled
LangGraph StateGraph that adds a self-correcting Reviewer node. If the
Evaluator produces an inconsistent score or hallucinated reasoning, the
Reviewer flags it as FAIL and routes the state BACK to the Evaluator for
a second attempt — up to a maximum of 2 attempts total.

Graph topology:
    START
      |
      v
  [clean_text]          <- OCR Agent: removes artefacts
      |
      v
  [retrieve]            <- Retrieval Agent: Pinecone semantic search
      |
      v
  [evaluate] <---+      <- Evaluation Agent: Gemini grades the answer
      |           |
      v           | FAIL (and attempts < 2)
  [review]  ------+     <- Reviewer Agent: validates score consistency
      |
      | PASS (or attempts >= 2)
      v
     END

Prerequisites:
  - pip install -r requirements.txt langgraph
  - .env in agents/ with: PINECONE_API_KEY, PINECONE_INDEX_NAME, GEMINI_API_KEY
"""

import json
import os
import sys
import time
import textwrap

# ---------------------------------------------------------------------------
# Force UTF-8 on Windows consoles (avoids cp1252 UnicodeEncodeError)
# ---------------------------------------------------------------------------
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Third-party imports
# ---------------------------------------------------------------------------
from typing import TypedDict, Literal

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Load .env (GEMINI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME)
# ---------------------------------------------------------------------------
load_dotenv()

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    raise EnvironmentError(
        "GEMINI_API_KEY is missing. Add it to agents/.env before running."
    )

# ===========================================================================
# MOCK DATA — Biology Midterm Exam
# (Ported directly from test_e2e_pipeline.py — identical corpus)
# ===========================================================================

EXAM_ID       = "bio_midterm_01"
QUESTION_TEXT = (
    "Describe the process of photosynthesis and its primary inputs and outputs."
)
MAX_MARKS = 10

# Multi-topic study guide — forces the vector store to do real semantic sorting
TEACHER_NOTES = """\
BIOLOGY MIDTERM STUDY GUIDE — BIO 101

=== TOPIC 1: PHOTOSYNTHESIS ===

Photosynthesis is the fundamental biochemical process by which green plants,
algae, and certain bacteria convert light energy into chemical energy stored
in glucose. The overall reaction can be summarised as:

    6CO2 + 6H2O + light energy -> C6H12O6 + 6O2

PRIMARY INPUTS:
  * Carbon dioxide (CO2) — absorbed through tiny pores called stomata in the
    leaf surface.
  * Water (H2O)          — drawn from the soil through the plant's root system
    and transported via the xylem vascular tissue.
  * Light energy         — typically absorbed by the green pigment chlorophyll
    located inside chloroplasts, primarily in the palisade mesophyll layer.

PRIMARY OUTPUTS:
  * Glucose (C6H12O6) — a simple sugar used as the plant's primary energy
    source for growth, reproduction, and cellular respiration.
  * Oxygen (O2)       — released as a by-product through the stomata back
    into the atmosphere. This is the primary source of atmospheric oxygen.

TWO STAGES OF PHOTOSYNTHESIS:
  1. Light-Dependent Reactions (Thylakoid Membrane)
     In this stage, light energy is absorbed by chlorophyll and used to split
     water molecules (photolysis), releasing oxygen and generating ATP and
     NADPH — the energy carriers for the next stage.
  2. Light-Independent Reactions / Calvin Cycle (Stroma)
     ATP and NADPH drive the fixation of CO2 into glucose through a cyclic
     series of enzyme-catalysed reactions. The key enzyme is RuBisCO.

FACTORS AFFECTING PHOTOSYNTHESIS RATE:
  - Light intensity: Rate increases with light up to a saturation point.
  - CO2 concentration: Higher CO2 generally increases glucose production.
  - Temperature: Optimal range ~25-35 C; enzyme denaturation above ~40 C.
  - Water availability: Stomata close under drought, limiting CO2 entry.

=== TOPIC 2: CELL DIVISION ===

Cell division is the process by which a parent cell divides into two or more
daughter cells. The two primary forms in eukaryotes are:

MITOSIS:
  Purpose: Growth and repair of somatic (body) cells.
  Result:  Two genetically identical diploid (2n) daughter cells.
  Stages:  Prophase -> Metaphase -> Anaphase -> Telophase -> Cytokinesis.
  Key event: Sister chromatids are separated at the centromere.

MEIOSIS:
  Purpose: Production of gametes (sex cells — sperm and egg).
  Result:  Four genetically unique haploid (1n) daughter cells.
  Stages:  Two sequential divisions — Meiosis I and Meiosis II.
  Key events:
    * Crossing over (recombination) in Prophase I — increases genetic diversity.
    * Homologous chromosomes separate in Anaphase I.
    * Sister chromatids separate in Anaphase II.

=== TOPIC 3: THE WATER CYCLE (HYDROLOGICAL CYCLE) ===

The water cycle describes the continuous movement of water within Earth and
its atmosphere. It is driven primarily by solar energy and gravity.

Key processes:
  * Evaporation    — Solar energy converts liquid water in oceans, lakes, and
    rivers into water vapour, which rises into the atmosphere.
  * Condensation   — As water vapour rises and cools, it condenses around
    tiny particles (aerosols) to form clouds and fog.
  * Precipitation  — Water falls from clouds as rain, snow, sleet, or hail
    depending on atmospheric temperature.
  * Surface Runoff — Water flows over land into streams and rivers,
    eventually reaching the ocean.
"""

TEACHER_KEY = """\
ANSWER KEY — Q1: Photosynthesis (10 marks)

[2 marks] Correct identification of primary INPUTS:
  — CO2 absorbed via stomata  (1 mark)
  — H2O absorbed via roots     (1 mark)

[2 marks] Correct identification of primary OUTPUTS:
  — Glucose / C6H12O6  (1 mark)
  — Oxygen / O2         (1 mark)

[2 marks] Mention of the two stages:
  — Light-dependent reactions (thylakoid), producing ATP/NADPH  (1 mark)
  — Calvin Cycle / light-independent reactions (stroma)          (1 mark)

[2 marks] Location and chlorophyll:
  — Chloroplasts are the site of photosynthesis  (1 mark)
  — Chlorophyll absorbs light energy              (1 mark)

[2 marks] Balanced overall equation or equivalent narrative:
  — 6CO2 + 6H2O + light -> glucose + O2           (1 mark)
  — Statement that oxygen is a by-product released (1 mark)

TOTAL: 10 marks. Do not penalise for spelling unless meaning is changed.
"""

# Messy OCR output with typical handwriting scan artefacts (^, |, ~, `)
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
    The single shared state object that flows through every node in the graph.

    LangGraph passes this dict between nodes. Each node receives the full
    current state and returns a PARTIAL dict containing only the keys it
    updates — LangGraph merges the update back into the running state.

    Fields:
        exam_id          : Unique identifier for this exam (e.g. "bio_midterm_01").
        question_text    : Full text of the exam question being evaluated.
        max_marks        : Maximum marks available for this question.
        raw_student_text : Unprocessed OCR output from the student's scan.
        cleaned_text     : Cleaned version of raw_student_text (post OCR agent).
        retrieved_context: Rubric/reference chunks fetched from Pinecone.
        score            : Numeric grade awarded by the Evaluator (0..max_marks).
        reasoning        : Evaluator's internal chain-of-thought (not shown to student).
        feedback         : Student-facing feedback string.
        review_status    : "PASS" if Reviewer approves, "FAIL" if it flags issues.
        review_feedback  : Reviewer's notes explaining WHY it flagged FAIL.
        attempts         : How many times node_evaluate has run (max 2 enforced).
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
    review_status:     str   # Literal["PASS", "FAIL"]
    review_feedback:   str
    attempts:          int


# ===========================================================================
# SECTION 2: REVIEWER SCHEMA AND LLM SETUP
# ===========================================================================

class ReviewResult(BaseModel):
    """
    Structured output schema for the Reviewer node.

    The Reviewer LLM must populate both fields:
      is_valid      : True  => Evaluator result looks correct  => route to END.
                      False => Evaluator result has issues      => re-route to Evaluate.
      reviewer_notes: Plain-English explanation of what is correct or what is wrong.
                      Always populated — used for audit logging even on PASS.
    """
    is_valid: bool = Field(
        description=(
            "True if the score is mathematically consistent with the reasoning "
            "AND the feedback appropriately reflects the awarded score. "
            "False if there is any arithmetic error, hallucination, or "
            "mismatch between score and feedback."
        )
    )
    reviewer_notes: str = Field(
        description=(
            "A concise explanation (1-3 sentences) of the review decision. "
            "On PASS: confirm what was checked and found correct. "
            "On FAIL: precisely describe the inconsistency or error found "
            "so the Evaluator can self-correct on the next attempt."
        )
    )


def _llm_with_retry(model_name: str, prompt: str, output_schema) -> object:
    """
    Helper: invoke a structured-output LLM chain with exponential back-off
    on Gemini free-tier 429 RESOURCE_EXHAUSTED errors.

    Args:
        model_name   : Gemini model string, e.g. "gemini-2.5-flash".
        prompt       : Fully formatted string prompt to send.
        output_schema: A Pydantic BaseModel class to bind as structured output.

    Returns:
        A validated instance of output_schema.
    """
    llm    = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=GEMINI_API_KEY,
        temperature=0.1,   # Low temperature for consistent, deterministic review
    )
    chain  = llm.with_structured_output(output_schema)

    max_retries  = 3
    wait_seconds = 35

    for attempt in range(1, max_retries + 1):
        try:
            return chain.invoke(prompt)
        except Exception as exc:
            err = str(exc)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                if attempt < max_retries:
                    print(
                        f"    [rate-limit] 429 on '{model_name}'. "
                        f"Waiting {wait_seconds}s... (attempt {attempt}/{max_retries})"
                    )
                    time.sleep(wait_seconds)
                    wait_seconds *= 2
                else:
                    raise RuntimeError(
                        f"Gemini rate limit persisted after {max_retries} retries "
                        f"for model '{model_name}'. Wait a minute and retry."
                    ) from exc
            else:
                raise   # Non-quota error — surface immediately


# ===========================================================================
# SECTION 3: NODE DEFINITIONS
# ===========================================================================
# Each node is a plain Python function:
#   - Receives the full ExamState dict as its only argument.
#   - Returns a PARTIAL dict containing only the keys it updates.
#   - LangGraph merges the partial update into the running state automatically.
# ===========================================================================

def node_clean_text(state: ExamState) -> dict:
    """
    OCR AGENT NODE
    --------------
    Removes OCR artefacts (|  ~  ^  `) and normalises whitespace from the
    raw handwriting scan using the existing clean_ocr_text() utility.

    Reads  : state["raw_student_text"]
    Updates: state["cleaned_text"]
    """
    from utils.text_cleaner import clean_ocr_text

    _banner("NODE: clean_text")
    print("    Input  (first 120 chars):", repr(state["raw_student_text"][:120]))

    cleaned = clean_ocr_text(state["raw_student_text"])

    print("    Output (first 120 chars):", repr(cleaned[:120]))
    print(f"    Artefact chars removed  : "
          f"{len(state['raw_student_text']) - len(cleaned)}")

    return {"cleaned_text": cleaned}


def node_retrieve(state: ExamState) -> dict:
    """
    RETRIEVAL AGENT NODE
    --------------------
    Queries Pinecone with the exam question as the semantic search vector,
    filtered by exam_id, and returns the top-3 most relevant rubric chunks.

    Reads  : state["exam_id"], state["question_text"]
    Updates: state["retrieved_context"]
    """
    from services.vector_store import retrieve_rubric

    _banner("NODE: retrieve")
    print(f"    exam_id  : {state['exam_id']}")
    print(f"    query    : {state['question_text']}")

    context = retrieve_rubric(
        exam_id=state["exam_id"],
        question_text=state["question_text"],
        top_k=3,
    )

    print(f"    Retrieved context ({len(context)} chars).")
    print("    Preview:", context[:200].replace("\n", " "), "...")

    return {"retrieved_context": context}


def node_evaluate(state: ExamState) -> dict:
    """
    EVALUATION AGENT NODE
    ---------------------
    Sends a structured grading prompt to Gemini (via the existing
    grade_student_answer() utility) and stores the score, reasoning,
    and student-facing feedback into state.

    Also increments state["attempts"] so the conditional router can enforce
    the 2-attempt maximum loop limit.

    If the Reviewer previously returned FAIL, the review_feedback string is
    visible in state and implicitly available for context — in a more advanced
    version you could inject it into the prompt as a "correction hint".

    Reads  : state["cleaned_text"], state["retrieved_context"],
             state["question_text"], state["max_marks"], state["attempts"],
             state["review_feedback"]  (on retry — for logging)
    Updates: state["score"], state["reasoning"], state["feedback"],
             state["attempts"]
    """
    from utils.evaluator import grade_student_answer

    new_attempt = state["attempts"] + 1
    _banner(f"NODE: evaluate  (attempt {new_attempt})")

    # If this is a retry, surface the reviewer's critique so it's visible
    # in the console — and could optionally be injected into the prompt.
    if state["review_feedback"]:
        print("    [RETRY] Reviewer previously flagged:")
        for line in textwrap.wrap(state["review_feedback"], width=70):
            print(f"            {line}")

    result: dict = grade_student_answer(
        question_text=state["question_text"],
        student_text=state["cleaned_text"],
        reference_context=state["retrieved_context"],
        max_marks=state["max_marks"],
    )

    print(f"    Score awarded : {result['score']} / {state['max_marks']}")
    print("    Feedback      :", textwrap.shorten(result["feedback"], width=80))

    return {
        "score":    result["score"],
        "reasoning": result["reasoning"],
        "feedback": result["feedback"],
        "attempts": new_attempt,
    }


def node_review(state: ExamState) -> dict:
    """
    REVIEWER / VALIDATOR NODE
    --------------------------
    A fast, independent LLM call (gemini-2.5-flash) that cross-checks the
    Evaluator's output for:
      1. Arithmetic consistency  — does the number of points awarded add up
                                   to the stated score?
      2. Feedback alignment      — does the student-facing feedback accurately
                                   reflect the score (e.g. high score with
                                   very negative feedback is suspicious)?
      3. Hallucination detection — did the Evaluator cite concepts not present
                                   in the reference context?

    Uses .with_structured_output(ReviewResult) so the response is always a
    validated is_valid (bool) + reviewer_notes (str) pair.

    Decision:
      is_valid = True  => review_status = "PASS"  (graph routes to END)
      is_valid = False => review_status = "FAIL"  (graph loops back to evaluate)

    Reads  : state["score"], state["max_marks"], state["reasoning"],
             state["feedback"], state["retrieved_context"], state["attempts"]
    Updates: state["review_status"], state["review_feedback"]
    """
    _banner(f"NODE: review  (checking attempt {state['attempts']} result)")

    # ── Build the reviewer prompt ──────────────────────────────────────────
    reviewer_prompt = f"""\
You are a meticulous academic quality-control reviewer.
Your job is to validate the output produced by an AI grading system.

=== EXAM CONTEXT ===
Max marks for this question: {state["max_marks"]}

=== REFERENCE RUBRIC (ground truth) ===
{state["retrieved_context"]}

=== EVALUATOR'S AWARDED SCORE ===
{state["score"]} / {state["max_marks"]}

=== EVALUATOR'S INTERNAL REASONING ===
{state["reasoning"]}

=== EVALUATOR'S STUDENT-FACING FEEDBACK ===
{state["feedback"]}

=== YOUR REVIEW TASKS ===
1. Check arithmetic: does the sum of points mentioned in the reasoning
   match the awarded score? Flag any discrepancy.
2. Check alignment: does the tone/content of the feedback match the score?
   (A 9/10 with "you got almost nothing right" is a mismatch.)
3. Check grounding: does the reasoning refer only to content present in
   the reference rubric, or does it invent facts?
4. Check bounds: is the score between 0 and {state["max_marks"]} inclusive?

Return is_valid=True ONLY if ALL four checks pass.
Return is_valid=False and explain the exact problem in reviewer_notes.
"""

    print("    Invoking Reviewer LLM (gemini-2.5-flash)...")

    review: ReviewResult = _llm_with_retry(
        model_name="gemini-2.5-flash",
        prompt=reviewer_prompt,
        output_schema=ReviewResult,
    )

    status = "PASS" if review.is_valid else "FAIL"
    icon   = "✓" if review.is_valid else "✗"

    print(f"    Review decision : [{icon}] {status}")
    print("    Reviewer notes  :", textwrap.shorten(review.reviewer_notes, width=75))

    return {
        "review_status":   status,
        "review_feedback": review.reviewer_notes,
    }


# ===========================================================================
# SECTION 4: CONDITIONAL ROUTER
# ===========================================================================

def route_after_review(
    state: ExamState,
) -> Literal["node_evaluate", "__end__"]:
    """
    Conditional edge function called after node_review completes.

    Routing logic:
      - PASS               => terminate graph  (quality check passed)
      - FAIL + attempts<2  => loop back to node_evaluate for self-correction
      - FAIL + attempts>=2 => terminate graph  (hit retry cap — accept result)

    LangGraph requires this function to return the EXACT name of the next
    node (as a string) or the special constant END ("__end__").
    """
    _banner("ROUTER: route_after_review")

    if state["review_status"] == "PASS":
        print("    Decision: PASS -> routing to END")
        return END

    # review_status == "FAIL"
    if state["attempts"] >= 2:
        print(
            f"    Decision: FAIL but attempts={state['attempts']} "
            f">= 2 -> routing to END (cap reached, accepting result)"
        )
        return END

    print(
        f"    Decision: FAIL and attempts={state['attempts']} "
        f"< 2 -> routing BACK to node_evaluate for self-correction"
    )
    return "node_evaluate"


# ===========================================================================
# SECTION 5: GRAPH COMPILATION
# ===========================================================================

def build_graph() -> object:
    """
    Assemble, wire, and compile the LangGraph StateGraph.

    Topology:
        START -> node_clean_text -> node_retrieve -> node_evaluate
              -> node_review  --(conditional)--> node_evaluate  (FAIL loop)
                                              --> END            (PASS / cap)

    Returns:
        A compiled LangGraph CompiledGraph ready to call .invoke() on.
    """
    builder = StateGraph(ExamState)

    # ── Register nodes ─────────────────────────────────────────────────────
    builder.add_node("node_clean_text", node_clean_text)
    builder.add_node("node_retrieve",   node_retrieve)
    builder.add_node("node_evaluate",   node_evaluate)
    builder.add_node("node_review",     node_review)

    # ── Standard (unconditional) edges ─────────────────────────────────────
    builder.add_edge(START,             "node_clean_text")
    builder.add_edge("node_clean_text", "node_retrieve")
    builder.add_edge("node_retrieve",   "node_evaluate")
    builder.add_edge("node_evaluate",   "node_review")

    # ── Conditional edge from node_review ──────────────────────────────────
    # route_after_review() returns either "node_evaluate" or END.
    # The path_map dict tells LangGraph which return values map to which nodes.
    builder.add_conditional_edges(
        source="node_review",
        path=route_after_review,
        path_map={
            "node_evaluate": "node_evaluate",
            END:             END,
        },
    )

    # ── Compile ────────────────────────────────────────────────────────────
    app = builder.compile()
    print("\n[graph] StateGraph compiled successfully.")
    print("[graph] Topology: START -> clean -> retrieve -> evaluate -> review "
          "--(PASS/cap)--> END | --(FAIL)--> evaluate\n")
    return app


# ===========================================================================
# SECTION 6: CONSOLE HELPERS
# ===========================================================================

def _banner(title: str, width: int = 62) -> None:
    """Print a clearly visible section header to the console."""
    print(f"\n{'=' * width}")
    print(f"  {title}")
    print(f"{'=' * width}")


def _print_final_result(final_state: ExamState) -> None:
    """Pretty-print the completed ExamState as a clean JSON payload."""
    _banner("FINAL RESULT  (DB / Notification Agent Payload)")
    print("  This payload would be persisted and sent to the teacher dashboard.\n")

    payload = {
        "exam_id":       final_state["exam_id"],
        "question":      final_state["question_text"],
        "max_marks":     final_state["max_marks"],
        "score":         final_state["score"],
        "feedback":      final_state["feedback"],
        "review_status": final_state["review_status"],
        "total_attempts":final_state["attempts"],
        # Internal fields (audit log — not shown to student)
        "_reasoning":       final_state["reasoning"],
        "_reviewer_notes":  final_state["review_feedback"],
    }

    print(json.dumps(payload, indent=2, ensure_ascii=False))

    _banner("PIPELINE COMPLETE")
    print(f"  Score         : {final_state['score']} / {final_state['max_marks']}")
    print(f"  Review status : {final_state['review_status']}")
    print(f"  Attempts used : {final_state['attempts']}")
    fb = final_state["feedback"]
    print(f"  Feedback      : {fb[:130]}{'...' if len(fb) > 130 else ''}")
    print()


# ===========================================================================
# SECTION 7: OPTIONAL TEACHER SEEDING STEP
# ===========================================================================

def seed_pinecone_if_needed() -> None:
    """
    Teacher Upload: chunk TEACHER_NOTES + TEACHER_KEY and upsert into Pinecone.

    This is IDEMPOTENT — running it again just adds duplicate vectors, which
    Pinecone handles gracefully (cosine similarity still works correctly).
    Comment out the call in main() once the index is seeded to save time.
    """
    from utils.text_splitter import chunk_reference_material
    from services.vector_store import store_rubric_chunks

    _banner("TEACHER SEEDING: Uploading notes + key to Pinecone")

    combined = TEACHER_NOTES + "\n\n" + TEACHER_KEY
    chunks   = chunk_reference_material(combined)
    print(f"    Split into {len(chunks)} chunks.")

    store_rubric_chunks(chunks=chunks, exam_id=EXAM_ID)
    print(f"    All {len(chunks)} chunks stored under exam_id='{EXAM_ID}'.")


# ===========================================================================
# SECTION 8: MAIN ENTRY POINT
# ===========================================================================

def main() -> None:
    """
    Orchestrate the LangGraph evaluation pipeline end-to-end.

    Steps:
      0. (Optional) Seed Pinecone with teacher notes — comment out if already done.
      1. Build and compile the StateGraph.
      2. Define the initial ExamState.
      3. Invoke the compiled graph — LangGraph handles all node routing.
      4. Print the final enriched state.
    """

    # ── Step 0: Seed Pinecone (comment out after first successful run) ─────
    # The vector store must be populated before node_retrieve can run.
    # Once seeded, comment this line out to skip the embedding step and save
    # ~15 seconds on every test run.
    seed_pinecone_if_needed()

    # ── Step 1: Build and compile the graph ────────────────────────────────
    app = build_graph()

    # ── Step 2: Define initial state ───────────────────────────────────────
    # Only fields known at invocation time are set. All agent-populated
    # fields (cleaned_text, score, etc.) start as empty defaults — LangGraph
    # will fill them in as nodes execute.
    initial_state: ExamState = {
        "exam_id":           EXAM_ID,
        "question_text":     QUESTION_TEXT,
        "max_marks":         MAX_MARKS,
        "raw_student_text":  STUDENT_OCR_TEXT,
        # Fields populated by nodes — initialised to safe empty values
        "cleaned_text":      "",
        "retrieved_context": "",
        "score":             0.0,
        "reasoning":         "",
        "feedback":          "",
        "review_status":     "",   # Will become "PASS" or "FAIL"
        "review_feedback":   "",   # Reviewer's notes (empty until first review)
        "attempts":          0,    # Incremented by node_evaluate on each run
    }

    _banner("LAUNCHING LANGGRAPH PIPELINE")
    print(f"  exam_id  : {EXAM_ID}")
    print(f"  question : {QUESTION_TEXT}")
    print(f"  max marks: {MAX_MARKS}")
    print(f"  raw text : {len(STUDENT_OCR_TEXT)} chars with OCR artefacts")

    # ── Step 3: Invoke the graph ────────────────────────────────────────────
    # app.invoke() is synchronous and blocks until the graph reaches END.
    # LangGraph handles all node dispatch, state merging, and conditional
    # routing internally based on the compiled graph topology.
    final_state: ExamState = app.invoke(initial_state)

    # ── Step 4: Print the final result ─────────────────────────────────────
    _print_final_result(final_state)


# ===========================================================================
# Entry point
# ===========================================================================
if __name__ == "__main__":
    main()
