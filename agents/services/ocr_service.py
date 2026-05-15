import os
import requests
from dotenv import load_dotenv

# Force load the .env file
load_dotenv(override=True)

OCR_SPACE_API_KEY: str = os.getenv("OCR_SPACE_API_KEY", "").strip()
OCR_SPACE_API_URL: str = "https://api.ocr.space/parse/imageurl"

def extract_text_ocrspace(image_url: str) -> str:
    """
    Sends a public image URL to the OCR.space API and extracts the text.
    """
    if not OCR_SPACE_API_KEY:
        raise ValueError("OCR_SPACE_API_KEY is missing or empty in .env file!")

    # Engine 2 is highly recommended by OCR.space for handwriting
    params = {
        "apikey": OCR_SPACE_API_KEY,
        "url": image_url,
        "OCREngine": "2" 
    }

    try:
        # Send the GET request to OCR.space
        response = requests.get(OCR_SPACE_API_URL, params=params, timeout=30)
        response.raise_for_status()
        result: dict = response.json()

        # OCR.space returns a 200 OK even if the OCR process itself fails, 
        # so we must check their internal "IsErroredOnProcessing" flag.
        if result.get("IsErroredOnProcessing"):
            error_msg = result.get("ErrorMessage", ["Unknown error"])[0]
            print(f"\n🚨 OCR.SPACE ERROR: {error_msg}\n")
            raise RuntimeError(f"OCR.space rejected the image: {error_msg}")

        parsed_results = result.get("ParsedResults", [])
        if not parsed_results:
            raise ValueError("OCR.space returned no results.")

        # Extract and combine the text
        extracted_text = "\n".join(
            res.get("ParsedText", "") for res in parsed_results if res.get("ParsedText")
        ).strip()

        if not extracted_text:
            raise ValueError("No readable text was found in this image.")

        return extracted_text

    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"Failed to connect to OCR.space: {exc}") from exc