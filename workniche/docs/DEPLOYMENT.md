# Deploying WorkNiche

## Requirements

- Node.js 20+
- PostgreSQL 14+ (or leave `DATABASE_URL` unset to run on the embedded
  PGlite file — fine for evaluation, not for multi-instance production)

## Steps

1. **Install and build**

   ```bash
   npm ci
   npm run build
   ```

2. **Configure**

   Copy `.env.example` and set:

   | Variable | Notes |
   | --- | --- |
   | `AUTH_SECRET` | Required. Long random string. |
   | `NEXT_PUBLIC_APP_URL` | The public origin, e.g. `https://workniche.example`. |
   | `DATABASE_URL` | PostgreSQL connection string. |
   | `STORAGE_PROVIDER` | `local` (default) or `s3`. |
   | `S3_*` | Required when `STORAGE_PROVIDER=s3`. |
   | `AUTH_GOOGLE_*` / `AUTH_GITHUB_*` | Optional OAuth. |

3. **Migrate**

   ```bash
   npm run db:migrate
   ```

   Migrations are plain SQL in `drizzle/`, applied once each and recorded in
   `_migrations`.

4. **Run**

   ```bash
   npm run start          # HTTP server
   npm run worker         # notification worker (run periodically, e.g. cron)
   ```

   The worker is idempotent: re-running it never duplicates notifications.

5. **First administrator**

   The seed creates `admin@workniche.example` with password
   `demo-password-123` **for demonstration only**. For a real deployment, do
   not run `db:seed`; create the first account through `/register`, then flip
   its role to `ADMIN` in the database, and change every seeded credential.

## Notes

- **Trust proxy**: the Auth.js config sets `trustHost` so the app works behind
  platform preview proxies; `AUTH_TRUST_HOST=false` turns that off.
- **File storage**: local storage writes under `LOCAL_STORAGE_DIR` (default
  `./data/uploads`). Only `/api/files/[id]` serves stored files, after an
  authorization check.
- **Email**: this build never fabricates delivery. Until an email provider is
  configured, flows that would send mail state that plainly.
- **Backups**: back up the PostgreSQL database and the storage bucket (or
  upload directory) together — résumé rows reference storage keys.
