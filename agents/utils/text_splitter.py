"""
utils/text_splitter.py

Splits large reference documents (marking schemes, rubrics, textbook excerpts)
into smaller, semantically coherent chunks suitable for vector embedding.

Why RecursiveCharacterTextSplitter?
  - It tries progressively smaller separators: paragraph → sentence → word.
  - This keeps semantically related sentences together much better than a
    naive fixed-size character slice.
  - chunk_overlap=100 ensures that context at chunk boundaries is not lost,
    which is critical when a rubric point spans two chunks.
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter

# ---------------------------------------------------------------------------
# Splitter configuration — tuned for rubric / marking-scheme documents
# ---------------------------------------------------------------------------
_SPLITTER = RecursiveCharacterTextSplitter(
    chunk_size=1000,       # Maximum characters per chunk
    chunk_overlap=100,     # Overlap between consecutive chunks (preserves context)
    length_function=len,   # Plain character count (not token count)
    separators=[
        "\n\n",   # Prefer splitting on paragraph breaks first
        "\n",     # Then on single newlines
        ". ",     # Then on sentence boundaries
        " ",      # Then on word boundaries
        "",       # Last resort: mid-word split (rarely triggered)
    ],
)


def chunk_reference_material(text: str) -> list[str]:
    """
    Split a long reference-material string into a list of smaller chunks.

    This should be called on cleaned text (run clean_ocr_text() first if the
    source is OCR output) before the chunks are embedded and stored in Pinecone.

    Args:
        text: The full text of a marking scheme, rubric, or reference document.

    Returns:
        A list of non-empty string chunks, each ≤ chunk_size characters
        (with overlap at the boundaries).

    Raises:
        ValueError: If *text* is empty or contains only whitespace.

    Example:
        >>> chunks = chunk_reference_material(long_rubric_text)
        >>> print(f"Split into {len(chunks)} chunks")
        Split into 7 chunks
    """
    if not text or not text.strip():
        raise ValueError("Cannot split empty or whitespace-only text.")

    chunks: list[str] = _SPLITTER.split_text(text)

    # Filter out any chunks that became empty after splitting
    chunks = [c.strip() for c in chunks if c.strip()]

    return chunks
