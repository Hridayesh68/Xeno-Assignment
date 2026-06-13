# Stage 1: Build the virtual environment using uv
FROM python:3.12-slim AS builder

# Copy uv from the official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Optimizations for building with uv in Docker
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Sync dependencies using cache mounts
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=requirements.txt,target=requirements.txt \
    uv venv /app/.venv && \
    . /app/.venv/bin/activate && \
    uv pip install --no-cache -r requirements.txt

# Stage 2: Clean, minimal runtime image
FROM python:3.12-slim

# Create a non-privileged user for runtime security
RUN groupadd -g 10001 appgroup && \
    useradd -u 10000 -g appgroup -m -s /bin/bash appuser

WORKDIR /app

# Copy the pre-built virtualenv containing all dependencies
COPY --from=builder --chown=appuser:appgroup /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy source code with correct owner permissions
COPY --chown=appuser:appgroup . /app

# Use the non-privileged user
USER appuser

# Expose port 8001 for the Channel Simulator API
EXPOSE 8001

# Secure, lightweight health check using native Python standard library (no curl/wget required)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health', timeout=5)" || exit 1

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
