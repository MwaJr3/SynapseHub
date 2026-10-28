# SynapseHub beta release work — 2026-10-28

This is an execution log, not a production-readiness certificate. It supersedes
historical blockers in `SYNAPSEHUB_CONNECTED.md` where noted.

## Decisions

- User approved a **new isolated workspace deployment**, leaving other Vercel apps unchanged.
- Inference will be configured later. No Ollama endpoint/model was provided; generation remains disabled.
- No email-confirmation weakening, synthetic real user registration, paid inference,
  store publication, signing identity or guessed production domain is permitted.

## Dependency remediation

- Expo remains on SDK 55 / React Native 0.83; no untested Expo downgrade.
- `zod` override **4.6.7** removes GHSA-mrhx-c7xc-m3w5. Tests exercise the actual Expo
  plugin/MCP schemas with this major-version override, plus bounded-array early rejection.
- `patch-package --error-on-fail` applies `patches/deepmerge+4.3.1.patch` on every
  mobile install. Both target-copy and source-merge paths reject prototype-sensitive
  `__proto__`, `constructor`, and `prototype` keys, including CJS/UMD distributions.
- Four security/compatibility regressions pass after a clean `npm ci`.
- Mobile audit: **0 high, 0 critical; 7 low entries** still reported against the
  upstream deepmerge/Expo dependency chain. The lockfile preserves its real version;
  findings are not hidden or relabelled. This is a local mitigation, not an upstream
  audited fixed release. Remove the patch/override only after compatible upstream fixes.
- Android/iOS Hermes exports, Expo local dependency check and mobile TypeScript pass.

## Deployment

New Vercel project: `synapsehub-workspace`, project ID
`prj_M0GHRnxrkVF7OqikrNmXgtJf5QAD`. Its settings use the public Supabase URL/key;
there are no service-role keys or model credentials in the deployment.

`api/index.py` and root `requirements.txt` package the same FastAPI application
alongside the Vite SPA, with same-origin `/api` routing. **The root `vercel.json` and
`.vercelignore` were removed on 2026-10-28** with the rest of the deployment wiring
(`docs/deployment/README.md`); a redeployment re-adds them to that project, not to this
repository. The packaging description below records what the attempt did, not what the
tree currently contains. Vercel's upload
ceiling is smaller than the container profile: the API enforces **4 MiB on Vercel**
and **5 MiB in a container**. Platform limits can reject a request before FastAPI
runs; originals stored as bytea also have response-size limits on serverless hosts.
Persistent multi-user rate limiting/jobs and object storage remain release gates.

Deployment result and exact redirect URL are recorded below after build verification.
A Vercel READY state alone is not proof of live user login, PDF subprocess support,
cloud API operation, or inference. The new project's default deployment protection
may require the owner's Vercel login; no protection is silently disabled.

## Runtime probes

```sh
set -a; . backend/.env.local; set +a
.venv/bin/python backend/scripts/check_runtime.py --cloud
# After the operator supplies the actual endpoint + installed model:
.venv/bin/python backend/scripts/check_runtime.py --ollama
# Explicit consent: sends only a fixed, synthetic, non-private citation fixture
.venv/bin/python backend/scripts/check_runtime.py --ollama --generate
```

`--cloud` checks Auth settings are reachable with the publishable key, email
confirmation is required, and anonymous access to the private library is denied.
This does **not** test a signed-in session, mail delivery or a real account.
`--ollama` queries `/api/tags` and requires the configured model to exist.
`--generate` validates citation-bearing output against the synthetic fixture.
Credentials, provider answers and raw exceptions are never printed. An optional
server-only `OLLAMA_API_KEY` supports a protected existing inference endpoint.

Four deterministic probe tests were added; 14 backend tests currently pass. The
runtime workflow can execute probes from a network-enabled GitHub runner after
repository settings are supplied. No synthetic inference result is labelled live.

## Native artifact automation

`.github/workflows/synapsehub-native-release.yml` defines manually dispatched:

- Linux/Windows/macOS Tauri bundles (unsigned internal artifacts), plus resolved Cargo.lock.
- Android **debug-signed test APK**, explicitly not a Play Store release.
- iOS **simulator .app**, explicitly not a signed device IPA or App Store release.

