from typing import Protocol
from app.schemas import AnalysisConfig, Guide


class AnalysisProvider(Protocol):
    name: str

    async def generate(self, segments: list[dict], config: AnalysisConfig, title: str, target: str | None = None) -> Guide: ...
