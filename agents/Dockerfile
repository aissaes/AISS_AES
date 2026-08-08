# 1. Use the exact, stable version of Python we know works
FROM python:3.11.9-slim

# Install Poppler for pdf2image
RUN apt-get update \
    && apt-get install -y poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy requirements first
COPY requirements.txt .

# 4. Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of the code
COPY . .

# 6. Expose Render port
EXPOSE 10000

# 7. Start FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]