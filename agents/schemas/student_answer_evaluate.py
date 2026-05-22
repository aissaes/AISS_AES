# schemas/student_answer_eval.py
from pydantic import BaseModel, Field, HttpUrl

class StudentEvaluateRequest(BaseModel):
    raw_input: HttpUrl = Field(
        ..., 
        title="Student Answer URL", 
        description="The URL pointing to the student's handwritten answer script.",
        json_schema_extra={"example": "https://ik.imagekit.io/k3p6avtbf/answer_scripts/student_answer.png"}
    )
    question: str = Field(
        ..., 
        min_length=5, 
        max_length=2000,
        title="Question Text", 
        description="The exact text of the question being evaluated.",
        json_schema_extra={"example": "What is photosynthesis?"}
    )
    max_marks: float = Field(
        ..., 
        title="Maximum Marks",
        description="The maximum marks the student can score for this question.",
        json_schema_extra={"example": 5}
    )
    exam_id: str = Field(
        ..., 
        max_length=100,
        title="Exam Identifier", 
        description="Must match the exam_id used during the teacher upload.",
        json_schema_extra={"example": "midterm_2024_v3"}
    )
    namespace: str = Field(
        ..., 
        title="Database Namespace", 
        description="The Pinecone namespace to search within.",
        json_schema_extra={"example": "NIT_Raipur"}
    )
    question_id: str = Field(
        ..., 
        min_length=1,
        title="Question Id",
        description="The specific semantic question ID (e.g., S1-Q1a).",
        json_schema_extra={"example": "S1-Q1"}
    )