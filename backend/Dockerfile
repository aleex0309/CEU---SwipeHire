FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install dependencies first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK stopwords
RUN python -c "import nltk; nltk.download('stopwords')"

# Copy the rest of the application, including the CSV
COPY . .

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV RESUME_CSV_PATH=/app/resume_data.csv

# Expose the API port
EXPOSE 8000

# Start the application
CMD ["python", "run.py"]
