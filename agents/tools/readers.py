import requests
from io import BytesIO
import os
from dotenv import load_dotenv
from PyPDF2 import PdfReader

load_dotenv()

OCR_API_KEY = os.getenv("OCR_SPACE_API_KEY")


def OCR_image_to_text(image_url):
    # download image locally first
    img_response = requests.get(image_url)

    if img_response.status_code != 200:
        raise Exception("Failed to download image from ImageKit")

    files = {
        "file": ("student_answer.png", BytesIO(img_response.content))
    }

    payload = {
        "apikey": OCR_API_KEY,
        "language": "eng",
        "OCREngine": 2
    }

    response = requests.post(
        "https://api.ocr.space/parse/image",
        files=files,
        data=payload
    )

    result = response.json()

    print(result)

    if result.get("IsErroredOnProcessing"):
        raise Exception(result["ErrorMessage"])

    parsed_results = result.get("ParsedResults", [])

    if not parsed_results:
        return ""

    return parsed_results[0]["ParsedText"]


def load_pdf_text(pdf_url):
    response = requests.get(pdf_url)

    if response.status_code != 200:
        raise Exception("Failed to download PDF")

    pdf_file = BytesIO(response.content)
    reader = PdfReader(pdf_file)

    text = ""

    for page in reader.pages:
        text += page.extract_text() + "\n"

    return text