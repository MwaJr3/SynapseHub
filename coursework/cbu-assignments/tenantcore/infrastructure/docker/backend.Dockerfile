FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /service

RUN addgroup --system tenantcore && adduser --system --ingroup tenantcore tenantcore
COPY backend/pyproject.toml backend/README.md ./
COPY backend/app ./app
COPY backend/migrations ./migrations
COPY backend/alembic.ini ./alembic.ini
RUN pip install --no-cache-dir --upgrade pip setuptools \
    && pip install --no-cache-dir .
RUN chown -R tenantcore:tenantcore /service
USER tenantcore

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/live')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
