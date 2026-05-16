"""
utils/text_splitter.py

Data-preparation service for the Chunking Agent.

This module splits large reference documents (marking schemes, rubrics, 
textbook excerpts) into smaller, semantically coherent chunks suitable 
for vector embedding and semantic retrieval.

It utilizes LangChain's RecursiveCharacterTextSplitter to ensure semantic 
boundaries (paragraphs, sentences) are respected, preventing context loss 
across chunk overlaps.
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter

# ---------------------------------------------------------------------------
# Splitter Configuration (Tuned for academic rubrics and marking schemes)
# ---------------------------------------------------------------------------
_SPLITTER = RecursiveCharacterTextSplitter(
    chunk_size=1000,       # Maximum characters per chunk
    chunk_overlap=100,     # Overlap boundary to preserve contextual continuity
    length_function=len,   # Standard character count validation
    separators=[
        "\n\n",   # Prefer splitting on paragraph breaks first
        "\n",     # Then on single newlines
        ". ",     # Then on sentence boundaries
        " ",      # Then on word boundaries
        "",       # Last resort: mid-word split
    ],
)


def chunk_reference_material(text: str) -> list[str]:
    """
    Split a comprehensive reference document into a list of processable chunks.

    Args:
        text (str): The full text of a marking scheme, rubric, or reference document.

    Returns:
        list[str]: A list of non-empty string chunks, each bounded by the configured 
                   chunk_size with specified overlap.

    Raises:
        ValueError: If the input text is empty or contains only whitespace.
    """
    if not text or not text.strip():
        raise ValueError("Cannot split empty or whitespace-only text.")

    chunks: list[str] = _SPLITTER.split_text(text)

    # Filter out any chunks that became empty post-split
    chunks = [c.strip() for c in chunks if c.strip()]

    return chunks