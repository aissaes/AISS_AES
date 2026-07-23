from langchain_core.documents import Document
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
import os
import hashlib
from dotenv import load_dotenv
from tools.get_models import get_gemini_embedding_model

embedding = get_gemini_embedding_model()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "aiss-aes-index")


# PINECONE INITIALIZATION
pc = Pinecone(api_key=PINECONE_API_KEY)


index = pc.Index(INDEX_NAME)
vector_store = PineconeVectorStore(
    index=index,
    embedding=embedding,
)


def check_duplicate_exists(namespace, content_hash):
    try:
        stats = index.describe_index_stats()
        dimension = stats.get("dimension", 768)
        dummy_vector = [0.0] * dimension
        res = index.query(
            namespace=namespace,
            vector=dummy_vector,
            filter={"content_hash": {"$eq": content_hash}},
            top_k=1
        )
        if res and res.get("matches"):
            return True
    except Exception as e:
        print(f"Error checking duplicate in Pinecone: {e}")
    return False


#storing teacher notes and answer keys in vectorDB
def store_teacher_chunks(chunks, question_id, content_type, subject, exam_id, NAMESPACE, material_id, course_id, faculty_id):
    docs = []
    
    for chunk in chunks:
        # Calculate SHA-256 hash of the content
        content_hash = hashlib.sha256(chunk.encode("utf-8")).hexdigest()
        
        # Deduplication check
        if check_duplicate_exists(NAMESPACE, content_hash):
            print(f"⏩ Skipping duplicate chunk with hash {content_hash}")
            continue

        # We wrap the chunk in a Document object
        metadata = {
            "material_id": str(material_id),
            "course_id": str(course_id),
            "college_id": str(NAMESPACE),
            "exam_id": str(exam_id) if exam_id else "course_wide",
            "faculty_id": str(faculty_id),
            "type": content_type,
            "subject": subject.lower(),
            "status": "active",
            "text": chunk,
            "content_hash": content_hash
        }

        # Add question number for answer keys or rubrics
        if content_type in ["answer_key", "rubric"]:
            metadata["question_id"] = str(question_id) if question_id else "entire_exam"
        elif question_id is not None:
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
        print("⚠️ No new chunks were stored (all duplicates or empty).")


# delete chunks belonging to a specific material ID
def delete_material_chunks(namespace, material_id):
    try:
        index.delete(filter={"material_id": {"$eq": str(material_id)}}, namespace=namespace)
        print(f"✅ Successfully deleted vectors for material_id: {material_id} in namespace: {namespace}")
        return True
    except Exception as e:
        print(f"❌ Failed to delete vectors for material_id {material_id}: {e}")
        return False


# delete all vectors in a specific namespace
def delete_namespace_vectors(namespace):
    try:
        index.delete(delete_all=True, namespace=namespace)
        print(f"✅ Successfully deleted all vectors in namespace: {namespace}")
        return True
    except Exception as e:
        print(f"❌ Failed to delete vectors in namespace {namespace}: {e}")
        return False


#retrive relavant notes for a question from vectorDB
def retrieve_relevant_chunks(question_text, namespace, course_id, exam_id, question_id, content_type, top_k=3):
    """
    Fetches active notes or keys within a course or exam.
    """
    # Define strict filters to prevent 'data leakage' from other courses/status
    strict_filter = {
        "course_id": {"$eq": str(course_id)},
        "college_id": {"$eq": str(namespace)},
        "status": {"$eq": "active"},
        "type": {"$eq": content_type}
    }
    
    # For assessment keys or rubrics, also isolate by exam_id
    if content_type in ["answer_key", "rubric"]:
        if exam_id:
            strict_filter["exam_id"] = {"$eq": str(exam_id)}
        if question_id and content_type != "rubric":
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
