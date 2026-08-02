import os
import json
import torch
import gradio as gr
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from sentence_transformers import SentenceTransformer

# Model Configuration
MODEL_ID = os.getenv("GRADELM_MODEL_ID", "Qwen/Qwen2.5-0.5B-Instruct")
EMBEDDING_MODEL_ID = os.getenv("GRADELM_EMBEDDING_MODEL_ID", "sentence-transformers/all-MiniLM-L6-v2")

print(f"Loading GradeLM LLM model: {MODEL_ID}...")
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map="auto" if torch.cuda.is_available() else None,
        trust_remote_code=True
    )
    pipe = pipeline("text-generation", model=model, tokenizer=tokenizer)
    print("GradeLM LLM loaded successfully.")
except Exception as e:
    print(f"Warning loading LLM model: {e}")
    pipe = None

print(f"Loading GradeLM Embedding model: {EMBEDDING_MODEL_ID}...")
try:
    embedder = SentenceTransformer(EMBEDDING_MODEL_ID)
    print("GradeLM Embedding model loaded successfully.")
except Exception as e:
    print(f"Warning loading Embedding model: {e}")
    embedder = None


def run_evaluation(
    question: str,
    answer_key: str,
    context_notes: str,
    student_answer: str,
    max_marks: float = 10.0,
    recheck_feedback: str = ""
) -> str:
    if not pipe:
        return "GradeLM model pipeline not initialized."

    prompt = f"""You are GradeLM, an expert automated academic evaluator. Your task is to evaluate a student's answer based on the provided Teacher's Answer Key and Contextual Notes.

### QUESTION:
{question}

### TEACHER'S ANSWER KEY:
{answer_key}

### CONTEXTUAL NOTES:
{context_notes or 'None'}

### STUDENT'S ANSWER:
{student_answer}

{f'### RECHECK FEEDBACK TO ADDRESS: {recheck_feedback}' if recheck_feedback else ''}

### EVALUATION INSTRUCTIONS:
Evaluate accuracy, completeness, and clarity against the answer key. Provide awarded marks out of {max_marks} and constructive feedback.

Provide your output as a clear structured text response containing:
- Marks Awarded (out of {max_marks})
- Strengths
- Weaknesses / Missing Points
- Final Grade / Feedback Summary
"""

    messages = [
        {"role": "system", "content": "You are GradeLM, an expert academic answer evaluator."},
        {"role": "user", "content": prompt}
    ]

    try:
        if hasattr(tokenizer, "apply_chat_template"):
            formatted_prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        else:
            formatted_prompt = prompt

        outputs = pipe(
            formatted_prompt,
            max_new_tokens=512,
            do_sample=True,
            temperature=0.1,
            top_p=0.9
        )
        generated = outputs[0]["generated_text"]
        if isinstance(generated, str) and formatted_prompt in generated:
            generated = generated.replace(formatted_prompt, "").strip()
        return str(generated)
    except Exception as err:
        return f"Evaluation Error: {str(err)}"


def run_embeddings(text: str) -> List[float]:
    if not embedder:
        return []
    embeddings = embedder.encode(text)
    return embeddings.tolist()


# Gradio Interface
demo = gr.Interface(
    fn=run_evaluation,
    inputs=[
        gr.Textbox(label="Question", lines=2, value="What is a Deadlock in OS?"),
        gr.Textbox(label="Teacher Answer Key", lines=3, value="A deadlock is a set of processes blocked because each process holds a resource and waits for another resource held by another process."),
        gr.Textbox(label="Context Notes", lines=3, value="Four necessary conditions: Mutual exclusion, Hold and wait, No preemption, Circular wait."),
        gr.Textbox(label="Student Answer", lines=3, value="Deadlock occurs when processes wait endlessly for resources held by each other."),
        gr.Number(label="Max Marks", value=10.0),
        gr.Textbox(label="Recheck Feedback", lines=2, value="")
    ],
    outputs=gr.Textbox(label="GradeLM Evaluation Output", lines=10),
    title="🎓 GradeLM Evaluation Microservice",
    description="Hugging Face Space backend for GradeLM automated essay & answer scoring."
)

# Create FastAPI app and mount Gradio
app = FastAPI(title="GradeLM Space API")

class EvaluateRequest(BaseModel):
    question: str
    answer_key: str
    context_notes: Optional[str] = ""
    student_answer: str
    max_marks: Optional[float] = 10.0
    recheck_feedback: Optional[str] = ""

class EmbedRequest(BaseModel):
    text: str

@app.post("/evaluate")
def api_evaluate(req: EvaluateRequest):
    result = run_evaluation(
        req.question,
        req.answer_key,
        req.context_notes or "",
        req.student_answer,
        req.max_marks or 10.0,
        req.recheck_feedback or ""
    )
    return {"status": "success", "evaluation": result}

@app.post("/embed")
def api_embed(req: EmbedRequest):
    vector = run_embeddings(req.text)
    return {"status": "success", "embedding": vector}

app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
