# Roadmap

This roadmap separates what is already working from deliberate next phases. It is a product and engineering plan—not a promise that arbitrary mixed recordings can be converted into perfect studio multitracks.

## Current baseline (implemented)

### Product workflow

- Private accounts, projects and owner-scoped audio libraries
- Upload validation by size, duration, content signature and codec probing
- Level-1 music-stem jobs with staged progress, warnings and cancellation
- Optional Level-2 vocal analysis and confidence-gated voice-part reconstruction
- Synchronized stem mixer with solo/mute/gain/pan, A/B original, presets, loop and tempo practice controls
- Waveforms, estimated pitch roll, voice ranges/probabilities and per-stem quality evidence
- User labels and voice-classification corrections preserved separately from system inference
- Individual WAV/FLAC/MP3 downloads and ZIP exports with processing metadata
- Model registry/admin surface with honest availability notes
- SQLite + inline queue for local use; PostgreSQL + Redis worker scaffolding for Compose

### Audio/ML baseline

- Exact-sum chunked DSP engine for CPU-safe Level-1 separation
- Demucs subprocess adapter with visible fall-safe behaviour
- Polyphonic pitch salience and multi-candidate frame selection
- Voice-leading track linking and material-overlap merging
- Probabilistic Soprano/Alto/Contralto/Tenor/Baritone/Bass-baritone/Bass/Unknown classification
- Harmonic soft-mask reconstruction only for evidence-backed tracks
- Synthetic SATB ground-truth tests plus end-to-end API/security tests

## Phase 1 — Production hardening

**Goal:** make the current MVP safe and operable for a small public deployment.

### Platform

- [ ] Move audio, stems, previews and exports from local disk to private S3/GCS-compatible object storage
- [ ] Add resumable/chunked uploads for large files and unreliable networks
- [ ] Add scheduled retention cleanup for originals, stems, previews, exports and failed intermediates
- [ ] Add full account deletion and user data-export workflows
- [ ] Add per-user upload, active-job and storage quotas
- [ ] Add idempotency keys, retry/backoff and dead-letter handling for queued jobs
- [ ] Add malware/content scanning before decode
- [ ] Add structured logs, metrics, tracing and alerting for queue depth, stage durations and model failures
- [ ] Add backup/restore drills covering database and object storage together
- [ ] Add dependency/container vulnerability scanning and pinned release images

### Product

- [ ] Dedicated job history filters and bulk project cleanup
- [ ] Email verification, password reset and optional OAuth/passkeys
- [ ] Clear storage/retention dashboard for each account
- [ ] Accessibility audit with assistive-technology testing beyond keyboard/focus basics
- [ ] Browser capability report for playback-rate, Web Audio and codec support

### Acceptance criteria

- No user can access another user's media through API IDs or replayed signed URLs.
- Worker failure does not lose job state or silently mark partial output as fully successful.
- Deleting a user/project removes both database records and stored artifacts within the documented policy.
- Queue and storage growth are visible before they become outages.

## Phase 2 — Neural Level-1 quality

**Goal:** make a verified neural engine the normal path while retaining DSP as a transparent baseline/fallback.

### Work

- [ ] Build a dedicated CUDA worker image with pinned PyTorch/Demucs versions
- [ ] Pre-seed and checksum verified Demucs weights; remove first-request downloads
- [ ] Add startup and per-worker inference smoke tests before a worker accepts ML jobs
- [ ] Benchmark Demucs model variants by quality, runtime, RAM and VRAM
- [ ] Evaluate an MDX/RoFormer-class adapter behind the existing `SeparationModel` contract
- [ ] Add per-model and per-profile benchmark fixtures with reference stems
- [ ] Add automatic device/concurrency controls based on measured memory
- [ ] Store exact model, checkpoint, device and runtime provenance in every processing report

### Acceptance criteria

- The model registry reports availability only after a real inference probe succeeds.
- Neural outputs remain sample-aligned and pass the same API/export tests as DSP outputs.
- Quality improvements are demonstrated on held-out mixtures, not only on a demonstration song.
- Auto mode never relabels a fallback result as neural output.

## Phase 3 — Stronger vocal intelligence

**Goal:** improve detection, tracking and labelling of individual vocal lines while preserving the right to abstain.

### Pitch and tracking

- [ ] Integrate verified CREPE/torchcrepe as a confidence source for dominant/monophonic lines
- [ ] Evaluate polyphonic transcription models specifically on duet, quartet and choir material
- [ ] Add singer-embedding diarization to distinguish same-range voices over time
- [ ] Model note onsets/offsets, vibrato and portamento explicitly in track linking
- [ ] Add user tools to split, merge, rename and reassign detected pitch fragments before reconstruction
- [ ] Persist editable track versions rather than overwriting the original analysis

