import { Badge, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function ConfigRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-sm">{label}</strong>
        <Badge tone={value ? 'accent' : 'neutral'}>{value || 'Not configured'}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}

export default async function AdminSettingsPage() {
  await requireUser();
  return (
    <div className="space-y-4">
      <Section title="Site configuration state">
        <p className="text-sm text-muted">
          These are configurable fields, filled from environment configuration.
          Unconfigured fields stay empty — values are never invented. Each must
          be supplied before public launch.
        </p>
        <div className="mt-3 grid gap-2">
          <ConfigRow
            label="Site URL"
            value={process.env.NEXT_PUBLIC_SITE_URL ?? ''}
            note="Used for canonical URLs and the sitemap once a domain exists."
          />
          <ConfigRow
            label="Contact delivery — Velaqori Systems"
            value={process.env.CONTACT_VELAQORI_EMAIL ?? process.env.CONTACT_FORM_ENDPOINT ?? ''}
            note="Without a configured channel, the contact form honestly reports setup-required."
          />
          <ConfigRow
            label="Contact delivery — Tamuzi Learning"
            value={process.env.CONTACT_TAMUZI_EMAIL ?? process.env.CONTACT_FORM_ENDPOINT ?? ''}
            note="Without a configured channel, the contact form honestly reports setup-required."
          />
          <ConfigRow
            label="Database"
            value={process.env.DATABASE_URL ? 'PostgreSQL (DATABASE_URL set)' : 'Embedded PGlite (development)'}
            note="Production deployments must set DATABASE_URL to a PostgreSQL 14+ instance."
          />
          <ConfigRow
            label="Resume storage"
            value={`${process.env.STORAGE_PROVIDER ?? 'local'}${process.env.S3_BUCKET ? ` · ${process.env.S3_BUCKET}` : ''}`}
            note="S3-compatible storage is required for production resume delivery."
          />
          <ConfigRow
            label="AUTH_SECRET"
            value={process.env.AUTH_SECRET ? 'set' : ''}
            note="Required for production session signing. Demo seeds run without it in development only."
          />
        </div>
      </Section>

      <Section title="Before public launch">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Supply legal names and registration details for both companies (currently empty).</li>
          <li>Replace all illustrative visuals with genuine application screenshots.</li>
          <li>Configure real contact channels per company and verify the delivery path.</li>
          <li>Replace seed/demo people and accounts with real, verified records.</li>
          <li>Have legal review replace the working privacy and terms templates.</li>
          <li>Configure product demo/source URLs only where real deployments exist.</li>
          <li>Run the full test suite and accessibility audit in the deployment environment.</li>
        </ol>
      </Section>
    </div>
  );
}
