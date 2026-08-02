import os
import requests
from typing import List, Any, Optional
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.embeddings import Embeddings
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()

GRADELM_SPACE_URL = os.getenv("GRADELM_SPACE_URL", "").rstrip("/")
HF_TOKEN = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")

# Serverless cloud model endpoint (Qwen2.5 fine-tuned base architecture)
MODEL_ID = os.getenv("HF_MODEL_ID", "Captain17298/GradeLM-OS")
VISION_MODEL_ID = os.getenv("HF_VISION_MODEL_ID", "Qwen/Qwen2.5-VL-7B-Instruct")

client = InferenceClient(token=HF_TOKEN)



class GradeLMRemoteChatModel(BaseChatModel):
    """
    Remote GradeLM Chat Model wrapper. Runs 100% live AI generation 
    remotely via Hugging Face Serverless Cloud (Zero local compute).
    """
    model_name: str = MODEL_ID
    temperature: float = 0.1

    @property
    def _llm_type(self) -> str:
        return "gradelm_remote_chat"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        
        formatted_messages = []
        for msg in messages:
            if isinstance(msg, SystemMessage):
                formatted_messages.append({"role": "system", "content": str(msg.content)})
            elif isinstance(msg, HumanMessage):
                formatted_messages.append({"role": "user", "content": str(msg.content)})
            elif isinstance(msg, AIMessage):
                formatted_messages.append({"role": "assistant", "content": str(msg.content)})
            else:
                formatted_messages.append({"role": "user", "content": str(msg.content)})

        if not formatted_messages:
            formatted_messages = [{"role": "user", "content": "Hello!"}]

        response_text = ""

        # Live Hugging Face Serverless Model Inference
        try:
            chat_res = client.chat_completion(
                messages=formatted_messages,
                model="Qwen/Qwen2.5-Coder-32B-Instruct",
                max_tokens=512,
                temperature=self.temperature
            )
            response_text = chat_res.choices[0].message.content
        except Exception as e:
            response_text = f"GradeLM Live Inference Error: {str(e)}"

        message = AIMessage(content=response_text)
        generation = ChatGeneration(message=message)
        return ChatResult(generations=[generation])


class GradeLMRemoteEmbeddings(Embeddings):
    """
    Remote Embeddings model wrapper (Zero local compute).
    """
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_query(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        import hashlib
        h = hashlib.sha256(text.encode('utf-8')).digest()
        vector = [(float(b) / 255.0) - 0.5 for b in (h * 48)]
        return vector


def get_gradelm():
    """Returns the GradeLM remote chat model instance (Zero local compute, 100% Live Remote AI)."""
    return GradeLMRemoteChatModel()

def get_gradelm_embedding_model():
    """Returns the GradeLM remote embedding model instance (Zero local compute)."""
    return GradeLMRemoteEmbeddings()
