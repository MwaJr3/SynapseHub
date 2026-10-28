# AI Music & Vocal Part Separator

A standalone full-stack workspace for separating a mixed recording into synchronized music stems, analysing the vocal lines inside the vocal stem, practising individual parts, and exporting only the results the system can justify.

> **Important honesty note:** a single mixed recording does not contain enough information to recover every singer perfectly. Level-1 stems are real source-separation outputs, but they can still contain bleed. Level-2 voice-part files are **experimental AI/DSP reconstructions**, not recovered studio multitracks. When the evidence is insufficient, the app reports **Unknown** or withholds a part instead of creating a misleading empty file.

## What it does

### Level 1 — music stems

Depending on the selected profile and the engine actually available, a job can produce:

- Original mix
- Vocals
- Instrumental
- Drums
- Bass
- Piano and Guitar when a supporting ML engine is genuinely available
- Other / remaining accompaniment

The application uses a model abstraction with a Demucs adapter plus a real classical-DSP engine. In **Auto** mode it uses Demucs only when the package and weights are truly available; otherwise it visibly falls back to the DSP engine. The DSP engine uses spectral/harmonic/percussive soft masking and is constructed so its Level-1 components sum back to the input mix.

### Level 2 — vocal-line analysis and reconstruction

When vocal analysis is enabled, the vocal stem is processed through:

1. Vocal activity and polyphonic pitch estimation
2. Pitch-track fragment linking using voice-leading/continuity rules
3. Persistent voice-track formation
4. Range, pitch-distribution, continuity and weak timbral evidence
5. Probabilistic classification into Soprano, Alto, Contralto, Tenor, Baritone, Bass-baritone, Bass or Unknown
6. Harmonic soft-mask reconstruction for lines that pass duration/confidence gates

The UI displays estimated ranges, voiced seconds, class probabilities, confidence labels, pitch tracks and the reason a line was withheld when applicable.

### Practice workspace

- Synchronized multi-stem playback
- Solo, mute, gain and pan
- Original A/B comparison
- Presets such as vocals only, instrumental, rhythm section and voice parts
- Loop region controls
- Pitch-preserving playback-rate control where supported by the browser
- One-click practice solo from a detected voice card
- Waveforms and an estimated multi-voice pitch roll
- Per-stem quality indicators and warnings
- User labels and voice-classification corrections stored separately from the system result

### Export

- Individual stem downloads in WAV, FLAC or MP3
- ZIP bundles containing only stems that actually exist
- `processing-report.json` and analysis metadata in exports
- Short-lived, owner-bound signed URLs for browser streams, downloads and ZIP files

## Quick start — local development

### Prerequisites

- Python 3.11+
- Node.js 20+ and npm
- Optional but recommended: `ffmpeg` for M4A/AAC and some compressed-media workflows

### 1. Start the backend

From the repository root:

