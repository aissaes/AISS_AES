#text cleaning
import re
from langchain_text_splitters import RecursiveCharacterTextSplitter

def text_cleaning(text):
    if not text:
        return ""

    # Remove non-printable characters
    text = re.sub(r'[\x00-\x1F\x7F-\x9F]', ' ', text)

    # Replace common OCR mistakes
    replacements = {
        '|': 'I',
        '¦': 'I',
        'ﬁ': 'fi',
        'ﬂ': 'fl',
        '¢': 'c',
        '©': 'o',
        '®': '',
        '™': '',
    }

    for wrong, correct in replacements.items():
        text = text.replace(wrong, correct)

    # Remove excessive punctuation junk
    text = re.sub(r'[~`^*_<>]+', ' ', text)

    # Fix hyphenated line breaks
    text = re.sub(r'-\s*\n\s*', '', text)

    # Merge broken lines inside sentences
    text = re.sub(r'(?<![.!?])\n(?!\n)', ' ', text)

    # Preserve paragraph breaks
    text = re.sub(r'\n{2,}', '\n\n', text)

    # Remove repeated spaces
    text = re.sub(r'[ \t]+', ' ', text)

    # Remove repeated punctuation
    text = re.sub(r'([.,!?])\1+', r'\1', text)

    # Remove isolated junk characters
    text = re.sub(r'\b[a-zA-Z]{1}\b(?=\s+[^\n])', '', text)

    # Clean spacing around punctuation
    text = re.sub(r'\s+([.,!?;:])', r'\1', text)

    return text.strip()


#text spitting
def split_text(text):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=200,
        chunk_overlap=20,
        separators=["\n\n", "\n", ".", " ", ""]
    )

    chunks = splitter.split_text(text)
    return chunks 