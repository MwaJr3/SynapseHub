import pytest
from pydantic import ValidationError
from app.errors import ServiceError
from app.providers.local import LocalExtractiveProvider
from app.providers.validation import validate_source_refs
from app.schemas import AnalysisConfig, Guide, GuideSection, LearningItem, QuizQuestion
from app.services.transcripts import chunk_segments, parse_plain, parse_upload, seconds
from app.services.youtube import extract_video_id

TEXT = "Active recall is the practice of retrieving information from memory. You should close your notes and explain the concept in your own words. Spaced repetition means revisiting information over increasing intervals. First, study a short passage. Next, answer a question without looking. Finally, check your answer against the source."


@pytest.mark.parametrize(
    "url",
    [
        "https://youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ?t=10",
        "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ],
)
def test_url_formats(url):
    assert extract_video_id(url) == "dQw4w9WgXcQ"


@pytest.mark.parametrize(
    "url",
    [
        "https://youtube.com.evil.org/watch?v=dQw4w9WgXcQ",
        "http://127.0.0.1/watch?v=dQw4w9WgXcQ",
        "file:///etc/passwd",
        "https://youtube.com@evil.org/watch?v=dQw4w9WgXcQ",
        "https://youtube.com/watch?v=bad",
        "https://youtube.com/watch?v=dQw4w9WgXcQ&v=aaaaaaaaaaa",
        "https://youtube.com:8000/watch?v=dQw4w9WgXcQ",
    ],
)
def test_url_rejects_arbitrary_hosts(url):
    with pytest.raises(ServiceError):
        extract_video_id(url)


def test_subtitle_timestamps_and_markup():
    content = f"WEBVTT\n\n00:01.500 --> 00:08.000\n<v Speaker>{TEXT}</v>\n\n".encode()
    _, segments = parse_upload("lesson.vtt", content)
    assert segments[0]["start"] == 1.5
    assert segments[0]["end"] == 8
    assert segments[0]["text"] == TEXT
    assert seconds("01:02:03,500") == 3723.5


def test_srt():
    _, segments = parse_upload("lesson.srt", f"1\n00:00:01,000 --> 00:00:07,000\n{TEXT}\n".encode())
    assert segments[0]["start"] == 1


@pytest.mark.parametrize(
    "name,data",
    [
        ("a.vtt", b"no cues"),
        ("a.srt", b"1\n00:00:05,000 --> 00:00:01,000\ninvalid"),
        ("a.txt", b"\xff\xfe\x00"),
        ("a.txt", b"%PDF-1.7"),
        ("a.exe", b"unsupported"),
        ("a.txt", b"short"),
    ],
)
def test_bad_uploads(name, data):
    with pytest.raises(ServiceError):
        parse_upload(name, data)


def test_plain_timestamps_not_invented():
    segments = parse_plain("00:10 " + TEXT + "\n\n" + TEXT)
    assert segments[0]["start"] == 10
    assert segments[1]["start"] is None
    assert segments[0]["id"] != segments[1]["id"]


def test_chunking_covers_entire_source():
    segments = parse_plain((TEXT + "\n\n") * 150)
    chunks = chunk_segments(segments, 3000)
    assert len(chunks) > 1
    assert [s for c in chunks for s in c] == segments


async def test_local_source_grounded_guide():
    segments = parse_plain(TEXT)
    guide = await LocalExtractiveProvider().generate(segments, AnalysisConfig(), "Memory & learning")
    assert {s.key for s in guide.sections} >= {"overview", "takeaways", "notes", "concepts", "applications", "plan"}
    assert guide.quiz and guide.flashcards
    assert "Local extractive" in guide.notices[0]
    validate_source_refs(guide, segments)
    for section in guide.sections:
        for entry in section.items:
            if entry.provenance == "source_claim":
                assert all(piece in TEXT for piece in entry.body.split("\n\n"))


def test_invalid_ai_references_and_quotes_rejected():
    segments = parse_plain(TEXT)
    guide = Guide(
        title="test",
        sections=[
            GuideSection(
                key="quotes",
                title="Quotes",
                items=[LearningItem(id="q", body="A fabricated quotation.", provenance="direct_quote", refs=[segments[0]["id"]])],
            )
        ],
    )
    with pytest.raises(ValueError, match="verbatim"):
        validate_source_refs(guide, segments)
    guide.sections[0].items[0].refs = ["not-a-segment"]
    with pytest.raises(ValueError, match="unknown"):
        validate_source_refs(guide, segments)


def test_mc_answer_must_be_valid():
    with pytest.raises(ValidationError):
        QuizQuestion(id="q", kind="multiple_choice", question="Which?", options=["a", "b"], answer="c")


def test_large_merge_samples_outputs_explicitly_but_keeps_the_final_source_item():
    from app.schemas import Guide, GuideSection, LearningItem, QuizQuestion
    from app.services.guides import merge_guides

    chunks = []
    for chunk in range(3):
        items = [LearningItem(id=f"i{n}", body=f"Distinct source item {chunk}-{n}", refs=[f"s{chunk}-{n}"]) for n in range(110)]
        quiz = [
            QuizQuestion(
                id=f"q{n}", kind="short_answer", question=f"Question {chunk}-{n}", answer=f"Answer {chunk}-{n}", refs=[f"s{chunk}-{n}"]
            )
            for n in range(60)
        ]
        chunks.append(Guide(title="Source", sections=[GuideSection(key="notes", title="Notes", items=items)], quiz=quiz))
    result = merge_guides(chunks, "Long source")
    assert len(result.sections[0].items) == 300 and len(result.quiz) == 150
    assert result.sections[0].items[-1].body.endswith("2-109")
    assert result.quiz[-1].question == "Question 2-59"
    assert result.notices[0].startswith("Workspace selection:")


def test_merge_preserves_case_sensitive_code_and_distinct_answers():
    from app.schemas import Guide, GuideSection, LearningItem, QuizQuestion
    from app.services.guides import merge_guides

    def chunk(body, answer):
        return Guide(
            title="Code",
            sections=[GuideSection(key="notes", title="Notes", items=[LearningItem(id="a", body=body, refs=[answer])])],
            quiz=[QuizQuestion(id="q", kind="short_answer", question="What does this value represent?", answer=answer, refs=[answer])],
        )

    result = merge_guides([chunk("print(A)", "First context"), chunk("print(a)", "Second context")], "Code")
    assert len(result.sections[0].items) == 2 and len(result.quiz) == 2


def test_merge_never_silently_drops_duplicate_item_references():
    from app.schemas import Guide, GuideSection, LearningItem
    from app.services.guides import merge_guides

    chunks = [
        Guide(
            title="Source",
            sections=[
                GuideSection(
                    key="notes", title="Notes", items=[LearningItem(id="i", body="Repeated idea", refs=[f"s{c}-{n}" for n in range(80)])]
                )
            ],
        )
        for c in range(2)
    ]
    result = merge_guides(chunks, "Source")
    assert sum(len(item.refs) for item in result.sections[0].items) == 160


def test_namespaced_long_ids_do_not_collide_after_merging():
    from app.schemas import Guide, GuideSection, LearningItem
    from app.services.guides import merge_guides

    chunk = Guide(
        title="Source",
        sections=[
            GuideSection(
                key="notes",
                title="Notes",
                items=[LearningItem(id="x" * 79 + letter, body="Distinct " + letter, refs=["s1"]) for letter in "ab"],
            )
        ],
    )
    result = merge_guides([chunk], "Source")
    assert len({item.id for item in result.sections[0].items}) == 2
