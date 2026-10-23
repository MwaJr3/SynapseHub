"""Saved-calculation CRUD and ownership tests."""


def test_save_list_delete_roundtrip(authed_client):
    save = authed_client.post(
        "/api/calculations",
        json={"name": "Divider A", "kind": "divider", "inputs": {"supply_v": 5}, "result": {"value": 3.3}},
    )
    assert save.status_code == 200
    calc_id = save.json()["id"]

    listing = authed_client.get("/api/calculations").json()
    assert len(listing) == 1
    assert listing[0]["name"] == "Divider A"
    assert listing[0]["inputs"] == {"supply_v": 5}

    assert authed_client.delete(f"/api/calculations/{calc_id}").status_code == 200
    assert authed_client.get("/api/calculations").json() == []


def test_saved_calculations_are_private(authed_client, second_client):
    save = authed_client.post(
        "/api/calculations",
        json={"name": "Mine", "kind": "ohm", "inputs": {}, "result": {"value": 1}},
    ).json()
    assert second_client.get("/api/calculations").json() == []
    assert second_client.delete(f"/api/calculations/{save['id']}").status_code == 404


def test_requires_authentication(client):
    assert client.get("/api/calculations").status_code == 401
    assert client.post("/api/calculations", json={"name": "x", "kind": "y", "inputs": {}, "result": {}}).status_code == 401
