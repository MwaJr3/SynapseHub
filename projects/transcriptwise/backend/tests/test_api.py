import asyncio
import io
from copy import deepcopy
from docx import Document
from app.config import get_settings
from app.errors import ServiceError
from app.providers.local import LocalExtractiveProvider
from app.services.tasks import run_task
from app.services.youtube import OfficialYouTubeRetriever, RetrievedTranscript
from conftest import initialized_client
from test_core import TEXT

API = "/api/v1"


def create_guide(client, text=TEXT):
    response = client.post(API + "/transcripts/text", json={"text": text, "title": "Memory & learning"})
    assert response.status_code == 201, response.text
    transcript = response.json()
    response = client.post(API + "/analyses", json={"transcript_id": transcript["id"], "config": {}})
    assert response.status_code == 202, response.text
    data = response.json()
    asyncio.run(run_task(data["task"]["id"]))
    result = client.get(API + "/analyses/" + data["analysis"]["id"]).json()
    return transcript, result


def register(client, email="learner@example.com"):
    response = client.post(API + "/auth/register", json={"email": email, "password": "a-strong-test-password", "display_name": "Alex"})
    assert response.status_code == 200, response.text
    client.headers["X-CSRF-Token"] = response.json()["csrf_token"]


def test_end_to_end_guest_account_library_edit_export_delete(client):
    transcript, guide = create_guide(client)
    assert guide["status"] == "complete", guide
    assert guide["guide"]["_meta"]["processed_segments"] == len(transcript["segments"])
    url = API + "/analyses/" + guide["id"]
    assert client.patch(url, json={"revision": guide["revision"], "is_saved": True}).status_code == 403
    register(client)
    response = client.patch(
        url,
        json={
            "revision": guide["revision"],
            "is_saved": True,
            "notes": "My independent notes",
            "folder": "Study skills",
            "tags": ["memory"],
        },
    )
    assert response.status_code == 200, response.text
    guide = response.json()
    results = client.get(API + "/analyses", params={"saved": "true", "q": "memory", "folder": "Study skills", "tag": "memory"}).json()
    assert results["total"] == 1
    section = deepcopy(guide["guide"]["sections"][0])
    section["items"][0].update(body="This is my edited overview.", provenance="user_note")
    edited = client.patch(url, json={"revision": guide["revision"], "section": section}).json()
    assert edited["guide"]["sections"][0]["items"][0]["body"] == "This is my edited overview."
    assert edited["guide"]["sections"][1] == guide["guide"]["sections"][1]
    assert client.patch(url, json={"revision": 1, "title": "stale"}).status_code == 409
    md = client.get(url + "/export?format=markdown")
    assert md.status_code == 200 and "My independent notes" in md.text
    assert "User-edited note" in md.text
    word = client.get(url + "/export?format=docx")
    assert word.status_code == 200
    assert any("Memory & learning" in p.text for p in Document(io.BytesIO(word.content)).paragraphs)
    assert client.get(url + "/export?format=json").json()["transcript"]["original_text"] == TEXT
    assert client.get(url + "/export?format=html").status_code == 200
    assert client.delete(url).status_code == 200
    assert client.get(url).status_code == 404
    assert client.get(API + "/transcripts/" + transcript["id"]).status_code == 404


def test_ownership_isolation(client):
    transcript, guide = create_guide(client)
    other = initialized_client()
    path = API + "/analyses/" + guide["id"]
    for method, url, kwargs in [
        ("get", path, {}),
        ("get", path + "/export?format=json", {}),
        ("get", API + "/transcripts/" + transcript["id"], {}),
        ("get", API + "/tasks/" + guide["task"]["id"], {}),
        ("patch", path, {"json": {"revision": guide["revision"], "title": "stolen"}}),
        ("delete", path, {}),
        ("get", path + "/quiz/attempts", {}),
        ("post", path + "/flashcards/review", {"json": {"card_id": "fake", "rating": "easy"}}),
    ]:
        response = getattr(other, method)(url, **kwargs)
        assert response.status_code == 404, (url, response.text)
    other.close()


