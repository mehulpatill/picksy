# Production Dockerfile for Picksy Backend (Backend context)
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    FASTEMBED_CACHE_PATH=/app/cache/fastembed \
    HF_HOME=/app/cache/hf

# Create non-root user (uid 1000 is standard and required by HuggingFace/production best practice)
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/cache/fastembed /app/cache/hf && \
    chown -R appuser:appuser /app

WORKDIR /app

# Install Python dependencies first for caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Optional build-arg for faster/authenticated Hugging Face downloads during image build
ARG HF_TOKEN=""

# Pre-download the FastEmbed model into cache layer during build
RUN HF_TOKEN=${HF_TOKEN} python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='BAAI/bge-small-en-v1.5')" && \
    chown -R appuser:appuser /app/cache

# Copy application source code
COPY . /app
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose default port (overridable via PORT env var)
EXPOSE 8000

# Docker healthcheck using Python standard library
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python3 -c "import urllib.request, os; sys_port = os.getenv('PORT', '8000'); urllib.request.urlopen(f'http://127.0.0.1:{sys_port}/health')" || exit 1

# Start FastAPI production server with proxy headers support for Nginx reverse proxy
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
