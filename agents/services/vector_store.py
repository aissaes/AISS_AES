"""
services/vector_store.py

Pinecone vector database service for storing and retrieving rubric/marking-scheme
chunks using LangChain + Google Gemini Embeddings.

Responsibilities:
  - Initialise the Gemini embedding model and the Pinecone vector store.
  - store_rubric_chunks() — embed text chunks and upsert them into Pinecone
    with question_id and max_marks as metadata.
  - retrieve_rubric()    — query Pinecone by metadata filter and return
    the combined text of the top matching chunks.

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
# "models/embedding-001" is Google's text embedding model optimised for
# semantic similarity — ideal for rubric retrieval tasks.
# Output dimensionality: 768.
# ---------------------------------------------------------------------------
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=GEMINI_API_KEY,
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
        dimension=768,                        # Must match embedding-001 output
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
    question_id: str,
    max_marks: int,
) -> None:
    """
    Embed and upsert rubric/marking-scheme text chunks into Pinecone.

    Each chunk is stored as a separate vector document with the following
    metadata so it can be filtered during retrieval:
      - question_id : links the chunk to a specific exam question
      - max_marks   : total marks available (useful for downstream grading)
      - chunk_index : positional index within the original document

    Args:
        chunks      : List of text strings produced by chunk_reference_material().
        question_id : Unique question identifier, e.g. "Q1_2024_CS101".
        max_marks   : Maximum marks available for this question.

    Returns:
        None. Raises RuntimeError on Pinecone or embedding failure.

    Example:
        >>> store_rubric_chunks(chunks, question_id="Q1", max_marks=10)
    """
    if not chunks:
        raise ValueError("chunks list must not be empty.")

    metadatas = [
        {
            "question_id": question_id,
            "max_marks": max_marks,
            "chunk_index": i,
        }
        for i, _ in enumerate(chunks)
    ]

    print(f"[vector_store] Upserting {len(chunks)} chunks for question_id='{question_id}'...")

    vector_store.add_texts(texts=chunks, metadatas=metadatas)

    print(f"[vector_store] ✅ Successfully stored {len(chunks)} chunks.")


def retrieve_rubric(question_id: str, top_k: int = 3) -> str:
    """
    Retrieve the most relevant rubric chunks for a given question from Pinecone.

    Uses a metadata filter on ``question_id`` so that only chunks belonging to
    the requested question are considered, then returns the top_k results
    ranked by cosine similarity to the question_id string itself (used here as
    a proxy query — you can swap this for the student answer text to get the
    most *relevant* rubric sections for semantic grading).

    Args:
        question_id : The identifier used when the chunks were stored.
        top_k       : Number of top chunks to return (default 3).

    Returns:
        A single string formed by joining the retrieved chunk texts with
        double newlines, ready to be passed to the grading LLM.

    Raises:
        ValueError  : If no chunks are found for the given question_id.
        RuntimeError: If the Pinecone query fails.

    Example:
        >>> rubric_text = retrieve_rubric("Q1_2024_CS101")
        >>> print(rubric_text[:200])
    """
    print(f"[vector_store] Querying Pinecone for question_id='{question_id}'...")

    # Use the question_id as the search query — this retrieves vectors whose
    # embeddings are closest to the embedding of the question_id string.
    # In production, replace this with the student's cleaned answer text for
    # semantic rubric matching.
    results = vector_store.similarity_search(
        query=question_id,
        k=top_k,
        filter={"question_id": {"$eq": question_id}},
    )

    if not results:
        raise ValueError(
            f"No rubric chunks found in Pinecone for question_id='{question_id}'. "
            "Ensure store_rubric_chunks() was called before retrieval."
        )

    # Combine the page_content of each returned Document
    combined_text: str = "\n\n".join(doc.page_content for doc in results)

    print(f"[vector_store] ✅ Retrieved {len(results)} chunks.")
    return combined_text
