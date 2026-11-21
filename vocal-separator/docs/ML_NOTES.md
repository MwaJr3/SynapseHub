# ML notes

These notes govern optional neural models in the AI Music & Vocal Part Separator. The goal is reproducibility and honest availability reporting: a model is only considered available when its code, runtime dependencies **and verified weights** can complete an inference smoke test in the target deployment.

## 1. What runs without ML

The default installation runs fully on CPU with:

- an exact-sum classical DSP Level-1 separation engine;
- harmonic/percussive and spectral soft-mask partitioning;
- polyphonic pitch-salience analysis;
- voice-leading track linking;
- probabilistic voice-part classification;
- harmonic-mask vocal-line reconstruction;
- reference-free quality metrics.

No downloads are required for this path, and no output is labelled as Demucs or CREPE unless those systems actually ran.

## 2. Optional dependency set

Install the optional Python packages with:

```bash
pip install -r backend/requirements-ml.txt
```

That file currently includes the integration surface for:

- PyTorch and torchaudio;
- Demucs;
- torchcrepe/CREPE;
- librosa.

Expect a large download and platform-specific binary wheels. Pin exact versions in a production lock/constraints file after validating the target CUDA/CPU image.

## 3. Demucs

### Role

Demucs is the preferred optional neural engine for broad Level-1 separation (for example vocals, drums, bass and other). The backend invokes it through a subprocess adapter and then aligns returned stems to the input timeline before continuing through the normal quality/report/export pipeline.

Default model setting:

```dotenv
SEPARATION_ENGINE=auto
DEMUCS_MODEL=htdemucs
```

### Availability contract

Demucs is considered available only when:

1. the `demucs` package/CLI imports or executes successfully;
2. the selected model can be loaded;
3. required weights are present or can be downloaded from an approved source;
4. a short test input produces aligned output files;
5. the worker has enough RAM/VRAM and temporary disk.

If any step fails:

- `SEPARATION_ENGINE=auto` records the failure and uses DSP;
- `SEPARATION_ENGINE=demucs` fails the job clearly;
- the UI/model registry shows Demucs as unavailable with a reason.

### Deployment recommendations

- Prefer a dedicated GPU worker pool for public traffic.
- Pre-seed weights during image build or mount them from versioned artifact storage.
- Record weight origin, model identifier, version and SHA-256 checksum in deployment notes.
- Do not let first user traffic trigger uncontrolled downloads.
- Benchmark concurrent jobs before increasing worker count; VRAM exhaustion should fail/queue safely, not corrupt partial outputs.
- Treat subprocess stdout/stderr as operational logs; surface only sanitized user-facing failure reasons.

### Licensing and provenance

Review the licence and model-card terms for the exact Demucs release and checkpoint used. Source-code, pretrained-weight and training-data terms may differ. Keep the selected checkpoint's provenance with the deployment record and do not redistribute weights unless the applicable terms allow it.

## 4. CREPE / torchcrepe

### Role

CREPE estimates a dominant fundamental-frequency trajectory and confidence. It can improve pitch confidence for a lead/monophonic passage, but it does **not** by itself separate a choir or identify every simultaneously singing voice.

The current system probes for a usable CREPE backend while its polyphonic DSP salience remains the always-available source for multi-pitch candidates.

### Availability contract

CREPE is available only when:

1. torchcrepe and PyTorch import successfully;
2. the selected CREPE weights load;
3. a synthetic pitched-tone smoke test returns plausible f0/confidence;
4. execution device and batch settings fit worker resources.

A successfully installed Python package with unreachable weights must still be reported as unavailable.

### Integration guidance

When integrating CREPE more deeply:

- use it as evidence, not unquestioned ground truth;
- compare its confidence against multi-pitch salience before suppressing other candidates;
- preserve polyphonic candidates in ensemble passages;
- evaluate pitch accuracy separately on solo, duet and choir fixtures;
- store model/version and confidence in the processing report.

## 5. Other model families

