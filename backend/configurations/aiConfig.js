import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";

// 1. Initialize Google Gemini
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 2. Initialize Pinecone Vector DB
export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Target your specific index
export const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);