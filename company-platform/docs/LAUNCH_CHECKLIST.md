# Launch checklist

Everything below must be resolved before this platform is deployed publicly.
Fields left empty are intentional — values are never invented.

## Legal and company identity

- [ ] Supply the official legal name and registration details for Velaqori
      Systems (`companies.legalName`, `registrationNote` via admin/seed).
- [ ] Supply the official legal name and registration details for Tamuzi Learning.
- [ ] Complete trademark checks and replace the working names if required.
- [ ] Have legal review replace the working privacy templates
      (`/privacy/[companySlug]`) with reviewed policy text.
- [ ] Have legal review replace the working terms templates
      (`/terms/[companySlug]`).
- [ ] Confirm both companies are presented independently everywhere
      (no shared-liability or parent-subsidiary language) — one final review pass.

## Contact and delivery

- [ ] Configure `CONTACT_VELAQORI_EMAIL` (or `CONTACT_FORM_ENDPOINT`) and verify
      delivery end to end. Until then the contact form honestly reports
      "Recorded — delivery not yet configured".
- [ ] Configure `CONTACT_TAMUZI_EMAIL` and verify delivery.
- [ ] Decide and document retention/deletion handling for contact submissions.

## Accounts and people

- [ ] Create the real platform-operator account (set `role` to
      `PLATFORM_OPERATOR` for the deployment owner) with a strong password and
      `AUTH_SECRET` set.
- [ ] Create real company editor accounts with explicit memberships.
- [ ] Remove or replace the three synthetic demo accounts
      (`demo.*@example.com`) and the two fictional demo profiles.
- [ ] Mwangala Chisuse: enter verified education/certification records in the
      member dashboard (the seed intentionally leaves them empty).
- [ ] Configure Mwangala's personal portfolio URL in the member dashboard —
      the "Visit Personal Portfolio" button stays hidden until then, and the
      portfolio remains a standalone site.

## Content

- [ ] Replace every illustrative concept visual with genuine application
      screenshots (they are labelled "Illustrative concept visual").
- [ ] Verify each case study's `verificationNote` items against the real
      implementations; resolve the flagged unverified details.
- [ ] Configure product `liveDemoUrl`/`repositoryUrl` only where real
      deployments/repositories exist — buttons stay hidden otherwise.
- [ ] Review product statuses against reality (PROTOTYPE/BUILT/PILOT/LIVE/
      MAINTENANCE/ARCHIVED) and update `statusNote` accordingly.
- [ ] Publish the case studies and products that pass review via
      `/admin/products` and `/admin/case-studies` (or keep them published and
      confirm each page reads correctly).

## Infrastructure

- [ ] Set `DATABASE_URL` to a PostgreSQL 14+ instance (PGlite is for
      development only).
- [ ] Set `STORAGE_PROVIDER=s3` with bucket credentials for resume storage.
- [ ] Set `AUTH_SECRET` and `NEXT_PUBLIC_SITE_URL`.
- [ ] Run `npm run check` in the deployment pipeline and keep it green.
- [ ] Run an independent accessibility audit (EduAccess and the shared design
      system make no conformance claims without one).
- [ ] Configure TLS, backups, and monitoring appropriate to real user data.