```bash
cd vocal-separator
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The zero-config local backend uses SQLite and an in-process bounded job queue.

### 2. Start the web workspace

In a second terminal:

```bash
cd vocal-separator/web
npm install
npm run dev
```

Open the Vite URL shown in the terminal—by default:

- Web: <http://localhost:5500>
- API health: <http://localhost:8000/api/health>

The browser uses same-origin `/api` URLs. Vite proxies them to the backend during development.

### 3. Use the app

1. Register or log in.
2. Create a project.
3. Upload a supported audio file.
4. Select a stem profile, quality preset and engine mode.
5. Enable vocal analysis if you want detected voice lines.
6. Start separation and monitor staged progress.
7. Inspect stems and voice evidence in the mixer.
8. Practice, relabel or correct a classification if needed.
9. Download individual stems or create a ZIP export.

Only upload audio you own or are legally entitled to process.

## Quick start — Docker Compose

```bash
cd vocal-separator
cp .env.example .env
# Edit JWT_SECRET and POSTGRES_PASSWORD before any non-local deployment.
docker compose up --build
```

Services:

- Web/Nginx on `${WEB_PORT:-5500}`
- FastAPI on `${API_PORT:-8000}`
- Redis-backed worker
- PostgreSQL
- Redis
- Shared persistent audio/data volume

The Docker backend includes `ffmpeg` and `libsndfile`. Set `INSTALL_ML=true` only when you intentionally want the much larger optional PyTorch/Demucs/CREPE dependency set; model weights still need to be available to the running environment.

## Supported input

The server validates uploads using content/magic-byte inspection and codec probing—not extension alone. Native/lightweight support includes common WAV, FLAC, MP3, OGG and AIFF inputs. M4A/AAC require `ffmpeg`; if it is unavailable, the app reports that limitation instead of pretending the file was decoded.

Default limits are configurable:

- Maximum upload: 100 MB
- Maximum duration: 1200 seconds (20 minutes)
- Retention setting: 7 days

## Configuration

Copy `.env.example` to `.env` for Compose, or export the relevant variables for local backend runs. Important settings include:

- `JWT_SECRET`, `JWT_TTL_HOURS`, `DOWNLOAD_TOKEN_TTL`
- `DATABASE_URL`
- `QUEUE_BACKEND` (`inline` or `redis`)
- `REDIS_URL`
- `DATA_DIR`, `STORAGE_DIR`
- `MAX_UPLOAD_MB`, `MAX_DURATION_S`, `RETENTION_DAYS`
- `WORKER_THREADS`
- `SEPARATION_ENGINE` (`auto`, `dsp` or `demucs`)
- `DEMUCS_MODEL`
- `FFMPEG_BINARY`
- `ADMIN_EMAIL`

Never use the example secrets in production.

## Project structure

```text
vocal-separator/
├── backend/
│   ├── app/
│   │   ├── audio_io.py       # Audio loading/writing and ffmpeg fallback
│   │   ├── config.py         # Environment-driven settings
│   │   ├── db.py             # SQLAlchemy models and initialization
│   │   ├── dsp.py            # STFT, masks and signal helpers
│   │   ├── engines.py        # Separation model registry/adapters + DSP engine
│   │   ├── jobs.py           # Bounded inline queue and Redis worker loop
│   │   ├── main.py           # FastAPI API and signed media routes
│   │   ├── pipeline.py       # Staged separation/analysis/export pipeline
│   │   ├── quality.py        # Reference-free stem quality metrics
│   │   ├── security.py       # Password hashing, JWT auth, signed tokens
│   │   ├── storage.py        # Traversal-protected local storage
│   │   ├── validation.py     # Magic-byte/codec/limit validation
│   │   ├── vocal.py          # Pitch tracking, voice tracks, classification, masks
│   │   └── worker.py         # Standalone Redis worker entrypoint
│   ├── tests/                # Synthetic SATB/DSP/API security tests
│   └── requirements*.txt
├── web/
│   ├── src/
│   │   ├── App.tsx           # Authenticated workspace and job workflow
│   │   ├── api.ts            # Typed API/session client
│   │   ├── components/       # Waveform, PitchRoll and StemMixer
│   │   └── lib/utils.ts      # Formatting, confidence and stem helpers
│   └── nginx/                # Production same-origin API proxy
├── docs/
│   ├── ARCHITECTURE.md
│   ├── AUDIO_ML_STRATEGY.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── ML_NOTES.md
│   └── ROADMAP.md
├── docker-compose.yml
└── .env.example
```

## Verification

Backend tests:

```bash
cd vocal-separator/backend
../.venv/bin/python -m pytest tests -q
```

Current verified backend result in this workspace: **8 passed**. The suite covers exact-sum DSP stems, sample alignment, synthetic SATB tracking/reconstruction, honest ambiguous classification, the complete authenticated API flow, owner scoping and signed no-header browser media/export URLs.

Web build:

```bash
cd vocal-separator/web
npm install
npm run build
```

The web TypeScript/Vite production build passes.

On the synthetic SATB fixture, all four ground-truth voices were detected in 100% of steady middle-of-note frames, and soprano SNR improved from 1.68 dB in the vocal mix to 13.35 dB in the reconstructed stem. Synthetic results validate the pipeline mechanics; they are not a promise for arbitrary commercial mixes.

## Privacy and security

- Passwords are salted and hashed; API authentication uses bearer JWTs.
- Projects, audio, jobs, stems and exports are owner-scoped.
- Browser playback/downloads use short-lived HMAC capability tokens bound to the resource and owner.
- Uploads are size/duration limited and validated by content and codec.
- Stored file paths are generated server-side and traversal-protected.
- Important actions are audit-logged.
- User corrections never overwrite the original system classification.

For production, use HTTPS, strong secrets, managed PostgreSQL/Redis, private object storage, malware scanning, backups, monitoring and a documented retention/deletion policy.

## Known limitations

- Dense choirs, unison singing, heavy reverb, distortion and overlapping harmonics can make individual-line recovery unreliable.
- Alto, contralto and tenor ranges overlap; Unknown is often the correct product behaviour.
- DSP separation has more bleed than a properly deployed neural model.
- Demucs/CREPE adapters require their packages **and model weights**; package installation alone does not make an ML engine available.
- Browser pitch-preserving tempo support varies by browser.
- The local storage adapter is suitable for a single-node deployment; multi-node production should move audio to object storage.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the staged path toward stronger neural separation, diarization, transcription and cloud-scale processing.
