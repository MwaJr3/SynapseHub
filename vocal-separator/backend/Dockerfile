FROM python:3.11-slim-bookworm

ARG INSTALL_ML=false

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DATA_DIR=/data \
    STORAGE_DIR=/data/storage

WORKDIR /app/backend

# libsndfile is required by SoundFile. ffmpeg enables formats such as M4A/AAC
# and final-stage compressed encoding where the application chooses it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-ml.txt ./
RUN python -m pip install --upgrade pip \
    && python -m pip install -r requirements.txt \
    && if [ "$INSTALL_ML" = "true" ]; then python -m pip install -r requirements-ml.txt; fi

COPY app ./app

RUN useradd --create-home --shell /usr/sbin/nologin appuser \
    && mkdir -p /data/storage/originals /data/storage/intermediate /data/storage/stems /data/storage/analysis /data/storage/exports \
    && chown -R appuser:appuser /app /data

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3).read()"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