def test_csrf_and_origin_protection(client):
    assert client.post(API + "/transcripts/text", json={"text": TEXT}, headers={"X-CSRF-Token": "wrong"}).status_code == 403
    assert client.post(API + "/transcripts/text", json={"text": TEXT}, headers={"Origin": "https://evil.example"}).status_code == 403


def test_transcript_review_preserves_original_and_timestamps(client):
    response = client.post(
        API + "/transcripts/upload", files={"file": ("lesson.srt", f"1\n00:00:01,000 --> 00:00:10,000\n{TEXT}\n".encode(), "text/plain")}
    )
    assert response.status_code == 201, response.text
    source = response.json()
    segments = deepcopy(source["segments"])
    segments[0]["text"] += " Additional context."
    response = client.patch(
        API + "/transcripts/" + source["id"], json={"version": source["version"], "title": "Edited", "segments": segments}
    )
    assert response.status_code == 200, response.text
    assert response.json()["original_segments"][0]["text"] == TEXT
    assert response.json()["segments"][0]["start"] == 1


def test_invalid_and_oversized_inputs(client, monkeypatch):
    assert client.post(API + "/transcripts/text", json={"text": ""}).status_code == 422
    assert client.post(API + "/transcripts/text", json={"text": "short"}).status_code == 422
    monkeypatch.setattr(get_settings(), "max_transcript_chars", 100)
    assert client.post(API + "/transcripts/text", json={"text": TEXT}).status_code == 422
    response = client.post(API + "/transcripts/upload", files={"file": ("pretend.txt", b"%PDF-binary", "text/plain")})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_file_content"