The registry reserves room for Spleeter, MDX and RoFormer-style adapters. A placeholder registry entry is not an executable guarantee.

Before enabling any new model:

1. implement the adapter behind the `SeparationModel` contract;
2. verify input/output stem names and channel/sample-rate handling;
3. align outputs exactly to the source timeline;
4. add availability and smoke-test probes;
5. benchmark quality, runtime and memory;
6. verify software and weight licences;
7. add failure-mode handling and regression fixtures;
8. enable it for a limited quality/profile first.

## 6. Devices and performance

### CPU

- DSP: suitable for local/small deployments.
- Demucs: possible, but long files can be slow and memory-heavy.
- CREPE: feasible for short inputs; batch carefully.

### GPU

- Recommended for neural separation at scale.
- Pin CUDA, PyTorch and driver-compatible images.
- Run one heavy job per GPU initially; measure VRAM before concurrency.
- Keep CPU DSP workers separate from GPU queues so a baseline result remains available.

Long recordings should be chunked by the engine where supported. Chunk boundaries must be cross-faded/reassembled without changing total sample count.

## 7. Evaluation gates

A model should not replace the DSP/auto path merely because it sounds impressive on one song. Evaluate held-out material across solo, duet, small ensemble, choir, live, reverberant and heavily produced recordings.

Recommended Level-1 metrics where references exist:

- SDR / SI-SDR;
- SIR and SAR;
- per-stem energy leakage;
- runtime and peak memory;
- alignment/sample-count equality.

Recommended Level-2 metrics:

- multi-pitch precision/recall/F1 by tolerance window;
- track purity and completeness;
- voice-count accuracy;
- classification accuracy and calibration, including an Unknown/abstention rate;
- per-voice reconstruction SNR/SI-SDR against references;
- percentage of withheld lines that were actually unreliable.

Track results by model/version and quality preset in the processing report and internal benchmark registry.

## 8. Smoke tests

At minimum, run these after changing packages, images or weights:

1. `/api/health` reports the expected engine availability.
2. A short sine/harmonic fixture completes without downloading unexpected artifacts.
3. The synthetic SATB backend tests still pass.
4. A short real-world-style mixture produces aligned stems and a processing report naming the actual engine.
5. For Demucs-only mode, intentionally removing weights produces a clear failure.
6. For Auto mode, the same removal produces a DSP result with a visible fallback warning.

## 9. Security and supply chain

- Download weights only from official or organization-approved artifact sources.
- Verify SHA-256 checksums before first use.
- Prefer safetensors or similarly safer serialization when the model ecosystem supports it.
- Avoid untrusted pickle checkpoints.
- Scan container images and Python dependencies.
- Pin base images and dependency versions for reproducible deploys.
- Keep model caches out of Git; the project `.gitignore` excludes common weight formats and caches.
- Do not include user audio in training or telemetry without explicit consent and a documented legal basis.

## 10. Product language

Use precise claims:

- Say “Demucs ran” only when the job report records that engine.
- Say “DSP fallback” when Auto could not use the neural engine.
- Say “estimated pitch” and “reconstructed voice part,” not “recovered original singer.”
- Say “not enough evidence” instead of forcing a vocal classification.
- Surface expected bleed/artifacts in quality warnings.

Honest provenance is part of the ML system, not marketing copy added afterward.

## 11. Reference material for the lead / backing and practice features

The lead/backing split and the minus-one practice mix were designed with two open-source projects as *references for ideas only*: Ultimate Vocal Remover (karaoke-style lead vs backing vocal separation; the instrumental as the exact complement of the vocals) and StemDeck (typed outcome codes; practice mixes with one part removed and a peak ceiling instead of clipping). No code was copied; StemDeck is AGPL-3.0, so anything derived from its source would carry that licence. The implementations here (`outcomes.py`, `practice.py`, the lead handling in `vocal.py`) are original and DSP-only. A trained karaoke model would be a better lead/backing engine than harmonic masks and could replace the lead stem behind the same API.
