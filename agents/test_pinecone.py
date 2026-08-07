from pinecone import Pinecone
from dotenv import load_dotenv
import os

load_dotenv(override=True)

api_key = os.getenv("PINECONE_API_KEY")
index_name = os.getenv("PINECONE_INDEX_NAME")

print("API Key:", api_key[:15] + "...")
print("Index:", index_name)

pc = Pinecone(api_key=api_key)

print("\nListing indexes...")
print(pc.list_indexes())