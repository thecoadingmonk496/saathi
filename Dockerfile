# Use official Python image as a base
FROM python:3.10-slim

# Set environment variables to prevent Python from writing .pyc files
# and to ensure stdout and stderr are unbuffered.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create and set working directory
WORKDIR /app

# Install system dependencies (e.g. for fasttext compilation if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install them
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . /app/

# Expose the port (Gunicorn will bind to this)
EXPOSE 8000

# Run the FastAPI app using Uvicorn directly to pick up Render's dynamic PORT
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
