# URLShield — phishing URL detection model (CLI)

Cybersecurity catalogue **Project 19** (Expert).

## Overview
Trains a transparent logistic-regression classifier over **12 structural URL
features**, evaluates it on a held-out split, and scores new URLs with
probability estimates and per-feature explanations.

## ML-honesty requirements (enforced + tested)
- The bundled dataset is **SYNTHETIC and fictional** (deterministic, generated
  in-repo; documented source/limitations). Metrics describe this split only —
  **real-world performance is unverified** and says so in-product.
- **Predictions are model estimates, never proof**; `not-flagged` is **not a
  safety guarantee** (disclaimer on every result).
- **URLs are never visited** — feature extraction is offline and structural.
- The operating threshold is explicit and user-controllable; it is not tuned
  for a headline number.
- Feature extraction is **independent of the model** (unit-tested separately).

## DSA/performance note
Feature extraction is `O(len(url))`; training is the standard sklearn LR fit on
an `n×12` matrix (bounded by `--samples`); prediction is one `predict_proba`
call — no network, no unbounded work.

## Usage
```bash
python3 -m app.cli train --samples 400 --model urlshield.model
python3 -m app.cli check "https://verify-9999.bank-confirm.ga/login" --model urlshield.model
```

## Testing
`python3 -m pytest tests/ -q` — feature extraction, dataset determinism,
training/eval sanity, threshold gating, model round-trip, small-data rejection,
disclaimer content.

## Limitations
Synthetic data; binary classifier only; no live URL fetching by design.

## Future improvements
Comparison of rule-based vs learned detection (documented trade-offs), feature
ablation, calibration curves.
