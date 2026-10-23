import { Badge, EmptyState, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { personProfiles, resumeAssets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  await requireUser();
  const db = getDb();
  const rows = await db
    .select({
      id: resumeAssets.id,
      filename: resumeAssets.filename,
      sizeBytes: resumeAssets.sizeBytes,
      published: resumeAssets.published,
      createdAt: resumeAssets.createdAt,
      owner: personProfiles.displayName,
      ownerState: personProfiles.publicationState,
    })
    .from(resumeAssets)
    .innerJoin(personProfiles, eq(personProfiles.id, resumeAssets.personProfileId));

  return (
    <Section title="Media assets (resumes)">
      <p className="text-sm text-muted">
        Resume files are the only media assets members can upload. Files are
        private by default; a file is downloadable only while both the file and
        its owner profile are published. Storage provider:{' '}
        <Badge>{process.env.STORAGE_PROVIDER ?? 'local'}</Badge>
      </p>
      {rows.length === 0 ? (
        <EmptyState>No media assets uploaded.</EmptyState>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-4">File</th>
                <th className="py-2 pr-4">Owner</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4">Downloadable</th>
                <th className="py-2">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line">
                  <td className="py-2 pr-4">{row.filename}</td>
                  <td className="py-2 pr-4">{row.owner}</td>
                  <td className="py-2 pr-4">{Math.max(1, Math.round(row.sizeBytes / 1024))} KB</td>
                  <td className="py-2 pr-4">
                    <Badge tone={row.published && row.ownerState === 'PUBLISHED' ? 'accent' : 'neutral'}>
                      {row.published && row.ownerState === 'PUBLISHED' ? 'Public download' : 'Private'}
                    </Badge>
                  </td>
                  <td className="py-2">{row.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
