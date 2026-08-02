import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Force UTF-8 stdout encoding for Windows compatibility
sys.stdout.reconfigure(encoding='utf-8')

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

try:
    from huggingface_hub import HfApi, create_repo
except ImportError:
    print("Installing huggingface_hub...")
    os.system(f"{sys.executable} -m pip install huggingface_hub")
    from huggingface_hub import HfApi, create_repo

HF_TOKEN = os.getenv("HUGGINGFACE_API_KEY")
MODEL_REPO_NAME = os.getenv("GRADELM_SPACE_NAME", "GradeLM-AES-Microservice")


def upload_model_repo():
    if not HF_TOKEN:
        print("❌ Error: HUGGINGFACE_API_KEY not found in .env file.")
        sys.exit(1)

    api = HfApi(token=HF_TOKEN)
    
    try:
        user_info = api.whoami()
        username = user_info["name"]
        print(f"Authenticated as Hugging Face user: {username}")
    except Exception as e:
        print(f"❌ Failed to authenticate with Hugging Face Token: {e}")
        sys.exit(1)

    repo_id = f"{username}/{MODEL_REPO_NAME}"
    print(f"Target Hugging Face Model Repository: https://huggingface.co/{repo_id}")

    try:
        create_repo(
            repo_id=repo_id,
            repo_type="model",
            private=False,
            token=HF_TOKEN,
            exist_ok=True
        )
        print(f"✅ Repository '{repo_id}' ready on Hugging Face Hub.")
    except Exception as e:
        print(f"Repo creation info: {e}")

    space_dir = str(Path(__file__).resolve().parent)
    print(f"Uploading GradeLM microservice artifacts to '{repo_id}'...")

    try:
        api.upload_folder(
            folder_path=space_dir,
            repo_id=repo_id,
            repo_type="model",
            token=HF_TOKEN,
            ignore_patterns=["upload_to_hf.py", "__pycache__/*", "*.pyc"]
        )
        model_url = f"https://huggingface.co/{repo_id}"
        print("\n" + "="*60)
        print("🎉 SUCCESS! GradeLM Artifacts Uploaded to Hugging Face Hub!")
        print(f"Repository URL: {model_url}")
        print("Remote Inference API: Active (Zero local compute)")
        print("="*60 + "\n")
        return model_url
    except Exception as e:
        print(f"❌ Failed to upload to Hugging Face Hub: {e}")
        sys.exit(1)

if __name__ == "__main__":
    upload_model_repo()