### Classification

- [ ] Build a professionally labelled evaluation set spanning voice types, ages, styles and recording conditions
- [ ] Train/calibrate a classifier using range, tessitura, formant/timbre, vibrato, harmonic envelope and temporal behaviour
- [ ] Report calibrated probabilities and an explicit abstention threshold
- [ ] Measure confusion specifically among alto, contralto and tenor
- [ ] Keep Unknown when the expected error cost is too high

### Reconstruction

- [ ] Evaluate learned mask refinement conditioned on pitch tracks and singer embeddings
- [ ] Improve assignment of consonants, breaths and unvoiced sounds where evidence permits
- [ ] Add per-track mask/energy visualization for expert inspection
- [ ] Add before/after SNR and leakage reporting when reference stems are available in evaluation mode

### Acceptance criteria

- Track purity/completeness and multi-pitch F1 improve on held-out choir fixtures.
- Classification calibration improves without simply reducing the Unknown rate.
- Exported voice parts demonstrate measured target-voice improvement over the aggregate vocal stem.
- Dense unison passages still abstain instead of inventing individual singers.

## Phase 4 — Choir and practice workflows

**Goal:** turn analysis outputs into rehearsal tools that remain honest about estimation error.

### Candidate features

- [ ] Save named loop regions and practice sessions per project
- [ ] Count-in, metronome and section markers
- [ ] Side-by-side estimated pitch and user-recorded rehearsal take
- [ ] Part-dominant, part-muted and “sing against the ensemble” presets per saved section
- [ ] Lyric/section annotations aligned to the timeline
- [ ] Export practice bundles per part with click/section metadata
- [ ] MIDI/MusicXML export clearly labelled as an estimated transcription
- [ ] Choir templates (SATB, SSAA, TTBB, SSAATTBB, custom) used as priors—not forced output counts
- [ ] Director review workflow for approving or correcting tracks before distributing practice stems

### Acceptance criteria

- Practice artifacts retain the source job/model provenance and confidence warnings.
- Missing parts are shown as unavailable, never synthesized merely to complete a template.
- Estimated notation is editable before export.

## Phase 5 — Scale and collaboration

**Goal:** support teams and larger catalogues without weakening privacy or provenance.

### Candidate features

- [ ] Shared projects with role-based permissions (owner, editor, rehearsal viewer)
- [ ] Signed, expiring share links for selected practice bundles
- [ ] Organization workspaces and aggregate storage quotas
- [ ] Batch upload and batch processing queues
- [ ] Public API keys with scoped permissions and webhook job notifications
- [ ] Separate CPU/GPU queues with priority and fair-use scheduling
- [ ] CDN-backed private media delivery through short-lived authorization
- [ ] Regional storage/processing options for privacy-sensitive organizations

### Acceptance criteria

- Sharing never exposes private storage keys or unrelated project artifacts.
- Permission changes take effect for existing signed links within their documented lifetime.
- API and webhook events expose the same honest model/quality provenance as the UI.

## Phase 6 — Research directions

These are research items, not committed product promises:

- End-to-end neural choir separation trained on licensed multitrack choral data
- Joint source separation, diarization and transcription
- Score-informed separation when a user supplies MIDI/MusicXML
- Room/reverb estimation and dereverberation before vocal tracking
- Uncertainty-aware masks that can render “shared/ambiguous energy” as its own inspection stem
- Active-learning review queues using only consented, licensed user corrections
- Real-time or streaming separation for rehearsal monitoring

Each research direction needs a dataset/licence review, an evaluation protocol and a product-language review before release.

## Non-goals

- Claiming perfect recovery of original studio multitracks from a stereo mix
- Forcing every choir template to produce every named part
- Training on uploaded user audio without explicit consent and legal basis
- Removing copyright/ownership responsibilities from uploaders
- Presenting preset names or model names as quality guarantees
- Replacing uncertainty/abstention with a single opaque confidence score

## Suggested release gates

Before a public production launch:

1. Complete Phase 1 retention, quota, scanning, observability and backup items.
2. Run load tests for upload, queueing, worker memory and ZIP export.
3. Run security tests for IDOR/owner scoping and signed-token replay.
4. Publish Terms of Use, Privacy Policy, retention policy and copyright process.
5. Verify all model/software licences and weight provenance.
6. Benchmark the default engine on representative licensed material.
7. Confirm the UI never calls a DSP/fallback or estimated reconstruction something stronger than it is.
