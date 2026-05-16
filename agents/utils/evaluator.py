"""
utils/evaluator.py

The Evaluation Agent — the core LLM-powered grading component.

Responsibilities:
  - Define GradingResult: a typed Pydantic schema for structured LLM output.
  - grade_student_answer() — sends a carefully engineered prompt to Gemini
    Flash and returns a GradingResult dict containing score, internal
    reasoning, and student-facing feedback.

Why .with_structured_output()?
  LangChain's structured-output binding forces the LLM to return a response
  that matches our Pydantic schema exactly, eliminating free-form JSON
  parsing errors and giving us typed, validated results every time.

Dependencies:
  pip install langchain-google-genai pydantic
"""

import os
import time

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Load environment variables (safe to call multiple times)
# ---------------------------------------------------------------------------
load_dotenv()

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    raise EnvironmentError(
        "GEMINI_API_KEY is not set. Add it to your .env file in the agents/ directory."
    )


# ---------------------------------------------------------------------------
# Pydantic schema — the contract between the LLM and our application
# ---------------------------------------------------------------------------

class GradingResult(BaseModel):
    """
    Structured output schema returned by the Gemini grading agent.

    Fields:
        score    : Numeric grade awarded, between 0 and max_marks (inclusive).
                   Can be a float to allow half-mark granularity.
        reasoning: The model's internal chain-of-thought explaining how it
                   compared the student answer to the reference context and
                   arrived at the score. NOT shown to the student.
        feedback : A concise, encouraging, student-facing explanation of what
                   was answered well and what was missing. Shown to the student.
    """

    score: float = Field(
        description=(
            "Numeric score awarded to the student. Must be >= 0 and <= max_marks."
        )
    )
    reasoning: str = Field(
        description=(
            "Internal step-by-step reasoning used to derive the score. "
            "Compare the student answer point-by-point against the reference context. "
            "This field is for audit/logging purposes only — NOT shown to the student."
        )
    )
    feedback: str = Field(
        description=(
            "Concise, constructive, student-facing feedback (2–4 sentences). "
            "Highlight what the student got right, identify the key gaps, "
            "and suggest how they could improve. Use encouraging language."
        )
    )


# ---------------------------------------------------------------------------
# LLM initialisation
#
# Primary  : gemini-2.0-flash       — fast, accurate, ideal for grading.
# Fallback : gemini-2.0-flash-lite  — lighter model, separate quota bucket,
#            used automatically if the primary hits its daily free-tier limit.
# ---------------------------------------------------------------------------
_PRIMARY_MODEL = "gemini-2.5-flash"
_FALLBACK_MODEL = "gemini-pro"

def _build_grader(model_name: str):
    """Construct a grader chain bound to GradingResult for the given model."""
    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=GEMINI_API_KEY,
        temperature=0.2,
    )
    return llm.with_structured_output(GradingResult)

_grader = _build_grader(_PRIMARY_MODEL)


# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

_PROMPT_TEMPLATE = """\
You are a strict but fair professor grading a student's written exam answer.
Your task is to evaluate the student's response against the provided reference context
(which contains the marking rubric or authoritative notes for this question).

=== EXAM QUESTION ===
{question_text}

=== REFERENCE CONTEXT (Rubric / Marking Scheme) ===
{reference_context}

=== STUDENT ANSWER ===
{student_text}

=== GRADING INSTRUCTIONS ===
1. Compare the student's answer point-by-point against the reference context.
2. Award marks ONLY for correct, substantiated statements that align with the reference.
3. Do NOT award marks for vague, incorrect, or irrelevant statements.
4. The maximum marks for this question is {max_marks}.
5. Your awarded score MUST be between 0 and {max_marks} (inclusive). Fractions (e.g. 7.5) are allowed.
6. Populate the 'reasoning' field with your internal, step-by-step evaluation logic.
7. Populate the 'feedback' field with a concise, encouraging message the student will read.
   - Acknowledge what they did well.
   - Clearly identify the key gaps or errors.
   - Keep it constructive and 2–4 sentences maximum.

Now grade the student's answer.
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def grade_student_answer(
    question_text: str,
    student_text: str,
    reference_context: str,
    max_marks: int,
) -> dict:
    """
    Grade a student's answer using Gemini Flash with structured output.

    The function formats a detailed grading prompt, sends it to the LLM,
    and returns the validated GradingResult as a plain Python dict so it
    can be serialised to JSON, stored in a database, or sent over an API.

    Args:
        question_text      : The full text of the exam question.
        student_text       : The cleaned student answer (post-OCR processing).
        reference_context  : Rubric/reference text retrieved from Pinecone.
        max_marks          : Maximum marks available for this question.

    Returns:
        A dict with keys: "score" (float), "reasoning" (str), "feedback" (str).

    Raises:
        RuntimeError: If the LLM call fails or returns an unexpected format.

    Example:
        >>> result = grade_student_answer(
        ...     question_text="Describe photosynthesis.",
        ...     student_text="Plants use sunlight to make food.",
        ...     reference_context="...(rubric chunks)...",
        ...     max_marks=10,
        ... )
        >>> print(result["score"])
        3.5
    """
    print("[evaluator] Formatting grading prompt...")

    prompt = _PROMPT_TEMPLATE.format(
        question_text=question_text,
        reference_context=reference_context,
        student_text=student_text,
        max_marks=max_marks,
    )

    print("[evaluator] Invoking Gemini Flash grading agent...")

    # Retry up to 3 times with exponential back-off to handle free-tier
    # 429 RESOURCE_EXHAUSTED errors (Gemini rate-limit per minute / per day).
    # On a per-day quota exhaustion, automatically switch to the fallback model.
    _max_retries = 3
    _wait_seconds = 35  # Start at 35 s (Gemini hints ~30–60 s retry delay)
    _active_grader = _grader
    _active_model = _PRIMARY_MODEL

    for attempt in range(1, _max_retries + 1):
        try:
            # _active_grader returns a GradingResult Pydantic model instance
            result: GradingResult = _active_grader.invoke(prompt)
            break  # Success — exit the retry loop
        except Exception as exc:
            error_msg = str(exc)
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                # If daily quota is exhausted (limit: 0), switch to fallback model
                if "limit: 0" in error_msg and _active_model == _PRIMARY_MODEL:
                    print(
                        f"[evaluator] Daily quota exhausted for '{_active_model}'. "
                        f"Switching to fallback model '{_FALLBACK_MODEL}'..."
                    )
                    _active_model = _FALLBACK_MODEL
                    _active_grader = _build_grader(_FALLBACK_MODEL)
                    # No sleep needed — this is a model switch, not a rate limit
                    continue
                if attempt < _max_retries:
                    print(
                        f"[evaluator] Rate-limited (429). "
                        f"Waiting {_wait_seconds}s before retry "
                        f"({attempt}/{_max_retries - 1})..."
                    )
                    time.sleep(_wait_seconds)
                    _wait_seconds *= 2  # Exponential back-off
                else:
                    raise RuntimeError(
                        f"Gemini rate limit hit after {_max_retries} attempts on "
                        f"both '{_PRIMARY_MODEL}' and '{_FALLBACK_MODEL}'. "
                        "Wait a few minutes and retry, or upgrade your API quota."
                    ) from exc
            else:
                # Non-rate-limit error — re-raise immediately
                raise

    print(f"[evaluator] Grading complete. Score: {result.score}/{max_marks}")

    # Convert to plain dict for portability (JSON-serialisable)
    return result.model_dump()
