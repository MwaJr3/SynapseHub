"""OpenLearn Commons API journeys: rights, licenses, translations, moderation."""


def make_resource(client, title="Fractions worksheet", license_name="CC BY 4.0", source_url=""):
    return client.post("/api/resources", json={
        "title": title, "license": license_name, "source_url": source_url,
        "creator": "Demo Creator", "rights_confirmed": "yes",
    })


def test_upload_requires_rights_and_blocks_duplicates(app_env):
    from conftest import register

    contributor = register(app_env, "c@example.com", "contributor")
    missing = contributor.post("/api/resources", json={"title": "X", "rights_confirmed": "no"})
    assert missing.status_code == 400 and "rights" in missing.json()["detail"].lower()

    first = make_resource(contributor)
    assert first.status_code == 200
    dupe = make_resource(contributor, title="fractions worksheet!")  # normalized title match
    assert dupe.status_code == 409 and "duplicate" in dupe.json()["detail"].lower()


def test_license_blocks_adaptation_when_not_permitted(app_env):
    from conftest import register

    contributor = register(app_env, "c@example.com", "contributor")
    arr = make_resource(contributor, title="All rights thing", license_name="All Rights Reserved")
    denied = contributor.post(f"/api/resources/{arr.json()['id']}/adaptations", json={"title": "A", "body": "b"})
    assert denied.status_code == 400 and "not permitted" in denied.json()["detail"]

    unknown = make_resource(contributor, title="Mystery thing", license_name="Unknown")
    denied2 = contributor.post(f"/api/resources/{unknown.json()['id']}/adaptations", json={"title": "A", "body": "b"})
    assert denied2.status_code == 400 and "no legal certainty" in denied2.json()["detail"]

    by = make_resource(contributor, title="Open thing")
    allowed = contributor.post(f"/api/resources/{by.json()['id']}/adaptations", json={"title": "A", "body": "b"})
    assert allowed.status_code == 200 and "license_obligation" in allowed.json()


def test_translation_review_hides_unapproved(app_env):
    from conftest import register

    contributor = register(app_env, "c@example.com", "contributor")
    translator = register(app_env, "t@example.com", "translator")
    reviewer = register(app_env, "r@example.com", "reviewer")

    adaptation = contributor.post(f"/api/resources/{make_resource(contributor).json()['id']}/adaptations",
                                  json={"title": "Adapted", "body": "body"}).json()
    translation = translator.post(f"/api/adaptations/{adaptation['id']}/translations",
                                  json={"language": "fr", "target_text": "texte", "machine": "yes"}).json()
    assert "Machine translation draft" in translation["label"]

    # public (contributor) view does not expose unapproved translations at all
    public_view = contributor.get(f"/api/adaptations/{adaptation['id']}").json()
    assert public_view["translations"] == []

    # illegal direct approval from draft is rejected
    assert reviewer.post(f"/api/translations/{translation['id']}/transition", json={"status": "approved"}).status_code == 400
    assert reviewer.post(f"/api/translations/{translation['id']}/transition", json={"status": "in_review"}).status_code == 200
    approved = reviewer.post(f"/api/translations/{translation['id']}/transition", json={"status": "approved", "note": "checked"})
    assert approved.json()["status"] == "approved"
    now_public = contributor.get(f"/api/adaptations/{adaptation['id']}").json()
    assert now_public["translations"][0]["target_text"] == "texte"


def test_review_takedown_and_reports(app_env):
    from conftest import register

    contributor = register(app_env, "c@example.com", "contributor")
    reviewer = register(app_env, "r@example.com", "reviewer")
    resource_id = make_resource(contributor, title="Flagged resource").json()["id"]

    assert contributor.post(f"/api/resources/{resource_id}/review", json={"status": "approved"}).status_code == 403
    assert reviewer.post(f"/api/resources/{resource_id}/review", json={"status": "approved"}).status_code == 200

    report = contributor.post(f"/api/resources/{resource_id}/reports", json={"reason": "rights concern"})
    assert report.status_code == 200
    reports = reviewer.get("/api/reports").json()
    assert reports and reports[0]["reason"] == "rights concern"

    assert reviewer.post(f"/api/resources/{resource_id}/review", json={"status": "takedown"}).status_code == 200
    assert contributor.get(f"/api/resources/{resource_id}").status_code == 404  # gone from access
