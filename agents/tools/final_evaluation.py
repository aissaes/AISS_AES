from tools.VectorDB_operations import retrieve_relevant_notes_langchain,vector_store
from tools.prompt import eval_prompt
from tools.get_models import get_gemini



def grade_student_submission(question, student_text, namespace):
    # 1. Retrieve notes (your existing function)
    notes = retrieve_relevant_notes_langchain(question, namespace=namespace, top_k=3)
    context_str = "\n".join(notes)
    
    # 2. Retrieve teacher answer key (using a specific filter)
    # Assuming you store the "key" with a specific metadata type
    key_docs = vector_store.as_retriever(
        search_kwargs={"k": 1, "namespace": namespace, "filter": {"type": "answer_key"}}
    ).invoke(question)
    answer_key_str = key_docs[0].page_content if key_docs else "No key provided."

    # 3. Run the LLM
    llm=get_gemini() 
    chain = eval_prompt | llm
    
    response = chain.invoke({
        "answer_key": answer_key_str,
        "context_notes": context_str,
        "student_answer": student_text
    })
    
    return response.content

# Example usage:
student_ans = "Photosynthesis is how plants make food using sun and water."
grading_result = grade_student_submission("What is photosynthesis?", student_ans, "midterm_2024")
print(grading_result)