# 1. Use the exact, stable version of Python we know works
FROM python:3.11.9-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy just the requirements file first (this speeds up future builds)
COPY requirements.txt .

# 4. Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of your code into the container
COPY . .

# 6. Expose the port Render uses
EXPOSE 10000

# Add healthcheck to monitor the status of the server
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:10000/')" || exit 1

# 7. The command to start your FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]