/**
 * Permission-checked resume download. Public access only while the resume is
 * explicitly published; withdrawal or unpublishing kills the download.
 */
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getSessionActor } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { auditEvents, personProfiles, resumeAssets } from '@/lib/db/schema';
import { canDownloadResume } from '@/lib/resume-policy';
import { getStorage } from '@/lib/storage';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const db = getDb();

  const [row] = await db
    .select({
      resume: resumeAssets,
      profile: personProfiles,
    })
    .from(resumeAssets)
    .innerJoin(personProfiles, eq(personProfiles.id, resumeAssets.personProfileId))
    .where(eq(resumeAssets.id, id))
    .limit(1);

  if (!row) {
    return new NextResponse('Not found', { status: 404 });
  }

  const actor = await getSessionActor();
  const allowed = canDownloadResume(
    {
      resumePublished: row.resume.published,
      resumeDeleted: row.resume.deletedAt != null,
      profilePublished: row.profile.publicationState === 'PUBLISHED',
      ownerUserId: row.profile.userId,
    },
    actor?.id ?? null,
  );

  if (!allowed) {
    // Private or withdrawn resumes are unreadable to everyone else.
    return new NextResponse('Not found', { status: 404 });
  }

  await db.insert(auditEvents).values({
    actorId: actor?.id ?? null,
    action: 'resume.download',
    resourceType: 'resume_asset',
    resourceId: row.resume.id,
  });

  const stream = await getStorage().getStream(row.resume.storageKey);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${row.resume.filename.replace(/[^\w.-]/g, '_')}"`,
      'X-Robots-Tag': 'noindex',
    },
  });
}
