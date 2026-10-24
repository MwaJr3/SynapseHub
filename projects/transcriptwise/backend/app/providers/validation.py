import re
from app.schemas import Guide


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def validate_source_refs(guide: Guide, segments: list[dict]) -> Guide:
    lookup = {s["id"]: s["text"] for s in segments}
    positions = {s["id"]: i for i, s in enumerate(segments)}
    for item in [i for section in guide.sections for i in section.items] + guide.quiz + guide.flashcards:
        if any(ref not in lookup for ref in item.refs):
            raise ValueError("Output contains unknown source segment references")
        provenance = getattr(item, "provenance", None)
        if (provenance in ("source_claim", "source_paraphrase", "direct_quote") or not hasattr(item, "provenance")) and not item.refs:
            raise ValueError("Source-based content must cite a segment")
        if provenance == "direct_quote":
            quote = _normalize(item.body)
            inside_one = any(quote in _normalize(lookup[r]) for r in item.refs)
            indices = [positions[r] for r in item.refs]
            adjacent = indices == list(range(indices[0], indices[0] + len(indices)))
            source = _normalize(" ".join(lookup[r] for r in item.refs))
            if len(item.body) > 600 or not (inside_one or (adjacent and quote in source)):
                raise ValueError("A direct quotation could not be located verbatim in its source")
    return guide
