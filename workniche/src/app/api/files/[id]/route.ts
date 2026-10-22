/**
 * The only file-download path. Authorization first, bytes second:
 * a resume is readable by its owner and by the hiring team of any job it was
 * attached to — never by any other employer or candidate.
 */
import { and, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { applications, jobs, organizationMemberships, resumes } from '@/lib/db/schema';
import { getSessionActor } from '@/lib/auth';
import { getStorage } from '@/lib/storage';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const actor = await getSessionActor();
  if (!actor) return new Response('Unauthorized', { status: 401 });

  const db = getDb();
  const [resume] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), isNull(resumes.deletedAt)))
    .limit(1);
  if (!resume) return new Response('Not found', { status: 404 });

  let allowed = resume.userId === actor.id;

  if (!allowed && actor.role === 'ADMIN') allowed = true;

  if (!allowed) {
    // Hiring-team access: a membership in the organization of a job this
    // resume was attached to.
    const rows = await db
      .select({ id: organizationMemberships.id })
      .from(organizationMemberships)
      .innerJoin(jobs, eq(jobs.organizationId, organizationMemberships.organizationId))
      .innerJoin(applications, eq(applications.jobId, jobs.id))
      .where(
        and(
          eq(applications.resumeId, resume.id),
          eq(organizationMemberships.userId, actor.id),
        ),
      )
      .limit(1);
    allowed = rows.length > 0;
  }

  if (!allowed) return new Response('Forbidden', { status: 403 });

  const stream = await getStorage().getStream(resume.storageKey);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': resume.mimeType,
      'Content-Disposition': `attachment; filename="${resume.filename.replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
