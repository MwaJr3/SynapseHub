import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "ns.db")

import pytest
from fastapi.testclient import TestClient
from app.db import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def auth_client(client):
    client.post("/api/auth/register", json={"email": "analyst@example.org", "password": "demo-password-123"})
    r = client.post("/api/auth/login", json={"email": "analyst@example.org", "password": "demo-password-123"})
    assert r.status_code == 200
    return client


def build_pcap(frames):
    import struct
    out = struct.pack("<IHHiIII", 0xA1B2C3D4, 2, 4, 0, 0, 65535, 1)
    for i, frame in enumerate(frames):
        out += struct.pack("<IIII", 1_760_000_000 + i, 0, len(frame), len(frame)) + frame
    return out


def eth_ip(src, dst, proto, payload=b"", sport=0, dport=0):
    import struct
    eth = b"\x00" * 6 + b"\x11" * 6 + struct.pack(">H", 0x0800)
    ip = struct.pack(">BBHHHBBH", 0x45, 0, 20 + len(payload) + (4 if proto in (6, 17) else 0), 0, 0, 64, proto, 0) \
        + bytes(int(x) for x in src.split(".")) + bytes(int(x) for x in dst.split(".")) + (struct.pack(">HH", sport, dport) if proto in (6, 17) else b"")
    return eth + ip + payload
