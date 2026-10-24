# Dependencies, licenses and updating

Runtime Python inputs are in `backend/requirements.txt`, development inputs in `requirements-dev.txt`. Hashed/pinned `requirements.lock` and `requirements-dev.lock` are resolved for CPython 3.13. Install using `pip install --require-hashes -r ...`. The plain inputs explain intended ranges; they are not the reproducible release install path. Uvicorn uses the portable asyncio/h11 path; no Redis/queue/browser service is required for normal app operation.

Frontend dependencies and exact transitive versions are in `frontend/package.json` / `package-lock.json`. Use supported Node and `npm ci`. Tailwind 4 is configured through PostCSS/CSS, not an unused v3 config. Vitest, Playwright, axe, Ruff and pytest are development tools, not runtime external services. Local font assets are supplied by Fontsource packages.

Audit snapshots: `npm-audit.json`, `python-audit.json` (runtime) and `python-dev-audit.json` (development lock). They report the advisories known at execution time, not a timeless security guarantee. Review new advisories and changelogs regularly; do not blindly apply major upgrades to a running service.

The runtime inputs include an explicit `certifi>=2026.10.19` security floor for PYSEC-2026-4320. The delivered locks resolve `certifi==2026.10.23`; reinstall or rebuild when updating trust bundles.

To refresh Python locks in a dedicated development environment with pip-tools:

```bash
pip-compile --generate-hashes --no-emit-index-url --no-emit-trusted-host --output-file=backend/requirements.lock backend/requirements.txt
pip-compile --generate-hashes --no-emit-index-url --no-emit-trusted-host --constraint=backend/requirements.lock --output-file=backend/requirements-dev.lock backend/requirements-dev.txt
```

Reinstall/test from the locks. Frontend updates must refresh `package-lock.json`, pass component/type/build/browser checks and accessibility scans, and be audited again. Tests never need a paid provider key; keep external adapters mocked and add a separate explicit live smoke test when changing provider contracts.

Important third-party projects include React, Vite, TypeScript, Tailwind, TanStack Query, Radix, Lucide, React Markdown, FastAPI, SQLAlchemy, Alembic, Pydantic, HTTPX, Argon2, python-docx and psycopg. They retain their own licenses and notices. DM Sans and Manrope use the SIL Open Font License through their font packages; Lucide and other packages include their licenses with installed distributions. This is a practical inventory, not an exhaustive legal SBOM. Review all applicable package/image/font licenses before redistribution, especially when distributing a built container.

No separate redistribution license for the newly authored project has been chosen on the user's behalf. Select one before public release. Dependency licenses are not replaced by this statement. No downloaded stock imagery or invented asset attribution is included; interface artwork is authored SVG/CSS.
