# Use a minimal Python image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend /app

# Expose the Hugging Face Space port
EXPOSE 7860

# Start FastAPI directly on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
