"""
services/vector_store.py

The Retrieval Agent / Vector Database Service.

This module manages the connection to Pinecone and handles the embedding 
of raw text using Google's `gemini-embedding-001` model (locked to 768 dimensions). 

It implements an `exam_id`-based filtering strategy, allowing bulk ingestion 
of master exam documents. During retrieval, it uses the semantic meaning of a 
specific question to fetch only the contextually relevant paragraphs needed 
by the Evaluation Agent.
"""

import os
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

# ---------------------------------------------------------------------------
# Environment & Client Setup
# ---------------------------------------------------------------------------
load_dotenv()

PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

_missing = [
    name for name, val in {
        "PINECONE_API_KEY": PINECONE_API_KEY,
        "PINECONE_INDEX_NAME": PINECONE_INDEX_NAME,
        "GEMINI_API_KEY": GEMINI_API_KEY,
    }.items() if not val
]
if _missing:
    raise EnvironmentError(f"Missing environment variable(s): {', '.join(_missing)}")

embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=GEMINI_API_KEY,
    output_dimensionality=768,
)

_pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
_existing_indexes = [idx["name"] for idx in _pinecone_client.list_indexes()]

if PINECONE_INDEX_NAME not in _existing_indexes:
    print(f"[vector_store] Initializing new index: '{PINECONE_INDEX_NAME}'...")
    _pinecone_client.create_index(
        name=PINECONE_INDEX_NAME,
        dimension=768, 
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

vector_store = PineconeVectorStore(
    index_name=PINECONE_INDEX_NAME,
    embedding=embeddings,
    pinecone_api_key=PINECONE_API_KEY,
)

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def store_rubric_chunks(chunks: list[str], exam_id: str) -> None:
    """
    Embeds and stores reference text chunks into the vector database.
    Metadata tagging allows multiple exams to securely share one index.
    """
    if not chunks:
        raise ValueError("Chunk payload must not be empty.")

    metadatas = [{"exam_id": exam_id, "chunk_index": i} for i, _ in enumerate(chunks)]
    print(f"[vector_store] Upserting {len(chunks)} chunks for exam_id='{exam_id}'...")
    
    vector_store.add_texts(texts=chunks, metadatas=metadatas)
    print(f"[vector_store] Successfully stored {len(chunks)} vectors.")

def retrieve_rubric(exam_id: str, question_text: str, top_k: int = 3) -> str:
    """
    Executes a semantic similarity search against the vector database.
    Filters globally by exam_id and fetches chunks matching the question text.
    """
    print(f"[vector_store] Executing semantic search for exam_id='{exam_id}'...")

    results = vector_store.similarity_search(
        query=question_text,
        k=top_k,
        filter={"exam_id": {"$eq": exam_id}},
    )

    if not results:
        raise ValueError(f"No reference context found for exam_id='{exam_id}'.")

    combined_text: str = "\n\n".join(doc.page_content for doc in results)
    print(f"[vector_store] Retrieved {len(results)} highly relevant chunks.")
    return combined_text