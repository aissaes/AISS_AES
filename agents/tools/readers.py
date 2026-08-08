import requests
from io import BytesIO
import os
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from pdf2image import convert_from_bytes

load_dotenv()

OCR_API_KEY = os.getenv("OCR_SPACE_API_KEY")

# POPPLER_PATH = r"C:\Users\Vinay Reddy\Downloads\poppler-26.02.0\Library\bin"


def OCR_image_to_text(image_url):

    img_response = requests.get(image_url)

    if img_response.status_code != 200:
        raise Exception("Failed to download file from ImageKit")

    content_type = img_response.headers.get("Content-Type", "").lower()

    # =====================================================
    # PDF
    # =====================================================

    if "pdf" in content_type or image_url.lower().endswith(".pdf"):

        reader = PdfReader(BytesIO(img_response.content))
        total_pages = len(reader.pages)

        print(f"Total Pages: {total_pages}")

        all_text = []

        for page in range(total_pages):

            print(f"\nProcessing Page {page + 1}/{total_pages}")

            images = convert_from_bytes(
            img_response.content,
            dpi=150,
            first_page=page + 1,
            last_page=page + 1)

            image = images[0].convert("RGB")

            quality = 90

            while True:

                img_buffer = BytesIO()

                image.save(
                    img_buffer,
                    format="JPEG",
                    quality=quality,
                    optimize=True
                )

                size_mb = len(img_buffer.getvalue()) / (1024 * 1024)

                print(
                    f"Page {page + 1} | Quality={quality} | Size={size_mb:.2f} MB"
                )

                if size_mb <= 1 or quality <= 30:
                    break

                quality -= 10

            img_buffer.seek(0)

            files = {
                "file": (
                    f"page_{page + 1}.jpg",
                    img_buffer,
                    "image/jpeg"
                )
            }

            payload = {
                "apikey": OCR_API_KEY,
                "language": "eng",
                "OCREngine": 2
            }

            try:

                response = requests.post(
                    "https://api.ocr.space/parse/image",
                    files=files,
                    data=payload,
                    timeout=120
                )

                response.raise_for_status()

                result = response.json()

            except Exception as e:
                print(f"OCR request failed on page {page + 1}")
                print(e)
                continue

            if result.get("IsErroredOnProcessing"):

                print(f"OCR failed on page {page + 1}")
                print(result)

                continue

            parsed = result.get("ParsedResults", [])

            page_text = "\n".join(
                p.get("ParsedText", "")
                for p in parsed
            )

            all_text.append(page_text)

            print(f"Finished Page {page + 1}")

        return "\n\n".join(all_text)

    # =====================================================
    # IMAGE
    # =====================================================

    filename = "student_answer.jpg"

    if (
        "png" in content_type
        or image_url.lower().endswith(".png")
    ):
        filename = "student_answer.png"

    elif (
        "jpeg" in content_type
        or "jpg" in content_type
        or image_url.lower().endswith(".jpg")
        or image_url.lower().endswith(".jpeg")
    ):
        filename = "student_answer.jpg"

    files = {
        "file": (
            filename,
            BytesIO(img_response.content)
        )
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
        timeout=120
    )

    response.raise_for_status()

    result = response.json()

    if result.get("IsErroredOnProcessing"):
        raise Exception(result.get("ErrorMessage"))

    parsed = result.get("ParsedResults", [])

    if not parsed:
        return ""

    return "\n\n".join(
        p.get("ParsedText", "")
        for p in parsed
    )


def load_pdf_text(pdf_url):

    response = requests.get(pdf_url)

    if response.status_code != 200:
        raise Exception("Failed to download PDF")

    pdf_file = BytesIO(response.content)

    reader = PdfReader(pdf_file)

    text = ""

    for page in reader.pages:

        extracted = page.extract_text()

        if extracted:
            text += extracted + "\n"

    return text