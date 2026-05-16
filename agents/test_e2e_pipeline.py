"""
test_e2e_pipeline.py

End-to-End Pipeline Test for the AISS Agentic Evaluation System.

Run from the agents/ directory:
    python test_e2e_pipeline.py

This script simulates the complete evaluation flow WITHOUT a running FastAPI
server. All calls are made directly to the agent utility functions and services.

Flow:
  Step 1 — Teacher uploads bulk notes + answer key → chunk & store in Pinecone
  Step 2 — Student answer arrives with OCR artefacts → clean_ocr_text()
  Step 3 — Retrieval Agent fetches relevant rubric from Pinecone
  Step 4 — Evaluation Agent grades the student answer via Gemini Flash
  Step 5 — Final result printed as formatted JSON (simulates DB/notification)

Prerequisites:
  • pip install -r requirements.txt
  • .env in agents/ with: PINECONE_API_KEY, PINECONE_INDEX_NAME, GEMINI_API_KEY
"""

import json
import sys

# Force UTF-8 output on Windows (avoids cp1252 UnicodeEncodeError for
# symbols like arrows, bullets, and checkmarks in the console output).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# ===========================================================================
# Mock Data — Biology Midterm Exam
# ===========================================================================

# ── Exam Configuration ──────────────────────────────────────────────────────
EXAM_ID = "bio_midterm_01"
QUESTION_TEXT = (
    "Describe the process of photosynthesis and its primary inputs and outputs."
)
MAX_MARKS = 10

# ── Teacher Notes: multi-topic Biology study guide ───────────────────────────
# Deliberately covers Photosynthesis, Cell Division, AND the Water Cycle so
# that the vector store has to perform real semantic sorting to find the
# photosynthesis-relevant chunks during retrieval.
TEACHER_NOTES = """\
BIOLOGY MIDTERM STUDY GUIDE — BIO 101

=== TOPIC 1: PHOTOSYNTHESIS ===

Photosynthesis is the fundamental biochemical process by which green plants,
algae, and certain bacteria convert light energy into chemical energy stored
in glucose. The overall reaction can be summarised as:

    6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂

PRIMARY INPUTS:
  • Carbon dioxide (CO₂) — absorbed through tiny pores called stomata in the
    leaf surface.
  • Water (H₂O)          — drawn from the soil through the plant's root system
    and transported via the xylem vascular tissue.
  • Light energy          — typically absorbed by the green pigment chlorophyll
    located inside chloroplasts, primarily in the palisade mesophyll layer.

PRIMARY OUTPUTS:
  • Glucose (C₆H₁₂O₆) — a simple sugar used as the plant's primary energy
    source for growth, reproduction, and cellular respiration.
  • Oxygen (O₂)        — released as a by-product through the stomata back
    into the atmosphere. This is the primary source of atmospheric oxygen.

TWO STAGES OF PHOTOSYNTHESIS:
  1. Light-Dependent Reactions (Thylakoid Membrane)
     In this stage, light energy is absorbed by chlorophyll and used to split
     water molecules (photolysis), releasing oxygen and generating ATP and
     NADPH — the energy carriers for the next stage.
  2. Light-Independent Reactions / Calvin Cycle (Stroma)
     ATP and NADPH drive the fixation of CO₂ into glucose through a cyclic
     series of enzyme-catalysed reactions. The key enzyme is RuBisCO.

FACTORS AFFECTING PHOTOSYNTHESIS RATE:
  - Light intensity: Rate increases with light up to a saturation point.
  - CO₂ concentration: Higher CO₂ generally increases glucose production.
  - Temperature: Optimal range ~25–35 °C; enzyme denaturation above ~40 °C.
  - Water availability: Stomata close under drought, limiting CO₂ entry.

=== TOPIC 2: CELL DIVISION ===

Cell division is the process by which a parent cell divides into two or more
daughter cells. The two primary forms in eukaryotes are:

MITOSIS:
  Purpose: Growth and repair of somatic (body) cells.
  Result:  Two genetically identical diploid (2n) daughter cells.
  Stages:  Prophase → Metaphase → Anaphase → Telophase → Cytokinesis.
  Key event: Sister chromatids are separated at the centromere.

MEIOSIS:
  Purpose: Production of gametes (sex cells — sperm and egg).
  Result:  Four genetically unique haploid (1n) daughter cells.
  Stages:  Two sequential divisions — Meiosis I and Meiosis II.
  Key events:
    • Crossing over (recombination) in Prophase I — increases genetic diversity.
    • Homologous chromosomes separate in Anaphase I.
    • Sister chromatids separate in Anaphase II.

CELL CYCLE CHECKPOINTS:
  The cell cycle is tightly regulated by checkpoint proteins (cyclins, CDKs).
  The G1 checkpoint (restriction point) ensures the cell is large enough and
  the environment is favourable before committing to DNA replication.
  The G2 checkpoint verifies DNA replication is complete and accurate.
  The M checkpoint (spindle assembly checkpoint) ensures chromosomes are
  properly attached to spindle fibres before separation proceeds.

=== TOPIC 3: THE WATER CYCLE (HYDROLOGICAL CYCLE) ===

The water cycle describes the continuous movement of water within Earth and
its atmosphere. It is driven primarily by solar energy and gravity.

Key processes:
  • Evaporation     — Solar energy converts liquid water in oceans, lakes, and
    rivers into water vapour, which rises into the atmosphere.
  • Transpiration   — Water is released as vapour through plant stomata.
    Evaporation + Transpiration combined = Evapotranspiration.
  • Condensation    — As water vapour rises and cools, it condenses around
    tiny particles (aerosols) to form clouds and fog.
  • Precipitation   — Water falls from clouds as rain, snow, sleet, or hail
    depending on atmospheric temperature.
  • Surface Runoff  — Water flows over land into streams and rivers,
    eventually reaching the ocean.
  • Infiltration    — Some water percolates into the soil and recharges
    underground aquifers (groundwater).
  • Groundwater Flow — Stored groundwater slowly moves through permeable rock
    layers (aquifers) and may resurface as springs.

The cycle has no beginning or end — water is conserved; only its physical
state and location change over time.
"""

