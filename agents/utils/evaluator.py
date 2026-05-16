"""
utils/evaluator.py

The Evaluation Agent (Core Grading Logic).

This module serves as the primary evaluation node within the multi-agent system.
It utilizes Google's Gemini generative models via LangChain to compare student 
responses against retrieved reference contexts. 

Crucially, it employs strict structured output binding (Pydantic) to ensure 
the LLM returns a predictable, serialized JSON schema containing the final score, 
internal reasoning logic, and formatted student feedback.
"""

import os
import time

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Environment Setup
# ---------------------------------------------------------------------------
load_dotenv()

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    raise EnvironmentError("GEMINI_API_KEY is not set in the environment.")

# ---------------------------------------------------------------------------
# Pydantic Schema: LLM Output Contract
# ---------------------------------------------------------------------------
class GradingResult(BaseModel):
    """
    Structured output schema returned by the Evaluation Agent.
    """
    score: float = Field(
        description="Numeric score awarded to the student. Must be >= 0 and <= max_marks."
    )
    reasoning: str = Field(
        description=(
            "Internal step-by-step reasoning used to derive the score. "
            "Compare the student answer point-by-point against the reference context. "
            "Used for audit logging — NOT shown to the student."
        )
    )
    feedback: str = Field(
        description=(
            "Concise, constructive, student-facing feedback (2–4 sentences). "
            "Highlight strengths, identify key gaps, and suggest improvements."
        )
    )

# ---------------------------------------------------------------------------
# Model Configuration & Initialization
# ---------------------------------------------------------------------------
_PRIMARY_MODEL = "gemini-2.5-flash"
_FALLBACK_MODEL = "gemini-pro"

def _build_grader(model_name: str):
    """Constructs a LangChain grader bound to the GradingResult schema."""
    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=GEMINI_API_KEY,
        temperature=0.2,
    )
    return llm.with_structured_output(GradingResult)

_grader = _build_grader(_PRIMARY_MODEL)

# ---------------------------------------------------------------------------
# Evaluation Prompt Template
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
    Evaluates a student answer using Gemini structured output.

    Args:
        question_text (str): The text of the exam question.
        student_text (str): The cleaned text of the student's answer.
        reference_context (str): The reference rubric retrieved from the vector store.
        max_marks (int): Maximum allowable points.

    Returns:
        dict: Serialized GradingResult containing score, reasoning, and feedback.
    """
    print("[evaluator] Formatting grading prompt...")
    prompt = _PROMPT_TEMPLATE.format(
        question_text=question_text,
        reference_context=reference_context,
        student_text=student_text,
        max_marks=max_marks,
    )

    print("[evaluator] Invoking Evaluation Agent...")

    _max_retries = 3
    _wait_seconds = 35
    _active_grader = _grader
    _active_model = _PRIMARY_MODEL

    for attempt in range(1, _max_retries + 1):
        try:
            result: GradingResult = _active_grader.invoke(prompt)
            break
        except Exception as exc:
            error_msg = str(exc)
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                if "limit: 0" in error_msg and _active_model == _PRIMARY_MODEL:
                    print(f"[evaluator] Quota exhausted for '{_active_model}'. Switching to fallback '{_FALLBACK_MODEL}'...")
                    _active_model = _FALLBACK_MODEL
                    _active_grader = _build_grader(_FALLBACK_MODEL)
                    continue
                if attempt < _max_retries:
                    print(f"[evaluator] API rate limit encountered. Retrying in {_wait_seconds}s ({attempt}/{_max_retries - 1})...")
                    time.sleep(_wait_seconds)
                    _wait_seconds *= 2
                else:
                    raise RuntimeError(f"API rate limit exceeded after {_max_retries} attempts.") from exc
            else:
                raise

    print(f"[evaluator] Grading complete. Score: {result.score}/{max_marks}")
    return result.model_dump()