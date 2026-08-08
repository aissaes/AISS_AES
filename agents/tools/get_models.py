from langchain_huggingface import (
    HuggingFaceEndpoint,
    ChatHuggingFace,
)
from langchain_core.embeddings import Embeddings
from huggingface_hub import InferenceClient

# from langchain_google_genai import (
#     ChatGoogleGenerativeAI,
#     GoogleGenerativeAIEmbeddings,
# )

from langchain_groq import ChatGroq

import os
from dotenv import load_dotenv

load_dotenv()


# ==========================================================
# Hugging Face Chat Model
# ==========================================================

def get_hf_model():

    repo_id = "Qwen/Qwen2.5-7B-Instruct"

    llm = HuggingFaceEndpoint(
        repo_id=repo_id,
        temperature=0.1,
        max_new_tokens=512,
        huggingfacehub_api_token=os.getenv("HUGGINGFACE_API_KEY"),
    )

    return ChatHuggingFace(llm=llm)


# ==========================================================
# Hugging Face Embedding Model
# ==========================================================

class HFEmbeddingModel(Embeddings):

    def __init__(self):

        self.client = InferenceClient(
            provider="hf-inference",
            api_key=os.getenv("HUGGINGFACE_API_KEY"),
        )

        self.model = "sentence-transformers/all-MiniLM-L6-v2"

    def embed_documents(self, texts):

        embeddings = []

        for text in texts:

            result = self.client.feature_extraction(
                text,
                model=self.model,
                normalize=True,
            )

            embeddings.append(result.tolist())

        return embeddings

    def embed_query(self, text):

        result = self.client.feature_extraction(
            text,
            model=self.model,
            normalize=True,
        )

        return result.tolist()


def get_hf_embedding_model():

    print("Loading HuggingFace Embedding API...")

    return HFEmbeddingModel()


# ==========================================================
# Gemini Chat Model
# ==========================================================

# def get_gemini():

#     llm = ChatGoogleGenerativeAI(
#         model="gemini-2.5-flash",
#         temperature=0.1,
#         google_api_key=os.getenv("GOOGLE_API_KEY"),
#     )

#     return llm


# ==========================================================
# Gemini Embedding Model
# ==========================================================

# def get_gemini_embedding_model():

#     embedding_model = GoogleGenerativeAIEmbeddings(
#         model="models/gemini-embedding-001",
#         google_api_key=os.getenv("GOOGLE_API_KEY"),
#     )

#     return embedding_model


# ==========================================================
# Groq Chat Model
# ==========================================================

def get_groq():

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.1,
        groq_api_key=os.getenv("GROQ_API_KEY"),
    )

    return llm