# ── Teacher Answer Key: concise marking guide ────────────────────────────────
TEACHER_KEY = """\
ANSWER KEY — Q1: Photosynthesis (10 marks)

Award marks according to the following criteria:

[2 marks] Correct identification of primary INPUTS:
  — CO₂ absorbed via stomata  (1 mark)
  — H₂O absorbed via roots     (1 mark)
  — Light energy via chlorophyll (may be included here for bonus context)

[2 marks] Correct identification of primary OUTPUTS:
  — Glucose / C₆H₁₂O₆  (1 mark)
  — Oxygen / O₂          (1 mark)

[2 marks] Mention of the two stages:
  — Light-dependent reactions (thylakoid), producing ATP/NADPH  (1 mark)
  — Calvin Cycle / light-independent reactions (stroma)          (1 mark)

[2 marks] Location and chlorophyll:
  — Chloroplasts are the site of photosynthesis                  (1 mark)
  — Chlorophyll absorbs light energy                              (1 mark)

[2 marks] Balanced overall equation or equivalent narrative:
  — 6CO₂ + 6H₂O + light → glucose + O₂  (1 mark)
  — Statement that oxygen is a by-product released into atmosphere (1 mark)

TOTAL: 10 marks. Do not penalise for spelling unless meaning is changed.
"""

# ── Student OCR Text: messy, realistic, partially correct ───────────────────
# Simulates a handwritten answer scanned through an OCR engine.
# Includes artefacts (^, |, ~, `), double-spaces, and extra blank lines.
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

