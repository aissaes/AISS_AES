# schemas/teacher_key_upload.py
from pydantic import BaseModel, Field, HttpUrl
from typing import Literal,Optional

class TeacherUploadRequest(BaseModel):
    raw_input: HttpUrl = Field(
        ..., 
        title="File URL", 
        description="The ImageKit or AWS S3 URL pointing to the uploaded file.",
        json_schema_extra={"example": "https://ik.imagekit.io/k3p6avtbf/teacher_materials/biology_rubric.pdf"}
    )
    content_type: Literal["notes", "answer_key"] = Field(
        ...,
        title="Content Type",
        description="Allowed values: notes or answer_key",
        json_schema_extra={"example": "answer_key"}
    )
    subject: str = Field(
        ..., 
        min_length=2, 
        max_length=50, 
        title="Subject Name", 
        description="The subject of the exam (e.g., biology, physics).",
        json_schema_extra={"example": "biology"}
    )
    exam_id: str = Field(
        ..., 
        title="Exam Identifier", 
        description="Unique ID for the exam to prevent data leakage.",
        json_schema_extra={"example": "midterm_2024_v3"}
    )
    namespace: str = Field(
        ..., 
        title="Database Namespace", 
        description="The Pinecone namespace, typically the college or organization name.",
        json_schema_extra={"example": "NIT_Raipur"}
    )
    question_id: Optional[str] = Field(
        None,
        title="Question ID",
        description="Required only for answer keys (e.g., S1-Q1).",
        json_schema_extra={"example": "S1-Q1"}
    )