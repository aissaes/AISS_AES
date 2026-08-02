from fastapi import APIRouter, HTTPException
import traceback

from schemas.student_answer_evaluate import StudentEvaluateRequest

from agents.agents import app as evaluation_graph

router = APIRouter(
    prefix="/student",
    tags=["Student Evaluation"]
)

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