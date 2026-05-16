"""
services/ocr_agent.py

External integration service for the OCR Agent.

This module handles API communications with OCR.space to extract raw text 
from student answer sheet images hosted via public URLs (e.g., AWS S3).
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv(override=True)

OCR_SPACE_API_KEY: str = os.getenv("OCR_SPACE_API_KEY", "").strip()
OCR_SPACE_API_URL: str = "https://api.ocr.space/parse/imageurl"


def extract_text_ocrspace(image_url: str) -> str:
    """
    Transmits an image URL to the OCR.space API for handwriting extraction.

    Args:
        image_url (str): A publicly accessible URL to the student's scanned answer.

    Returns:
        str: The raw extracted text from the image.

    Raises:
        ValueError: If the API key is missing or the API returns no text.
        RuntimeError: If the API request fails or rejects the image.
    """
    if not OCR_SPACE_API_KEY:
        raise ValueError("OCR_SPACE_API_KEY is missing or empty in .env file.")

    # Engine 2 is optimized for handwriting recognition
    params = {
        "apikey": OCR_SPACE_API_KEY,
        "url": image_url,
        "OCREngine": "2" 
    }

    try:
        response = requests.get(OCR_SPACE_API_URL, params=params, timeout=30)
        response.raise_for_status()
        result: dict = response.json()

        if result.get("IsErroredOnProcessing"):
            error_msg = result.get("ErrorMessage", ["Unknown error"])[0]
            raise RuntimeError(f"OCR.space processing error: {error_msg}")

        parsed_results = result.get("ParsedResults", [])
        if not parsed_results:
            raise ValueError("OCR.space returned no extraction results.")

        extracted_text = "\n".join(
            res.get("ParsedText", "") for res in parsed_results if res.get("ParsedText")
        ).strip()

        if not extracted_text:
            raise ValueError("No readable text was found in the provided image.")

        return extracted_text

    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"Failed to connect to OCR.space API: {exc}") from exc