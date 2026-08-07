from langchain_core.documents import Document
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
import os
from dotenv import load_dotenv
from tools.get_models import get_hf_embedding_model

# Load .env
load_dotenv(override=True)

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

print("Index Name:", repr(INDEX_NAME))
print("API Key Loaded:", PINECONE_API_KEY is not None)

pc = Pinecone(api_key=PINECONE_API_KEY)

print("Available Indexes:")
print(pc.list_indexes())

index = pc.Index(INDEX_NAME)

# Cached Vector Store
_vector_store = None


def get_vector_store():
    global _vector_store

    if _vector_store is None:

        print("Loading HuggingFace Embedding Model...")

        embedding = get_hf_embedding_model()

        print("Creating Pinecone Vector Store...")

        _vector_store = PineconeVectorStore(
            index=index,
            embedding=embedding,
        )

        print("Vector Store Ready.")

    return _vector_store


# ==========================================================
# Store Teacher Notes / Answer Keys
# ==========================================================

def store_teacher_chunks(
    chunks,
    question_id,
    content_type,
    subject,
    exam_id,
    NAMESPACE,
):

    vector_store = get_vector_store()

    docs = []

    for chunk in chunks:

        metadata = {
            "type": content_type,
            "subject": subject.lower(),
            "exam_id": exam_id,
            "text": chunk
        }

        if question_id is not None:
            metadata["question_id"] = str(question_id)

        doc = Document(
            page_content=chunk,
            metadata=metadata
        )

        docs.append(doc)

    if docs:

        vector_store.add_documents(
            docs,
            namespace=NAMESPACE
        )

        print(
            f"✅ Successfully stored {len(docs)} chunks in namespace: {NAMESPACE}"
        )

    else:

        print("⚠️ No chunks were provided.")


# ==========================================================
# Retrieve Relevant Chunks
# ==========================================================

def retrieve_relevant_chunks(
    question_text,
    namespace,
    exam_id,
    question_id,
    content_type,
    top_k=3
):

    vector_store = get_vector_store()

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