from langchain_core.prompts import ChatPromptTemplate

eval_prompt = ChatPromptTemplate.from_template("""
You are an expert academic evaluator. Your task is to grade a student's answer based on the provided Teacher's Answer Key and additional Contextual Notes.

### TEACHER'S ANSWER KEY:
{answer_key}

### CONTEXTUAL NOTES:
{context_notes}

### STUDENT'S ANSWER:
{student_answer}

### EVALUATION CRITERIA:
1. Accuracy: Does the answer align with the Teacher's Key?
2. Completeness: Does the student use relevant details found in the Contextual Notes?
3. Clarity: Is the explanation easy to understand?

### OUTPUT FORMAT:
- Score: [0 to 10]
- Strengths: [What they got right]
- Weaknesses: [What was missing or incorrect]
- Corrective Feedback: [How to improve]
""")


recheck_prompt = ChatPromptTemplate.from_template("""
You are an expert exam evaluation auditor.

Question:
{question}

Teacher Answer Key:
{teacher_key}

Reference Notes:
{context_notes}

Student Answer:
{student_answer}

Evaluation Given:
{evaluation}

Check whether the evaluation is accurate and fair.

Verify:
1. Did the evaluator miss any correct points?
2. Did it award incorrect marks?
3. Is the feedback logically correct?
4. Is the grading consistent with the answer key?

Respond ONLY in this format:

STATUS: APPROVED

OR

STATUS: REVISION NEEDED
FEEDBACK: detailed correction instructions for evaluator
""")