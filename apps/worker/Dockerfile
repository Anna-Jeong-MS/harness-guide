FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install -e .
COPY src ./src
ENV PYTHONPATH=/app/src
EXPOSE 8000
CMD ["uvicorn", "worker.app:app", "--host", "0.0.0.0", "--port", "8000"]
