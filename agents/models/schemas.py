"""
models/schemas.py

Pydantic models for request/response validation in the AISS AES FastAPI service.
"""

from pydantic import BaseModel, HttpUrl


class EvaluationRequest(BaseModel):
    """
    Request body schema for the /evaluate endpoint.

    Attributes:
        image_url  : Publicly accessible URL of the student's handwritten answer image
                     (hosted on ImageKit or any CDN).
        question_id: Unique identifier for the question being evaluated, used for
                     downstream grading and logging.
    """
    image_url: str          # e.g. "https://ik.imagekit.io/your_id/answer_sheet.jpg"
    question_id: str        # e.g. "Q1_2024_CS101"


class EvaluationResponse(BaseModel):
    """
    Response body schema returned by the /evaluate endpoint.

    Attributes:
        question_id   : Echoed back so the caller can correlate the response.
        extracted_text: The raw text extracted from the handwritten image via OCR.
    """
    question_id: str
    extracted_text: str
