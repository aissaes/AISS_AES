import requests
from io import BytesIO
import os
from dotenv import load_dotenv
from PyPDF2 import PdfReader

load_dotenv()

OCR_API_KEY = os.getenv("OCR_SPACE_API_KEY")


def OCR_image_to_text(image_url):
    # download file locally first
    img_response = requests.get(image_url, timeout=30)

    if img_response.status_code != 200:
        raise Exception("Failed to download file from ImageKit")

    # Inspect headers to determine correct extension
    content_type = img_response.headers.get('Content-Type', '').lower()

    # Dynamically determine correct filename extension for OCR Space API
    filename = "student_answer.png"
    if 'pdf' in content_type or ".pdf" in image_url.lower():
        filename = "student_answer.pdf"
    elif 'jpeg' in content_type or 'jpg' in content_type or ".jpg" in image_url.lower() or ".jpeg" in image_url.lower():
        filename = "student_answer.jpg"
    elif 'png' in content_type:
        filename = "student_answer.png"

    files = {
        "file": (filename, BytesIO(img_response.content))
    }

    payload = {
        "apikey": OCR_API_KEY,
        "language": "eng",
        "OCREngine": 2
    }

    response = requests.post(
        "https://api.ocr.space/parse/image",
        files=files,
        data=payload,
        timeout=30
    )

    result = response.json()


    if result.get("IsErroredOnProcessing"):
        raise Exception(result["ErrorMessage"])

    parsed_results = result.get("ParsedResults", [])

    if not parsed_results:
        return ""

    # Joint text of all parsed pages (handles multi-page PDF documents natively)
    return "\n\n".join([page["ParsedText"] for page in parsed_results if page.get("ParsedText")])


def load_pdf_text(pdf_url):
    response = requests.get(pdf_url, timeout=30)

    if response.status_code != 200:
        raise Exception("Failed to download PDF")

    pdf_file = BytesIO(response.content)
    reader = PdfReader(pdf_file)

    text = ""

    for page in reader.pages:
        text += page.extract_text() + "\n"

    return text
