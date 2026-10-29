"""Tests: feature extraction, training/evaluation, honesty framing."""
from __future__ import annotations

import numpy as np
import pytest

from app.dataset import generate
from app.features import extract
from app.model import ModelError, load, save, train


def test_features_are_structural_and_offline():
    f = extract("https://secure-1234.verify-account.tk/login?id=99")
    d = f.as_dict()
    assert d["has_suspicious_tld"] == 1.0
    assert d["has_ip_host"] == 0.0
    f2 = extract("http://192.168.0.1/admin")
    assert f2.as_dict()["has_ip_host"] == 1.0


def test_empty_url_rejected():
    with pytest.raises(ValueError):
        extract("   ")


def test_dataset_is_deterministic_and_labelled():
    u1, l1 = generate(60, seed=7)
    u2, l2 = generate(60, seed=7)
    assert u1 == u2 and l1 == l2
    assert set(l1) == {0, 1}


def test_train_eval_and_predict_with_honesty(tmp_path):
    urls, labels = generate(300)
    feats = np.array([extract(u).values for u in urls])
    model = train(feats, np.array(labels), threshold=0.5)
    assert model.evaluation.f1 > 0.8        # synthetic separable data
    assert "SYNTHETIC" in model.dataset_note
    result = model.predict("https://verify-9999.bank-confirm.ga/login")
    assert result["label"] in ("flagged-suspicious", "not-flagged")
    assert "NOT proof" in result["disclaimer"] and "NOT a safety guarantee" in result["disclaimer"]


def test_threshold_gates_flagging():
    urls, labels = generate(300)
    feats = np.array([extract(u).values for u in urls])
    model = train(feats, np.array(labels), threshold=0.5)
    strict = model.predict("http://login-verify.top/confirm", threshold=0.99)
    assert strict["threshold"] == 0.99


def test_model_round_trip(tmp_path):
    urls, labels = generate(300)
    feats = np.array([extract(u).values for u in urls])
    model = train(feats, np.array(labels))
    path = str(tmp_path / "m.model")
    save(path, model)
    restored = load(path)
    assert restored.predict("https://example.org/docs")["label"] == \
        model.predict("https://example.org/docs")["label"]


def test_small_dataset_rejected():
    with pytest.raises(ModelError):
        train(np.zeros((5, 12)), np.zeros(5))
