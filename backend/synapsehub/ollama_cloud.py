"""Server-only Ollama Cloud adapter, shared by RAG and the real-request smoke test."""
import os
import httpx
from ollama import Client, ResponseError

CLOUD_HOST = 'https://ollama.com'
CLOUD_MODEL = 'gemma4:31b'


class CloudError(RuntimeError):
    """Only sanitized messages are safe to expose; never use the provider body."""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        super().__init__(message)


def cloud_chat(messages: list[dict[str, str]]) -> str:
    key = os.getenv('OLLAMA_API_KEY', '').strip()
    # Check before constructing the SDK: do not allow implicit credential fallback.
    if not key:
        raise CloudError(503, 'Set OLLAMA_API_KEY in backend/.env.local before using Ollama Cloud.')
    try:
        with Client(
            host=CLOUD_HOST,
            headers={'Authorization': 'Bearer ' + key},
            timeout=90,
            follow_redirects=False,
        ) as client:
            # No schema-constrained format: Ollama Cloud does not support it.
            response = client.chat(
                model=CLOUD_MODEL, messages=messages, stream=False,
                options={'temperature': 0, 'num_predict': 2000},
            )
        content = response.message.content
        if not content or not content.strip():
            raise CloudError(502, 'Ollama Cloud returned no reply text.')
        # Defensive redaction: a provider reply must never echo the configured key.
        return content.replace(key, '[redacted]')
    except ResponseError as exc:
        messages_by_status = {
            401: 'Ollama Cloud authentication failed (401). Check OLLAMA_API_KEY.',
            402: 'Ollama Cloud requires usage credits (402). Add credits before retrying.',
            404: 'Ollama Cloud model was not found (404). Check gemma4:31b availability.',
            429: 'Ollama Cloud usage limit reached (429). Stop and retry only after the limit resets.',
        }
        status = exc.status_code or 502
        raise CloudError(status if status in messages_by_status else 502,
                         messages_by_status.get(status, 'Ollama Cloud rejected the request. No fallback was attempted.')) from None
    except (httpx.TimeoutException, httpx.TransportError, ConnectionError):
        raise CloudError(503, 'Cannot connect to Ollama Cloud. The terminal may block outbound HTTPS to ollama.com; run the smoke command from an allowed network.') from None
