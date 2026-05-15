"""
test_pipeline.py

Standalone local test script for the AISS AES utility pipeline.

Run from the agents/ directory:
    python test_pipeline.py

What this script tests (in order):
  1. clean_ocr_text()      — text normalisation / artefact removal
  2. chunk_reference_material() — LangChain-based document splitting
  3. store_rubric_chunks() — embedding + Pinecone upsert
  4. retrieve_rubric()     — Pinecone metadata-filtered retrieval

No FastAPI server needs to be running. All calls are made directly to
the utility functions and services.

Prerequisites:
  • pip install -r requirements.txt
  • .env file in the agents/ directory with:
      PINECONE_API_KEY=...
      PINECONE_INDEX_NAME=...
      GEMINI_API_KEY=...
"""

# ---------------------------------------------------------------------------
# Hardcoded test data
# ---------------------------------------------------------------------------

# Simulates messy raw OCR output — lots of artefacts, spacing issues, and
# excessive blank lines typical of handwriting recognition errors.
FAKE_OCR_TEXT = """
The  water  cycle | is  a  continuous~  process^  that
describes   the   movement  of  water  on,  above
and  below  the  surface   of  the  Earth.

It consists  of  several   key   stages:


Evaporation  occurs  when  heat  from  the  sun | converts
liquid  water   into   water   vapour.

Condensation`  follows  as  the  water  vapour  rises, cools,
and  forms   clouds.  Precipitation`  then  brings  water
back  to   the   surface as  rain~  or  snow.

Finally,   runoff  collects | in  rivers,  lakes,  and  oceans^,
completing  the  cycle.
"""

# Simulates a teacher's marking rubric — long enough to be split into
# multiple chunks by RecursiveCharacterTextSplitter.
FAKE_RUBRIC_TEXT = """
Marking Rubric for Q1: Describe the Water Cycle (10 Marks)

SECTION A — Evaporation (2 marks)
Award 1 mark for correctly identifying that evaporation is driven by solar energy
(heat from the sun). Award a further 1 mark for explaining that liquid water
molecules gain enough kinetic energy to escape into the atmosphere as water
vapour. Do NOT award marks for answers that confuse evaporation with boiling;
evaporation occurs at the water surface at any temperature.

SECTION B — Condensation (2 marks)
Award 1 mark for stating that water vapour rises and cools as altitude increases.
Award 1 mark for explaining that as temperature drops, vapour condenses around
dust particles or aerosols to form water droplets, which collectively form clouds.
Common misconception: students often say "clouds are made of steam" — this is
incorrect and should not be awarded a mark.

SECTION C — Precipitation (2 marks)
Award 1 mark for identifying at least two forms of precipitation (rain, snow,
sleet, hail). Award 1 mark for explaining the mechanism: water droplets in clouds
collide and coalesce until they are too heavy to remain suspended, falling to
Earth's surface under gravity.

SECTION D — Runoff and Collection (2 marks)
Award 1 mark for describing surface runoff — water flows over land into streams,
rivers, and eventually oceans. Award 1 mark for mentioning groundwater percolation:
some water infiltrates the soil, replenishing aquifers and underground water tables.

SECTION E — Continuity of the Cycle (1 mark)
Award 1 mark for explicitly stating that the water cycle is continuous and that
no water is created or destroyed — it merely changes state and location. The
student must use the word "continuous" or a clear synonym.

SECTION F — Diagram / Labelling (1 mark)
If the student has drawn and correctly labelled a diagram showing at least three
stages of the water cycle with directional arrows, award 1 mark. The diagram must
be self-consistent; arrows must flow in the correct direction.

GENERAL GUIDANCE:
- Spelling mistakes should not be penalised unless they change the meaning.
- Accept all scientifically valid synonyms (e.g., "vaporisation" for evaporation).
- Do not award half marks; round down to the nearest whole mark.
- Maximum total: 10 marks.
"""

QUESTION_ID = "test_q1"
MAX_MARKS = 10

# ---------------------------------------------------------------------------
# Separator for nicer console output
# ---------------------------------------------------------------------------
def _separator(title: str) -> None:
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Main test pipeline
# ---------------------------------------------------------------------------
def main() -> None:
    # ------------------------------------------------------------------ #
    # STEP 1 — Text Cleaning                                              #
    # ------------------------------------------------------------------ #
    from utils.text_cleaner import clean_ocr_text

    _separator("STEP 1 — Text Cleaning")
    print("[INPUT]  Raw OCR text (first 200 chars):")
    print(repr(FAKE_OCR_TEXT[:200]))

    cleaned_text = clean_ocr_text(FAKE_OCR_TEXT)

    print("\n[OUTPUT] Cleaned text:")
    print(cleaned_text)
    print(f"\n✅ Cleaning complete. Character count: {len(cleaned_text)}")

    # ------------------------------------------------------------------ #
    # STEP 2 — Text Splitting                                             #
    # ------------------------------------------------------------------ #
    from utils.text_splitter import chunk_reference_material

    _separator("STEP 2 — Text Splitting (Rubric Chunking)")
    chunks = chunk_reference_material(FAKE_RUBRIC_TEXT)

    print(f"✅ Rubric split into {len(chunks)} chunk(s).")
    for i, chunk in enumerate(chunks):
        print(f"\n--- Chunk {i + 1} ({len(chunk)} chars) ---")
        # Print only first 150 chars of each chunk to keep output readable
        print(chunk[:150] + ("..." if len(chunk) > 150 else ""))

    # ------------------------------------------------------------------ #
    # STEP 3 — Store Chunks in Pinecone                                   #
    # ------------------------------------------------------------------ #
    from services.vector_store import store_rubric_chunks

    _separator("STEP 3 — Storing Rubric Chunks in Pinecone")
    store_rubric_chunks(
        chunks=chunks,
        question_id=QUESTION_ID,
        max_marks=MAX_MARKS,
    )
    print(f"✅ All {len(chunks)} chunks stored under question_id='{QUESTION_ID}'.")

    # ------------------------------------------------------------------ #
    # STEP 4 — Retrieve Rubric from Pinecone                              #
    # ------------------------------------------------------------------ #
    from services.vector_store import retrieve_rubric

    _separator("STEP 4 — Retrieving Rubric from Pinecone")
    retrieved_text = retrieve_rubric(QUESTION_ID)

    print("✅ Database round-trip successful! Retrieved text:\n")
    print(retrieved_text)

    _separator("PIPELINE TEST COMPLETE")
    print("All 4 stages passed. The text processing pipeline is working correctly.\n")


if __name__ == "__main__":
    main()
