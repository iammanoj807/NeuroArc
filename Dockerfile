# Multi-stage build for Hugging Face Spaces

# Stage 1: Build Frontend
FROM node:18-alpine as frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
# Use --legacy-peer-deps to avoid potential conflicts with older packages
RUN npm install --legacy-peer-deps
COPY frontend/ .
RUN npm run build

# Stage 2: Setup Backend & Run
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (e.g., for PyMuPDF or OpenCV if needed)
# python-multipart needs no special system deps usually, but good to be safe
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt ./backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose the port HF Spaces uses (7860)
EXPOSE 7860

# Change to backend directory and run
WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
