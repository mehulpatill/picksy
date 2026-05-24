FROM python:3.11-slim

# HuggingFace Spaces runs as user with uid 1000
RUN useradd -m -u 1000 user
WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the fastembed model so it's baked into the image
# (avoids download on every cold start)
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='BAAI/bge-small-en-v1.5')"

# Copy app code
COPY . .

# Switch to non-root user (HuggingFace requirement)
USER user

# Set HuggingFace cache dir to a writable location
ENV HF_HOME=/tmp/hf_cache
ENV FASTEMBED_CACHE_PATH=/tmp/fastembed_cache

EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
