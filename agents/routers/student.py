import os
import requests
import traceback
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from tools.auth import verify_api_key

from schemas.student_answer_evaluate import StudentEvaluateRequest, StudentEvaluateAsyncRequest
from agents.agents import app as evaluation_graph

router = APIRouter(
    prefix="/student",
    tags=["Student Evaluation"],
    dependencies=[Depends(verify_api_key)]
)

def run_evaluation_job_task(
    student_id: str,
    exam_id: str,
    course_id: str,
    namespace: str,
    webhook_url: str,
    questions: list
):
    results = []
    for q in questions:
        try:
            initial_state = {
                "raw_input": str(q.raw_input),
                "question": q.question,
                "max_marks": q.max_marks,
                "exam_id": exam_id,
                "course_id": course_id,
                "namespace": namespace,
                "question_id": q.question_id
            }
            
            final_state = evaluation_graph.invoke(initial_state)
            evaluation_result = final_state.get("evaluation")
            
            if not evaluation_result:
                raise ValueError("Evaluation Agent failed to generate feedback.")
                
            revision_count = final_state.get("revision_count", 0)
            recheck_status = final_state.get("recheck_status", "Approved")
            
            if recheck_status == "Approved":
                if revision_count <= 1:
                    confidence = "High"
                else:
                    confidence = "Medium"
            else:
                confidence = "Low"

            results.append({
                "question_id": q.question_id,
                "status": "success",
                "evaluation": evaluation_result,
                "retrieved_context": final_state.get("context_notes", []),
                "recheck_status": recheck_status,
                "recheck_feedback": final_state.get("recheck_feedback", ""),
                "revision_count": revision_count,
                "recheck_logs": final_state.get("recheck_logs", []),
                "evaluation_confidence": confidence
            })
        except Exception as e:
            traceback.print_exc()
            results.append({
                "question_id": q.question_id,
                "status": "failed",
                "error": str(e)
            })
            
    payload = {
        "student_id": student_id,
        "exam_id": exam_id,
        "results": results
    }
    
    api_key = os.getenv("PYTHON_AGENT_KEY")
    if not api_key:
        print("Error: PYTHON_AGENT_KEY env variable is not configured. Callback aborted.")
        return
    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(webhook_url, json=payload, headers=headers, timeout=30)
        print(f"Callback status for student {student_id}: {response.status_code}")
    except Exception as callback_err:
        print(f"Failed to post evaluation results to webhook: {callback_err}")

@router.post(
    "/evaluate",
    summary="Evaluate a Student Answer",
    description="Evaluates a student's answer using the LangGraph AI grading loop."
)
async def evaluate_student(request: StudentEvaluateRequest):
    try:
        initial_state = request.model_dump()
        initial_state["raw_input"] = str(initial_state["raw_input"])
        
        final_state = evaluation_graph.invoke(initial_state)
        evaluation_result = final_state.get("evaluation")
        
        if not evaluation_result:
            raise ValueError("Evaluation Agent failed to generate feedback.")

        return {
            "status": "success",
            "exam_id": request.exam_id,
            "evaluation": evaluation_result
        }
    except Exception as e:
        # 🚨 THE DEBUG TRAP 🚨
        print("\n" + "="*50)
        print("🚨 FATAL FASTAPI ERROR 🚨")
        print("="*50)
        traceback.print_exc() # This prints the EXACT line of the crash!
        print("="*50 + "\n")
        raise HTTPException(status_code=500, detail=str(e))

@router.post(
    "/evaluate-async",
    summary="Evaluate a Student Answer sheet asynchronously",
    description="Trigger batch evaluation of all student answers in the background and callback the Node backend."
)
async def evaluate_student_async(request: StudentEvaluateAsyncRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        run_evaluation_job_task,
        student_id=request.student_id,
        exam_id=request.exam_id,
        course_id=request.course_id,
        namespace=request.namespace,
        webhook_url=str(request.webhook_url),
        questions=request.questions
    )
    return {
        "status": "queued",
        "message": "Evaluation started in background task."
    }
