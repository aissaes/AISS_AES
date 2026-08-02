import os
from dotenv import load_dotenv
from tools.gradelm_model import get_gradelm, get_gradelm_embedding_model

load_dotenv()  

# def get_hf_model():
#     from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
#     repo_id = "mistralai/Mistral-7B-Instruct-v0.3"
#
#     llm = HuggingFaceEndpoint(
#         repo_id=repo_id,
#         temperature=0.1,
#         max_new_tokens=512,
#         huggingfacehub_api_token=os.getenv("HUGGINGFACE_API_KEY")
#     )
#     
#     model_hf = ChatHuggingFace(llm=llm)
#     return model_hf


# def get_groq():
#     from langchain_groq import ChatGroq
#     llm = ChatGroq(
#         model="llama-3.3-70b-versatile",
#         temperature=0.1,
#         api_key=os.getenv("GROQ_API_KEY")
#     )
#     return llm

__all__ = ["get_gradelm", "get_gradelm_embedding_model"]