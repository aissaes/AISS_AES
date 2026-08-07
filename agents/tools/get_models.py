from langchain_huggingface import HuggingFaceEndpoint,ChatHuggingFace
from langchain_google_genai import ChatGoogleGenerativeAI,GoogleGenerativeAIEmbeddings
from langchain_groq import ChatGroq

import os
from dotenv import load_dotenv

load_dotenv()  

def get_hf_model():
    
    # use "mistralai/Mistral-7B-Instruct-v0.3" 
    # or "meta-llama/Llama-3.1-8B-Instruct"
    repo_id = "Qwen/Qwen2.5-7B-Instruct"

    llm = HuggingFaceEndpoint(
        repo_id=repo_id,
        temperature=0.1,
        max_new_tokens=512,
        huggingfacehub_api_token=os.getenv("HUGGINGFACE_API_KEY")
    )
    
    model_hf=ChatHuggingFace(llm=llm)
    return model_hf

# def get_hf_embedding_model():

#     embedding_model = HuggingFaceEmbeddings(
#         model_name="sentence-transformers/all-MiniLM-L6-v2"
#     )

#     return embedding_model



def get_gemini():   
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", # Or "gemini-2.5-pro" for complex grading
        temperature=0.1,         # Low temperature for objective evaluation
        google_api_key=os.getenv("GOOGLE_API_KEY")
    )
    return llm

def get_gemini_embedding_model():
    # Updated to Google's active 2026 embedding model
    embedding_model = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001", 
        google_api_key=os.getenv("GOOGLE_API_KEY")
    )
    return embedding_model

def get_groq():

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.1,
        api_key=os.getenv("GROQ_API_KEY")
    )

    return llm