"""
utils/text_cleaner.py

Cleans raw OCR output before it is embedded or evaluated.

OCR engines (especially on handwritten text) commonly produce:
  - Repeated blank lines / spurious whitespace
  - Stray artefact characters: |  ~  ^  `  that aren't part of the answer
  - Double-spaces inside sentences

This module exposes a single public function: clean_ocr_text().
"""

import re


def clean_ocr_text(raw_text: str) -> str:
    """
    Normalise and sanitise raw OCR text for downstream processing.

    Cleaning steps (in order):
      1. Strip the outermost leading/trailing whitespace.
      2. Remove OCR hallucination characters: | ~ ^ ` (not math-meaningful
         in a student answer context).  Standard punctuation (. , ; : ! ?),
         math operators (+ - * / = < > % ( ) [ ] { }) and quotes are kept.
      3. Collapse multiple consecutive spaces on a single line → one space.
      4. Collapse runs of 3+ newlines → exactly two newlines (paragraph break).
      5. Collapse runs of 2 newlines → single newline where there is no blank
         line intent (handled by step 4 preserving double newlines as-is).
      6. Final strip.

    Args:
        raw_text: The unprocessed string returned by the OCR engine.

    Returns:
        A clean, normalised string ready for embedding or grading.

    Example:
        >>> dirty = "The   water  cycle  ||\n\n\n\nhas  three^ stages~"
        >>> clean_ocr_text(dirty)
        'The water cycle \n\nhas three stages'
    """

    if not raw_text:
        return ""

    text = raw_text

    # ------------------------------------------------------------------
    # Step 1 — Strip outermost whitespace
    # ------------------------------------------------------------------
    text = text.strip()

    # ------------------------------------------------------------------
    # Step 2 — Remove OCR hallucination / artefact characters
    #
    # Characters removed: | ~ ^ `
    # Characters intentionally kept:
    #   Punctuation : . , ; : ! ? ' " - _
    #   Math symbols: + * / = < > % ( ) [ ] { }
    #   Hyphen/minus is kept because students write "x - y" in equations.
    # ------------------------------------------------------------------
    text = re.sub(r"[|~^`]", "", text)

    # ------------------------------------------------------------------
    # Step 3 — Collapse multiple spaces within a line → single space
    # A "space" here means any horizontal whitespace except newline.
    # ------------------------------------------------------------------
    text = re.sub(r"[^\S\n]+", " ", text)

    # ------------------------------------------------------------------
    # Step 4 — Collapse 3+ consecutive newlines → two newlines
    # This preserves intentional paragraph breaks (blank line between
    # paragraphs) without allowing runaway blank-line gaps.
    # ------------------------------------------------------------------
    text = re.sub(r"\n{3,}", "\n\n", text)

    # ------------------------------------------------------------------
    # Step 5 — Final strip to remove any leading/trailing blank lines
    # that were introduced after the substitutions above.
    # ------------------------------------------------------------------
    text = text.strip()

    return text