The  overall  equation  is:  6CO2  +  6H2O  +  light  →  glucose  +  6O2^
"""


# ===========================================================================
# Helper: pretty console separator
# ===========================================================================
def _separator(title: str, width: int = 65) -> None:
    print("\n" + "=" * width)
    print(f"  {title}")
    print("=" * width)


# ===========================================================================
# Main pipeline orchestrator
# ===========================================================================
def main() -> None:
    """
    Orchestrate the complete end-to-end agentic evaluation pipeline.

    Each step maps to a real agent/service that will be exposed via FastAPI:
      Step 1 → Teacher Upload Agent  (chunk + embed notes into Pinecone)
      Step 2 → OCR Agent             (clean raw handwriting OCR output)
      Step 3 → Retrieval Agent       (fetch relevant rubric from Pinecone)
      Step 4 → Evaluation Agent      (grade answer with Gemini Flash)
      Step 5 → DB / Notification Agent (persist result, notify teacher/student)
    """

    # ======================================================================
    # STEP 1 — Teacher Flow: Ingest notes + key, chunk, store in Pinecone
    # ======================================================================
    _separator("STEP 1 - Teacher Upload Agent")
    print("ℹ  Combining teacher notes and answer key into a single reference document...")

    from utils.text_splitter import chunk_reference_material
    from services.vector_store import store_rubric_chunks

    # Merge the broad study guide with the specific answer key.
    # The retrieval agent will surface whichever sections are most relevant
    # to the student's question via semantic similarity.
    combined_reference = TEACHER_NOTES + "\n\n" + TEACHER_KEY

    print(f"   Combined reference document: {len(combined_reference)} characters")

    chunks = chunk_reference_material(combined_reference)
    print(f"   ✅ Split into {len(chunks)} chunk(s) by RecursiveCharacterTextSplitter.")

    store_rubric_chunks(chunks=chunks, exam_id=EXAM_ID)
    print(f"   ✅ All {len(chunks)} chunks stored in Pinecone under exam_id='{EXAM_ID}'.")

    # ======================================================================
    # STEP 2 — Student Flow / OCR Agent: Clean the raw OCR text
    # ======================================================================
    _separator("STEP 2 - OCR Agent (Text Cleaning)")
    print("ℹ  Raw student OCR text (first 200 chars):")
    print(f"   {repr(STUDENT_OCR_TEXT[:200])}\n")

    from utils.text_cleaner import clean_ocr_text

    cleaned_student_text = clean_ocr_text(STUDENT_OCR_TEXT)

    print("   ✅ Cleaned student text:")
    print("   " + cleaned_student_text.replace("\n", "\n   "))
    print(f"\n   Character count: {len(STUDENT_OCR_TEXT)} → {len(cleaned_student_text)} "
          f"(removed {len(STUDENT_OCR_TEXT) - len(cleaned_student_text)} artefact chars)")

    # ======================================================================
    # STEP 3 — Retrieval Agent: Fetch relevant rubric from Pinecone
    # ======================================================================
    _separator("STEP 3 - Retrieval Agent (Pinecone Semantic Search)")
    print(f"ℹ  Retrieving top-3 rubric chunks for:")
    print(f"   exam_id      : {EXAM_ID}")
    print(f"   question     : {QUESTION_TEXT}\n")

    from services.vector_store import retrieve_rubric

    # The retrieval agent uses QUESTION_TEXT (not the student answer) as the
    # semantic query — this anchors the search to what the examiner intended,
    # not the student's potentially incomplete phrasing.
    reference_context = retrieve_rubric(
        exam_id=EXAM_ID,
        question_text=QUESTION_TEXT,
        top_k=3,
    )

    print("\n   ✅ Retrieved reference context (first 400 chars):")
    print("   " + reference_context[:400].replace("\n", "\n   ") + "...")

    # ======================================================================
    # STEP 4 — Evaluation Agent: Grade the student answer with Gemini Flash
    # ======================================================================
    _separator("STEP 4 - Evaluation Agent (Gemini Flash Grading)")
    print(f"ℹ  Grading student answer against retrieved context...")
    print(f"   Max marks : {MAX_MARKS}\n")

    from utils.evaluator import grade_student_answer

    grading_result: dict = grade_student_answer(
        question_text=QUESTION_TEXT,
        student_text=cleaned_student_text,
        reference_context=reference_context,
        max_marks=MAX_MARKS,
    )

    # ======================================================================
    # STEP 5 — DB / Notification Agent: Display the final result
    # ======================================================================
    _separator("STEP 5 - Final GradingResult (DB / Notification Agent)")
    print("ℹ  This payload would be persisted to the database and sent to")
    print("   the teacher dashboard and student notification service.\n")

    # Enrich the payload with request metadata before "persisting"
    final_payload = {
        "exam_id": EXAM_ID,
        "question": QUESTION_TEXT,
        "max_marks": MAX_MARKS,
        **grading_result,   # score, reasoning, feedback
    }

    print(json.dumps(final_payload, indent=2, ensure_ascii=False))

    _separator("END-TO-END PIPELINE TEST COMPLETE")
    print("  All 5 stages passed successfully.")
    print(f"  Final Score: {grading_result['score']} / {MAX_MARKS}")
    print(
        f"  Student Feedback Preview: "
        f"{grading_result['feedback'][:120]}..."
        if len(grading_result["feedback"]) > 120
        else f"  Student Feedback: {grading_result['feedback']}"
    )
    print()


# ===========================================================================
# Entry point
# ===========================================================================
if __name__ == "__main__":
    main()
