import json
from pathlib import Path

import httpx
from pydantic import ValidationError

from app.config import Settings
from app.errors import ServiceError
from app.providers.validation import validate_source_refs
from app.schemas import AnalysisConfig, Guide

PROMPT_VERSION = "1.0.0"
PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "learning_v1.txt").read_text()


class OpenAICompatibleProvider:
    """Replaceable chat-completions adapter; credentials and endpoint are server-only."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.name = f"openai-compatible/{settings.ai_model}"

    async def generate(self, segments: list[dict], config: AnalysisConfig, title: str, target: str | None = None) -> Guide:
        messages = [
            {"role": "system", "content": PROMPT + "\nOUTPUT JSON SCHEMA:\n" + json.dumps(Guide.model_json_schema())},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "preferences": config.model_dump(),
                        "source_title": title,
                        "target_section": target,
                        "untrusted_transcript_segments": segments,
                    },
                    ensure_ascii=False,
                ),
            },
        ]
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds, follow_redirects=False) as client:
                    response = await client.post(
                        self.settings.ai_base_url.rstrip("/") + "/chat/completions",
                        headers={"Authorization": f"Bearer {self.settings.ai_api_key}"},
                        json={
                            "model": self.settings.ai_model,
                            "messages": messages,
                            "response_format": {"type": "json_object"},
                            "max_tokens": self.settings.ai_max_output_tokens,
                        },
                    )
                if response.status_code == 429:
                    raise ServiceError(
                        "provider_rate_limit", "The AI provider's rate limit was reached. Completed sections are preserved; retry later."
                    )
                if response.status_code in (401, 403):
                    raise ServiceError(
                        "provider_unauthorized",
                        "The configured AI provider rejected authorization. Ask the administrator to check the server credentials.",
                    )
                if not response.is_success:
                    raise ServiceError(
                        "provider_unavailable",
                        f"The AI provider returned HTTP {response.status_code}. Check provider compatibility and configuration, then retry.",
                    )
                if len(response.content) > 2_000_000:
                    raise ValueError("Provider response exceeded safe output limit")
                envelope = response.json()
                choice = envelope["choices"][0]
                if choice.get("finish_reason") == "length":
                    raise ValueError("Provider output was cut off; decrease AI_CHUNK_CHARS or increase AI_MAX_OUTPUT_TOKENS")
                content = choice["message"]["content"]
                guide = Guide.model_validate_json(content)
                validate_source_refs(guide, segments)
                if not target and not all(any(s.key == key and s.items for s in guide.sections) for key in ("overview", "takeaways")):
                    raise ValueError("Initial guides must include a supported overview and key takeaways")
                if target in ("quiz", "flashcards") and not getattr(guide, target):
                    raise ValueError("The requested study collection was empty")
                if target and target not in ("quiz", "flashcards") and not any(s.key == target for s in guide.sections):
                    raise ValueError("The requested section was not returned")
                return guide
            except (httpx.RequestError, httpx.TimeoutException) as exc:
                raise ServiceError(
                    "provider_connection", "The AI service could not be reached or timed out. Completed work is preserved. Try again later."
                ) from exc
            except (ValidationError, ValueError, KeyError, IndexError, TypeError) as exc:
                if attempt:
                    raise ServiceError(
                        "invalid_ai_output",
                        "The AI response failed structure or source-reference validation after one repair attempt. No unvalidated result was saved. Try a smaller transcript section or another model.",
                    ) from exc
                messages.append(
                    {
                        "role": "user",
                        "content": "Your previous response failed validation. Generate a fresh valid JSON object from the source. Use only known segment IDs, exact quotations and the provided schema. Validation category: "
                        + type(exc).__name__,
                    }
                )
        raise RuntimeError("Unreachable")