Each job checks actual public deployment configuration before compiling; it must
not silently produce an unconfigured app. Set repository variables:

- `SYNAPSE_SUPABASE_URL`
- `SYNAPSE_SUPABASE_PUBLISHABLE_KEY`
- `SYNAPSE_API_ORIGIN` (the actual reachable HTTPS workspace deployment origin)

Optional runtime settings: `SYNAPSE_OLLAMA_URL`, `SYNAPSE_OLLAMA_MODEL`; credential
`SYNAPSE_OLLAMA_API_KEY` belongs only in GitHub **Secrets**, never a public variable.

The GitHub connection returned **403 Resource not accessible by integration** for
repository-variable creation. No variables were set. An authorized repository
administrator must set these through Settings → Secrets and variables → Actions,
or grant the Arena GitHub connection the appropriate permissions. No credentials
were requested or copied into source as a workaround. Workflow dispatch also needs
appropriate Actions permission and a workflow available on the default branch;
this session does not merge to main automatically.

Native platform tools are still absent locally. A workflow definition and JS bundle
exports are **not compiled/tested installers**. Signing/notarization, physical-device
checks, recovery deep links, privacy review and store submissions remain separate
operator-controlled work. CI artifacts expire after 14 days and are not public releases.

## Outcome of the deployment attempt

- Commit `37da83f` was pushed to this session's branch and submitted to Vercel.
- Deployment `dpl_Gsfv77ighQzs57oz2H1WkSDLxwfq` failed the frontend build because
  unanchored `.vercelignore` entries also removed `src/apps` and
  `src/components/projects`. Commit `2f3571c` anchors exclusions at the repository
  root. A deployment-source regression check now protects those paths in CI.
- The corrected deployment request was denied with **402 Payment Required**, code
  **`api-deployments-free-per-day`**, "more than 100"; Vercel instructed retrying
  after **24 hours**. No additional project/deployment/CLI route was used to bypass
  that quota. The new project exists but **there is no successful release deployment**.
- Supabase Site URL remains `http://localhost:3000`; its allow-list is unchanged.
  Once a corrected build is READY and its actual URL works, set the Site URL and
  exact `/synapsehub` confirmation/recovery redirect there. Do not point user emails
  at the failed deployment. Email login/delivery are still unverified.
- The intended stable alias reported by Vercel is
  `synapsehub-workspace-m-corp2.vercel.app`, but it was **not assigned by the failed
  build** and must not be described as a working application URL.
- GitHub CI run [40643649394](https://github.com/MwaJr3/SynapseHub/actions/runs/40643649394)
  **passed** all three jobs: backend tests, web tests/build/scoped lint, and mobile
  security tests/audit threshold/Android+iOS bundle exports. This is separate from
  the failed Vercel deployment and is not a native installer run.

The web and native file pickers now conservatively cap files at **4 MiB** to fit
Vercel's request envelope. The container API still accepts up to 5 MiB; serverless
accepts 4 MiB. No client-side cap is a substitute for the server's enforced limit.

### Remaining operator sequence

1. After Vercel's deployment quota resets, deploy the **latest commit on
   `arena/a840b561-synapsehub`** into the existing new workspace project. Do not
   redeploy `37da83f`, whose payload exclusions were broken.
2. Verify `/api/health`, the actual frontend, authenticated cloud sync, PDF upload
   and PDF reading on that host. Review platform subprocess/function limits; switch
   to the container profile if the serverless PDF parser cannot run safely.
3. Only after the URL works, configure exact Supabase confirmation/recovery redirects
   and test real email delivery with an authorized account. Confirmation stays on.
4. Set the three documented public GitHub variables through the repository UI;
   review/merge the workflows through the normal PR process and dispatch the native
   artifact workflow. No merge to main was performed by the agent.
5. Provide the existing Ollama URL and installed model through server settings;
   put credentials in protected settings. Run the availability and synthetic
   generation probes. Until then, leave generation disabled.
6. Download internal native artifacts, perform simulator/device tests, then separately
   configure signing/notarization/store publication if those releases are desired.
