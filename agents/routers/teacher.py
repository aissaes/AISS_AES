from fastapi import APIRouter, HTTPException

from schemas.teacher_key_upload import TeacherUploadRequest 

from agents.teacher_upload import upload_app as teacher_upload

router = APIRouter(
    prefix="/teacher",
    tags=["Teacher Operations"]
)

@router.post(
    "/upload", 
    summary="Upload and Vectorize Teacher Materials",
    description="Processes Teacher Notes/Keys, chunks them dynamically, and stores them in Pinecone."
)
async def upload_teacher_data(request: TeacherUploadRequest):
    try:
        # Pydantic v2 uses model_dump() instead of dict()
        initial_state = request.model_dump()
        # Convert HttpUrl object back to a standard string for LangGraph
        initial_state["raw_input"] = str(initial_state["raw_input"])
        
        final_state = teacher_upload.invoke(initial_state)
        
        return {
            "status": "success",
            "message": final_state.get("upload_status", "Upload complete.")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))