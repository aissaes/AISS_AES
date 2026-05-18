from langchain_core.documents import Document
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
import os
from dotenv import load_dotenv
from tools.get_models import get_hf_embedding_model

embedding = get_hf_embedding_model()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "aiss-aes-index")


# PINECONE INITIALIZATION
pc = Pinecone(api_key=PINECONE_API_KEY)


index = pc.Index(INDEX_NAME)
vector_store = PineconeVectorStore(
    index=index,
    embedding=embedding,
)

print("Pinecone vector store initialized successfully.")


#storing teacher notes and answer keys in vectorDB
def store_teacher_chunks(chunks, question_no, content_type, subject, exam_id, NAMESPACE):
    docs = []
    
    for chunk in chunks:
        # We wrap the chunk in a Document object
        doc = Document(
            page_content=chunk,
            metadata={
                "type": content_type,     # 'notes' or 'answer_key'
                "subject": subject.lower(),
                "question_no": int(question_no), # Ensure this is an int for strict filtering
                "exam_id": exam_id,
                "text": chunk             # Some LangChain versions require the text in metadata
            }
        )
        docs.append(doc)

    # FIXED: This must be OUTSIDE the for loop to send everything in one batch
    if docs:
        vector_store.add_documents(docs, namespace=NAMESPACE)
        print(f"✅ Successfully stored {len(docs)} chunks in namespace: {NAMESPACE}")
    else:
        print("⚠️ No chunks were provided.")


#retrive relavant notes for a question from vectorDB
def retrieve_relevant_chunks(question_text, namespace, exam_id, question_no, content_type,top_k=3):
    """
    Fetches ONLY the notes related to a specific question within a specific exam.
    """
    # Define strict filters to prevent 'data leakage' from other sheets
    strict_filter = {
        "$and": [
            {"exam_id": {"$eq": exam_id}},
            {"question_no": {"$eq": question_no}},
            {"type": {"$eq": content_type}} # Or "answer_key" depending on what you need
        ]
    }

    retriever = vector_store.as_retriever(
        search_kwargs={
            "namespace": namespace,
            "k": top_k,
            "filter": strict_filter
        }
    )

    docs = retriever.invoke(question_text)
    print(docs)
    return [doc.page_content for doc in docs]