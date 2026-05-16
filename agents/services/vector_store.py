"""
services/vector_store.py

Pinecone vector database service for storing and retrieving rubric/marking-scheme
chunks using LangChain + Google Gemini Embeddings.

Responsibilities:
  - Initialise the Gemini embedding model and the Pinecone vector store.
  - store_rubric_chunks() — embed text chunks and upsert them into Pinecone
    with exam_id in metadata, so multiple exams can share one index.
  - retrieve_rubric()    — filter by exam_id, then run a semantic similarity
    search using the student's question text to surface the most relevant
    rubric sections.

Environment variables required in .env:
  PINECONE_API_KEY      — Your Pinecone project API key
  PINECONE_INDEX_NAME   — Name of the target Pinecone index
  GEMINI_API_KEY        — Google AI Studio / Gemini API key
"""

import os

from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------
load_dotenv()

PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# ---------------------------------------------------------------------------
# Validate that all required keys are present at import time
# ---------------------------------------------------------------------------
_missing = [
    name for name, val in {
        "PINECONE_API_KEY": PINECONE_API_KEY,
        "PINECONE_INDEX_NAME": PINECONE_INDEX_NAME,
        "GEMINI_API_KEY": GEMINI_API_KEY,
    }.items() if not val
]
if _missing:
    raise EnvironmentError(
        f"Missing required environment variable(s): {', '.join(_missing)}. "
        "Ensure they are set in your .env file."
    )

# ---------------------------------------------------------------------------
# Initialise Gemini Embeddings
#
# "gemini-embedding-001" is Google's current stable text-embedding model,
# optimised for semantic similarity tasks. We pin output_dimensionality=768
# so that every vector written to Pinecone is exactly 768-dimensional —
# matching our index configuration.
# ---------------------------------------------------------------------------
embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=GEMINI_API_KEY,
    output_dimensionality=768,
)

# ---------------------------------------------------------------------------
# Initialise Pinecone client and ensure the index exists
#
# We create a serverless index (AWS us-east-1) on first run if it doesn't
# exist yet. Dimensionality must match the embedding model output (768).
# ---------------------------------------------------------------------------
_pinecone_client = Pinecone(api_key=PINECONE_API_KEY)

_existing_indexes = [idx["name"] for idx in _pinecone_client.list_indexes()]
if PINECONE_INDEX_NAME not in _existing_indexes:
    print(f"[vector_store] Index '{PINECONE_INDEX_NAME}' not found — creating it...")
    _pinecone_client.create_index(
        name=PINECONE_INDEX_NAME,
        dimension=768,                        # Must match gemini-embedding-001 output
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
    print(f"[vector_store] Index '{PINECONE_INDEX_NAME}' created successfully.")

# ---------------------------------------------------------------------------
# Build the LangChain PineconeVectorStore instance
# ---------------------------------------------------------------------------
vector_store = PineconeVectorStore(
    index_name=PINECONE_INDEX_NAME,
    embedding=embeddings,
    pinecone_api_key=PINECONE_API_KEY,
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def store_rubric_chunks(
    chunks: list[str],
    exam_id: str,
) -> None:
    """
    Embed and upsert rubric/marking-scheme text chunks into Pinecone.

    Each chunk is stored as a separate vector document. The ``exam_id``
    is written into the Pinecone metadata so that retrieve_rubric() can
    filter results to only the chunks belonging to a specific exam —
    allowing multiple exams to share a single Pinecone index cleanly.

    Args:
        chunks  : List of text strings produced by chunk_reference_material().
        exam_id : Unique exam identifier, e.g. "bio_midterm_01".

    Returns:
        None. Raises RuntimeError on Pinecone or embedding failure.

    Example:
        >>> store_rubric_chunks(chunks, exam_id="bio_midterm_01")
    """
    if not chunks:
        raise ValueError("chunks list must not be empty.")

    metadatas = [
        {
            "exam_id": exam_id,       # Primary filter key for retrieval
            "chunk_index": i,         # Positional index for debugging / ordering
        }
        for i, _ in enumerate(chunks)
    ]

    print(f"[vector_store] Upserting {len(chunks)} chunks for exam_id='{exam_id}'...")

    vector_store.add_texts(texts=chunks, metadatas=metadatas)

    print(f"[vector_store] ✅ Successfully stored {len(chunks)} chunks.")


def retrieve_rubric(exam_id: str, question_text: str, top_k: int = 3) -> str:
    """
    Retrieve the most relevant rubric chunks for a given exam question.

    Strategy:
      1. Filter by ``exam_id`` so we only search within the correct exam's
         rubric — preventing cross-exam contamination.
      2. Use ``question_text`` as the semantic search query so that the
         cosine-similarity ranking surfaces the rubric sections most
         topically relevant to what the student was asked.

    Args:
        exam_id       : The exam identifier used when the chunks were stored.
        question_text : The full text of the exam question (used as the
                        semantic query vector).
        top_k         : Number of top chunks to return (default 3).

    Returns:
        A single string formed by joining the retrieved chunk texts with
        double newlines, ready to be passed to the grading LLM.

    Raises:
        ValueError  : If no chunks are found for the given exam_id.
        RuntimeError: If the Pinecone query fails.

    Example:
        >>> rubric = retrieve_rubric(
        ...     exam_id="bio_midterm_01",
        ...     question_text="Describe the process of photosynthesis."
        ... )
    """
    print(
        f"[vector_store] Querying Pinecone — "
        f"exam_id='{exam_id}', query='{question_text[:60]}...'"
    )

    # Semantic search: embed question_text and find the closest rubric chunks,
    # but only those tagged with the correct exam_id.
    results = vector_store.similarity_search(
        query=question_text,
        k=top_k,
        filter={"exam_id": {"$eq": exam_id}},
    )

    if not results:
        raise ValueError(
            f"No rubric chunks found in Pinecone for exam_id='{exam_id}'. "
            "Ensure store_rubric_chunks() was called before retrieval."
        )

    # Combine the page_content of each returned Document into a single string
    combined_text: str = "\n\n".join(doc.page_content for doc in results)

    print(f"[vector_store] ✅ Retrieved {len(results)} relevant chunk(s).")
    return combined_text
