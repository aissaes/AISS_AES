from langchain_core.documents import Document
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
import os
from dotenv import load_dotenv
from tools.get_models import get_gradelm_embedding_model

embedding = get_gradelm_embedding_model()


PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "aiss-aes-index")


# PINECONE INITIALIZATION
pc = Pinecone(api_key=PINECONE_API_KEY)


index = pc.Index(INDEX_NAME)
vector_store = PineconeVectorStore(
    index=index,
    embedding=embedding,
)



#storing teacher notes and answer keys in vectorDB
def store_teacher_chunks(chunks, question_id, content_type, subject, exam_id, NAMESPACE):
    docs = []
    
    for chunk in chunks:
        # We wrap the chunk in a Document object
        metadata = {
            "type": content_type,
            "subject": subject.lower(),
            "exam_id": exam_id,
            "text": chunk
        }

        # Add question number only for answer keys
        if question_id is not None:
            metadata["question_id"] = str(question_id)

        doc = Document(
            page_content=chunk,
            metadata=metadata
        )
        docs.append(doc)

    # FIXED: This must be OUTSIDE the for loop to send everything in one batch
    if docs:
        vector_store.add_documents(docs, namespace=NAMESPACE)
        print(f"✅ Successfully stored {len(docs)} chunks in namespace: {NAMESPACE}")
    else:
        print("⚠️ No chunks were provided.")


#retrive relavant notes for a question from vectorDB
def retrieve_relevant_chunks(question_text, namespace, exam_id, question_id, content_type,top_k=3):
    """
    Fetches ONLY the notes related to a specific question within a specific exam.
    """
    # Define strict filters to prevent 'data leakage' from other sheets
    strict_filter = {
        "exam_id": {"$eq": exam_id},
        "type": {"$eq": content_type}
    }
    
    if content_type == "answer_key" and question_id:
        strict_filter["question_id"] = {"$eq": str(question_id)}

    retriever = vector_store.as_retriever(
        search_kwargs={
            "namespace": namespace,
            "k": top_k,
            "filter": strict_filter
        }
    )

    docs = retriever.invoke(question_text)
    return [doc.page_content for doc in docs]