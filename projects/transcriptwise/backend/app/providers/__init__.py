from app.config import get_settings
from app.providers.base import AnalysisProvider
from app.providers.local import LocalExtractiveProvider
from app.providers.openai_compatible import OpenAICompatibleProvider


def get_provider() -> AnalysisProvider:
    settings = get_settings()
    return OpenAICompatibleProvider(settings) if settings.ai_provider == "openai_compatible" else LocalExtractiveProvider()
