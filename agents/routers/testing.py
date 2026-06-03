from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from tools.readers import OCR_image_to_text
from tools.get_models import get_groq, get_gemini

router = APIRouter(
    prefix="/testing",
    tags=["Sandbox Operations"]
)

class SandboxTestRequest(BaseModel):
    action: str  # "ocr" or "evaluate-text"
    file_url: Optional[str] = None
    studentAnswer: Optional[str] = None
    answerKey: Optional[str] = None
    contextNotes: Optional[str] = ""
    maxMarks: Optional[float] = 10.0

@router.post("/test")
async def sandbox_test(request: SandboxTestRequest):
    if request.action == "ocr":
        if not request.file_url:
            raise HTTPException(status_code=400, detail="file_url is required for ocr action")
        try:
            extracted_text = OCR_image_to_text(str(request.file_url))
            return {
                "success": True,
                "extractedText": extracted_text
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
            
    elif request.action == "evaluate-text":
        if not request.studentAnswer or not request.answerKey:
            raise HTTPException(status_code=400, detail="studentAnswer and answerKey are required for evaluate-text action")
        
        prompt = f"""You are an expert academic evaluator. Your task is to grade a student's answer based on the provided Teacher's Answer Key and additional Contextual Notes.

### TEACHER'S ANSWER KEY:
{request.answerKey}

### CONTEXTUAL NOTES:
{request.contextNotes or "None"}

### STUDENT'S ANSWER:
{request.studentAnswer}

### EVALUATION CRITERIA:
1. Accuracy: Does the answer align with the Teacher's Key?
2. Completeness: Does the student use relevant details found in the Contextual Notes?
3. Clarity: Is the explanation easy to understand?

### OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON object. 

{{
  "score": <number from 0 to {request.maxMarks}>,
  "reasoning": "<overall evaluation reasoning>",
  "strengths": "<what the student got right>",
  "weaknesses": "<what was missing, incorrect, or unclear>",
  "feedback": "<corrective feedback and suggestions for improvement>"
}}"""

        # Try Groq first
        try:
            llm = get_groq()
            response = llm.invoke(prompt)
            return {
                "success": True,
                "evaluation": response.content
            }
        except Exception as groq_err:
            print("Groq evaluation failed, trying Gemini:", str(groq_err))
            try:
                llm = get_gemini()
                response = llm.invoke(prompt)
                return {
                    "success": True,
                    "evaluation": response.content
                }
            except Exception as gemini_err:
                raise HTTPException(
                    status_code=500,
                    detail=f"Both Groq and Gemini calls failed. last error: {str(gemini_err)}"
                )
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action type: {request.action}")
