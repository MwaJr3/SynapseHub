FROM python:3.11-slim
WORKDIR /app
COPY requirements.lock ./requirements.lock
RUN pip install --no-cache-dir -r requirements.lock && useradd --create-home synapse
COPY synapsehub ./synapsehub
USER synapse
EXPOSE 8000
CMD ["uvicorn", "synapsehub.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers"]
