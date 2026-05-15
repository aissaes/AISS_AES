"""
main.py

Entry point for the AISS AES FastAPI microservice.

Responsibilities:
  - Boot the FastAPI application.
  - Load environment variables via python-dotenv.
  - Expose the POST /evaluate endpoint that:
      1. Accepts an EvaluationRequest (image_url + question_id).
      2. Delegates OCR to the ocr_service.
      3. Returns the extracted text wrapped in an EvaluationResponse.

Start the server with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from dotenv import load_dotenv

# Load .env as early as possible — before any service module is imported —
# so that os.getenv() calls inside those modules see the populated env vars.
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import EvaluationRequest, EvaluationResponse
from services.ocr_service import extract_text_ocrspace

# ---------------------------------------------------------------------------
# Application Initialisation
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AISS AES — AI Evaluation Service",
    description=(
        "Agentic AI-Based Evaluation System microservice. "
        "Accepts a public image URL, performs OCR via Google Cloud Vision, "
        "and returns the extracted handwritten text for downstream grading."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS Middleware
# Allow the Node.js backend (running on a different port) to call this service.
# Tighten `allow_origins` to your actual frontend/backend domain in production.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Replace "*" with your Node.js server URL in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
def health_check() -> dict:
    """
    Simple liveness probe.
    Returns 200 OK so load balancers / orchestrators can verify the service is up.
    """
    return {"status": "ok", "service": "AISS AES Agent"}


# ---------------------------------------------------------------------------
# Core Endpoint — /evaluate
# ---------------------------------------------------------------------------
@app.post(
    "/evaluate",
    response_model=EvaluationResponse,
    summary="Extract handwritten text from an answer-sheet image",
    tags=["Evaluation"],
)
def evaluate(request: EvaluationRequest) -> EvaluationResponse:
    """
    **POST /evaluate**

    Accepts a JSON body with:
    - `image_url`  — Public URL of the student's handwritten answer image.
    - `question_id`— Identifier for the question being evaluated.

    Returns the OCR-extracted text wrapped in an `EvaluationResponse`.

    ### Example Request
    ```json
    {
        "image_url": "https://ik.imagekit.io/your_id/answer.jpg",
        "question_id": "Q1_2024_CS101"
    }
    ```

    ### Example Response
    ```json
    {
        "question_id": "Q1_2024_CS101",
        "extracted_text": "The water cycle consists of evaporation..."
    }
    ```
    """
    try:
        # Delegate all OCR logic to the dedicated service module
        extracted_text: str = extract_text_ocrspace(request.image_url)

    except ValueError as exc:
        # 422 — bad input or no text found (client-side issue)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    except RuntimeError as exc:
        # 502 — upstream failure (image download or Vision API)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return EvaluationResponse(
        question_id=request.question_id,
        extracted_text=extracted_text,
    )
