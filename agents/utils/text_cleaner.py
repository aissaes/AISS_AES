"""
utils/text_cleaner.py

Data-preparation service for the OCR Agent.

This module normalizes and sanitizes raw OCR output before it enters the 
evaluation pipeline. It specifically targets common handwriting extraction 
artefacts, structural formatting errors, and hallucinated characters to 
ensure high-fidelity text is passed to the LLM.
"""

import re


def clean_ocr_text(raw_text: str) -> str:
    """
    Normalize and sanitize raw OCR text for downstream NLP processing.

    Cleaning Pipeline:
      1. Strip outermost leading/trailing whitespace.
      2. Remove standard OCR artefact characters (| ~ ^ `) while preserving 
         mathematical operators and standard punctuation.
      3. Collapse multiple consecutive horizontal spaces.
      4. Normalize excessive newline gaps (3+) into standard paragraph breaks.
      5. Final strip to validate boundaries.

    Args:
        raw_text (str): The unprocessed string returned by the OCR engine.

    Returns:
        str: A clean, normalized string ready for embedding or LLM evaluation.
    """
    if not raw_text:
        return ""

    text = raw_text.strip()

    # Remove OCR artefact characters; preserve punctuation and math symbols
    text = re.sub(r"[|~^`]", "", text)

    # Collapse multiple spaces within a line into a single space
    text = re.sub(r"[^\S\n]+", " ", text)

    # Collapse 3+ consecutive newlines into a standard paragraph break (two newlines)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()