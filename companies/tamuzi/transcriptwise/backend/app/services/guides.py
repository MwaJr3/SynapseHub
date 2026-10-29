from hashlib import sha256
from app.schemas import Guide, GuideSection

SECTION_TITLES = {
    "overview": "Overview",
    "takeaways": "Key takeaways",
    "notes": "Detailed notes",
    "concepts": "Concepts explained",
    "procedures": "Processes & procedures",
    "evidence": "Facts & evidence",
    "actions": "Actionable advice",
    "applications": "Practical applications",
    "quotes": "Important quotes",
    "limitations": "Critical thinking & limitations",
    "plan": "Learning plan",
    "prerequisites": "Prerequisites",
    "research": "Further research",
}


def merge_guides(guides: list[Guide], title: str) -> Guide:
    """Merge all chunks in source order. No source chunk is silently truncated.

    IDs are namespaced, exact duplicate insights are collapsed, and duplicate references
    are unioned. This deterministic reduction avoids another lossy context-window pass.
    """
    sections = {}
    quiz, cards, notices = [], [], []
    for chunk_index, guide in enumerate(guides):
        for section in guide.sections:
            bucket = sections.setdefault(section.key, [])
            for raw in section.items:
                entry = raw.model_copy(deep=True)
                entry.id = _namespace(chunk_index, entry.id)
                same = next(
                    (
                        i
                        for i in bucket
                        if i.body.strip() == entry.body.strip()
                        and i.provenance == entry.provenance
                        and i.details == entry.details
                        and len(set(i.refs + entry.refs)) <= 100
                    ),
                    None,
                )
                if same:
                    same.refs = list(dict.fromkeys(same.refs + entry.refs))
                else:
                    bucket.append(entry)
        for collection, destination in ((guide.quiz, quiz), (guide.flashcards, cards)):
            for raw in collection:
                entry = raw.model_copy(deep=True)
                entry.id = _namespace(chunk_index, entry.id)
                key = getattr(entry, "question", getattr(entry, "front", ""))
                same = next(
                    (
                        i
                        for i in destination
                        if getattr(i, "question", getattr(i, "front", "")) == key
                        and getattr(i, "answer", getattr(i, "back", "")) == getattr(entry, "answer", getattr(entry, "back", ""))
                        and getattr(i, "explanation", "") == getattr(entry, "explanation", "")
                        and len(set(i.refs + entry.refs)) <= 30
                    ),
                    None,
                )
                if same:
                    same.refs = list(dict.fromkeys(same.refs + entry.refs))
                else:
                    destination.append(entry)
        notices.extend(guide.notices)
    if len(guides) > 1:
        notices.append(
            f"Combined {len(guides)} validated chunk results in source order. Overall source coverage is reported separately; no transcript tail was silently discarded."
        )
    selections = []
    for key, entries in sections.items():
        if len(entries) > 300:
            selections.append(f"{SECTION_TITLES[key]}: 300 of {len(entries)} items")
            sections[key] = _even_selection(entries, 300)
    for label, entries in (("quiz", quiz), ("flashcards", cards)):
        if len(entries) > 150:
            selections.append(f"{label}: 150 of {len(entries)} items")
            entries[:] = _even_selection(entries, 150)
    if selections:
        notices.insert(
            0,
            "Workspace selection: "
            + "; ".join(selections)
            + ". To keep the workspace bounded, these outputs were selected evenly across the validated results, including the end. The original transcript is unchanged. This is an output selection, not undisclosed input truncation.",
        )
    notices = list(dict.fromkeys(notices))
    if len(notices) > 100:
        notices = notices[:99] + ["Additional per-chunk notices are available with the initial validated chunk results in JSON export."]
    return Guide(
        title=title,
        sections=[GuideSection(key=k, title=SECTION_TITLES[k], items=sections[k]) for k in SECTION_TITLES if k in sections],
        quiz=quiz,
        flashcards=cards,
        notices=notices,
    )


def _namespace(chunk_index: int, identifier: str) -> str:
    candidate = f"c{chunk_index}-{identifier}"
    return candidate if len(candidate) <= 80 else candidate[:55] + "-" + sha256(candidate.encode()).hexdigest()[:24]


def _even_selection(entries: list, limit: int) -> list:
    """Bound output size without preferentially discarding the transcript tail."""
    return [entries[i * (len(entries) - 1) // (limit - 1)] for i in range(limit)]
