FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Create data directory
RUN mkdir -p /data/raw

# Default command (can be overridden)
CMD ["python", "-m", "src.main", "--mode", "continuous"]
