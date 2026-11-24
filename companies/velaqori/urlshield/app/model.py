"""Training/evaluation pipeline and a model registry with metadata.

Honesty rules (in-product):
- Training data is SYNTHETIC and labelled demo data generated in this repo.
- A prediction is a MODEL ESTIMATE, not proof that a URL is malicious or safe.
- The operational threshold is chosen for the stated use (fewer false alarms on
  legitimate URLs), never for a headline accuracy figure.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .features import FEATURE_NAMES, extract


class ModelError(ValueError):
    pass


@dataclass
class Evaluation:
    precision: float
    recall: float
    f1: float
    threshold: float
    confusion: dict
    notes: list[str] = field(default_factory=list)


@dataclass
class TrainedModel:
    pipeline: Pipeline
    evaluation: Evaluation
    trained_at: str
    dataset_note: str

    def predict(self, url: str, threshold: float | None = None) -> dict:
        feats = np.array([extract(url).values])
        proba = float(self.pipeline.predict_proba(feats)[0][1])
        thr = self.evaluation.threshold if threshold is None else threshold
        return {
            "url": url,
            "phishing_probability_estimate": round(proba, 3),
            "threshold": thr,
            "label": "flagged-suspicious" if proba >= thr else "not-flagged",
            "features": extract(url).as_dict(),
            "disclaimer": ("A model estimate is NOT proof. 'not-flagged' is NOT a safety guarantee. "
                           "URLs are never visited; features are structural only."),
        }


def train(features: np.ndarray, labels: np.ndarray, threshold: float = 0.5,
          seed: int = 42) -> TrainedModel:
    if len(features) < 30:
        raise ModelError("Need at least 30 labelled samples to train.")
    if not set(np.unique(labels)) <= {0, 1}:
        raise ModelError("Labels must be 0 (legitimate) or 1 (phishing).")
    X_train, X_test, y_train, y_test = train_test_split(
        features, labels, test_size=0.25, random_state=seed, stratify=labels)
    pipeline = Pipeline([("scale", StandardScaler()),
                         ("clf", LogisticRegression(max_iter=500, random_state=seed))])
    pipeline.fit(X_train, y_train)
    proba = pipeline.predict_proba(X_test)[:, 1]
    preds = (proba >= threshold).astype(int)
    confusion = {"tp": int(((preds == 1) & (y_test == 1)).sum()),
                 "fp": int(((preds == 1) & (y_test == 0)).sum()),
                 "tn": int(((preds == 0) & (y_test == 0)).sum()),
                 "fn": int(((preds == 0) & (y_test == 1)).sum())}
    from datetime import datetime, timezone
    return TrainedModel(
        pipeline,
        Evaluation(
            precision=round(float(precision_score(y_test, preds, zero_division=0)), 3),
            recall=round(float(recall_score(y_test, preds, zero_division=0)), 3),
            f1=round(float(f1_score(y_test, preds, zero_division=0)), 3),
            threshold=threshold, confusion=confusion,
            notes=["Held-out 25% stratified split; SYNTHETIC dataset (fictional, generated in-repo).",
                   "Metrics describe this synthetic split only; real-world performance is unverified."]),
        datetime.now(timezone.utc).isoformat(),
        "SYNTHETIC labelled dataset generated in this repository (fictional demo data).")


def save(path: str, model: TrainedModel) -> None:
    import pickle
    with open(path, "wb") as fh:
        pickle.dump({"pipeline": model.pipeline, "evaluation": model.evaluation.__dict__,
                     "trained_at": model.trained_at, "dataset_note": model.dataset_note}, fh)
    # Integrity sidecar: pickle executes code on load, so load() refuses any model
    # file whose SHA-256 does not match the digest written here at training time.
    import hashlib
    with open(path, "rb") as fh:
        digest = hashlib.sha256(fh.read()).hexdigest()
    with open(path + ".sha256", "w") as fh:
        fh.write(digest)
    meta = path + ".json"
    with open(meta, "w") as fh:
        json.dump({"feature_names": list(FEATURE_NAMES), "trained_at": model.trained_at,
                   "dataset_note": model.dataset_note, "evaluation": model.evaluation.__dict__}, fh, indent=2)


def load(path: str) -> TrainedModel:
    import hashlib
    import pickle
    with open(path, "rb") as fh:
        raw = fh.read()
    try:
        with open(path + ".sha256") as fh:
            expected = fh.read().strip()
    except FileNotFoundError as exc:
        raise ValueError(f"Missing integrity file {path}.sha256; refusing to unpickle") from exc
    if hashlib.sha256(raw).hexdigest() != expected:
        raise ValueError("Model file failed integrity check; refusing to unpickle")
    data = pickle.loads(raw)  # nosec B301 - integrity verified above
    return TrainedModel(data["pipeline"], Evaluation(**data["evaluation"]), data["trained_at"], data["dataset_note"])