def test_failed_chunks_preserved_and_retry_resumes(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_chunk_chars", 2000)

    class FailingProvider(LocalExtractiveProvider):
        calls = 0

        async def generate(self, *args, **kwargs):
            self.calls += 1
            if self.calls == 2:
                raise ServiceError("provider_connection", "Service disconnected.")
            return await super().generate(*args, **kwargs)

    failing = FailingProvider()
    monkeypatch.setattr("app.services.tasks.get_provider", lambda: failing)
    transcript, analysis = create_guide(client, (TEXT + "\n\n") * 30)
    assert analysis["status"] == "partial", analysis
    assert analysis["processed_chunks"] == 1
    assert analysis["guide"]["_meta"]["partial"] is True
    path = API + "/analyses/" + analysis["id"]
    assert client.patch(path, json={"revision": analysis["revision"], "section": analysis["guide"]["sections"][0]}).status_code == 409
    assert client.patch(path, json={"revision": analysis["revision"], "notes": "Keep my partial-guide personal notes"}).status_code == 200
    original_chunk_count = analysis["guide"]["_meta"]["chunks"]
    monkeypatch.setattr(get_settings(), "ai_chunk_chars", 8000)
    monkeypatch.setattr("app.services.tasks.get_provider", LocalExtractiveProvider)
    retry = client.post(API + "/tasks/" + analysis["task"]["id"] + "/retry").json()
    asyncio.run(run_task(retry["id"]))
    finished = client.get(API + "/analyses/" + analysis["id"]).json()
    assert finished["status"] == "complete", finished
    assert finished["notes"] == "Keep my partial-guide personal notes"
    assert finished["guide"]["_meta"]["processed_segments"] == len(transcript["segments"])
    assert finished["guide"]["_meta"]["chunks"] == original_chunk_count


def test_section_regeneration_preserves_other_sections(client):
    _, guide = create_guide(client)
    path = API + "/analyses/" + guide["id"]
    response = client.post(path + "/regenerate", json={"revision": guide["revision"], "section": "concepts", "level": "advanced"})
    assert response.status_code == 202, response.text
    asyncio.run(run_task(response.json()["id"]))
    regenerated = client.get(path).json()
    assert regenerated["revision"] == guide["revision"] + 1
    assert regenerated["guide"]["sections"][0] == guide["guide"]["sections"][0]
    assert regenerated["guide"]["flashcards"] == guide["guide"]["flashcards"]


def test_quiz_and_flashcard_reviews_persist(client):
    _, guide = create_guide(client)
    url = API + "/analyses/" + guide["id"]
    result = client.post(url + "/quiz/attempts", json={"answers": {q["id"]: q["answer"] for q in guide["guide"]["quiz"]}})
    assert result.status_code == 201, result.text
    assert all(q["correct"] is None for q in result.json()["questions"])
    assert len(client.get(url + "/quiz/attempts").json()) == 1
    card = client.get(API + "/flashcards").json()["items"][0]
    review = client.post(url + "/flashcards/review", json={"card_id": card["id"], "rating": "easy"})
    assert review.status_code == 201
    assert review.json()["interval_days"] == 3
    assert client.get(API + "/stats").json()["cards_reviewed"] == 1
    assert client.get(API + "/flashcards").json()["due_count"] == len(guide["guide"]["flashcards"]) - 1


def test_signout_login_adopts_guest_work(client):
    register(client)
    client.post(API + "/auth/logout")
    client.headers["X-CSRF-Token"] = client.get(API + "/session").json()["csrf_token"]
    _, guide = create_guide(client)
    assert client.post(API + "/auth/login", json={"email": "learner@example.com", "password": "incorrect"}).status_code == 401
    response = client.post(API + "/auth/login", json={"email": "learner@example.com", "password": "a-strong-test-password"})
    assert response.status_code == 200, response.text
    client.headers["X-CSRF-Token"] = response.json()["csrf_token"]
    assert client.get(API + "/analyses/" + guide["id"]).status_code == 200


def test_youtube_unavailable_never_fakes_transcript(client, monkeypatch):
    async def unavailable(self, video_id, language, progress):
        await progress("Checking authorization", {"metadata": {"title": "Requested video"}})
        raise ServiceError("access_not_authorized", "Use manual input; access was not authorized.")

    monkeypatch.setattr(OfficialYouTubeRetriever, "retrieve", unavailable)
    task = client.post(API + "/youtube/retrieve", json={"url": "https://youtu.be/dQw4w9WgXcQ"}).json()
    asyncio.run(run_task(task["id"]))
    result = client.get(API + "/tasks/" + task["id"]).json()
    assert result["status"] == "failed" and result["error_code"] == "access_not_authorized"
    assert "transcript_id" not in result["result"]
    assert client.get(API + "/analyses").json()["total"] == 0


def test_youtube_success_replaceable_adapter(client, monkeypatch):
    from app.services.transcripts import parse_plain

    async def retrieve(self, video_id, language, progress):
        return RetrievedTranscript(
            video_id, {"title": "Authorized lesson", "availability": "retrieved"}, TEXT, parse_plain(TEXT), "en", "test-authorized-adapter"
        )

    monkeypatch.setattr(OfficialYouTubeRetriever, "retrieve", retrieve)
    task = client.post(API + "/youtube/retrieve", json={"url": "https://youtu.be/dQw4w9WgXcQ"}).json()
    asyncio.run(run_task(task["id"]))
    result = client.get(API + "/tasks/" + task["id"]).json()
    source = client.get(API + "/transcripts/" + result["result"]["transcript_id"]).json()
    assert source["text"] == TEXT and source["source_type"] == "youtube"


def test_html_export_escapes_scripts(client):
    _, guide = create_guide(client, TEXT + ' <script>alert("xss")</script>')
    html = client.get(API + "/analyses/" + guide["id"] + "/export?format=html").text
    assert "<script>" not in html and "&lt;script&gt;" in html
